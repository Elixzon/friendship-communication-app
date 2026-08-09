import logging
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, status
from pymongo.errors import DuplicateKeyError, PyMongoError

from ..database import DatabaseUnavailableError
from ..schemas.answer import SubmitAnswerRequest
from ..schemas.session import (
    ConsentReq,
    CreateSessionReq,
    JoinSessionReq,
)
from ..services import answer_service
from ..services import insight_service
from ..services import question_service
from ..services import session_service
from ..websocket.manager import manager as ws_manager


router = APIRouter(prefix="/api/session")

logger = logging.getLogger("backend.session_routes")


def _serialize_session(s: dict) -> dict:
    """
    Convert MongoDB session data into JSON-safe API data.
    """

    out = dict(s)

    out.pop("_id", None)

    if isinstance(out.get("createdAt"), datetime):
        out["createdAt"] = out["createdAt"].isoformat()

    if isinstance(out.get("expiresAt"), datetime):
        out["expiresAt"] = out["expiresAt"].isoformat()

    if "participants" in out:
        participants = []

        for participant in out["participants"]:
            p = dict(participant)

            if isinstance(p.get("joinedAt"), datetime):
                p["joinedAt"] = p["joinedAt"].isoformat()

            participants.append(p)

        out["participants"] = participants

    return out


# ============================================================
# CREATE SESSION
# ============================================================

@router.post(
    "/create",
    status_code=status.HTTP_201_CREATED,
)
async def create_session(req: CreateSessionReq):
    try:
        session = await session_service.create_session(
            req.displayName
        )

    except DatabaseUnavailableError:
        raise

    except PyMongoError:
        raise

    except Exception as error:
        logger.exception("Create session failed")
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    return _serialize_session(session)


# ============================================================
# JOIN SESSION
# ============================================================

@router.post("/join")
async def join(req: JoinSessionReq):
    try:
        participant = await session_service.join_session(
            req.code.upper(),
            req.displayName,
        )

    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="Duplicate name",
        )

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Session not found or expired",
        )

    except Exception:
        logger.exception("Join session failed")
        raise

    participant_public = dict(participant)

    if isinstance(
        participant_public.get("joinedAt"),
        datetime,
    ):
        participant_public["joinedAt"] = (
            participant_public["joinedAt"].isoformat()
        )

    await ws_manager.broadcast(
        req.code.upper(),
        {
            "type": "participant.joined",
            "participant": participant_public,
        },
    )

    return participant


# ============================================================
# GET SESSION
# ============================================================

@router.get("/{code}")
async def get_session(code: str):
    session = await session_service.get_session_by_code(
        code.upper()
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    return _serialize_session(session)


# ============================================================
# CONSENT
# ============================================================

@router.post("/{code}/consent")
async def consent(
    code: str,
    body: ConsentReq,
):
    try:
        await session_service.set_consent(
            code.upper(),
            body.participantId,
            body.consent,
        )

        await ws_manager.broadcast(
            code.upper(),
            {
                "type": "consent.updated",
                "participantId": body.participantId,
                "consent": body.consent,
            },
        )

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    except Exception:
        logger.exception("Set consent failed")
        raise

    return {"status": "ok"}


# ============================================================
# START SESSION
# ============================================================

@router.post("/{code}/start")
async def start(code: str):
    try:
        await session_service.start_session(
            code.upper()
        )

        await ws_manager.broadcast(
            code.upper(),
            {
                "type": "host.started",
            },
        )

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    except Exception:
        logger.exception("Start session failed")
        raise

    return {
        "status": "started",
    }


# ============================================================
# PARTICIPANTS
# ============================================================

@router.get("/{code}/participants")
async def participants(code: str):
    try:
        parts = await session_service.list_participants(
            code.upper()
        )

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    except Exception:
        logger.exception(
            "List participants failed"
        )
        raise

    return parts

# ============================================================
# CURRENT QUESTION
# ============================================================

@router.get("/{code}/question")
async def current_question(code: str):
    code = code.upper()

    session = await session_service.get_session_by_code(
        code
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    if session.get("status") != "started":
        raise HTTPException(
            status_code=409,
            detail="Session has not started",
        )

    question = question_service.question_service.get_question(
        session
    )

    if question is None:
        return {
            "finished": True,
            "question": None,
        }

    return {
        "finished": False,
        "question": question,
    }


# ============================================================
# SUBMIT ANSWER
# ============================================================

@router.post("/{code}/answer")
async def submit_answer(
    code: str,
    body: SubmitAnswerRequest,
):
    """
    Store a participant's private answer.

    The other participant NEVER receives the raw answer.
    """

    code = code.upper()

    session = await session_service.get_session_by_code(
        code
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    if session.get("status") != "started":
        raise HTTPException(
            status_code=409,
            detail="Session has not started",
        )

    # --------------------------------------------------------
    # Validate participant ID
    # --------------------------------------------------------

    try:
        participant_id = ObjectId(
            body.participant_id
        )

    except (InvalidId, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid participant ID",
        )

    # --------------------------------------------------------
    # Make sure participant belongs to this session
    # --------------------------------------------------------

    participant_exists = False

    for participant in session.get(
        "participants",
        [],
    ):
        if participant.get("id") == str(
            participant_id
        ):
            participant_exists = True
            break

    if not participant_exists:
        raise HTTPException(
            status_code=403,
            detail="Participant does not belong to this session",
        )

    current_index = session.get(
        "currentQuestion",
        0,
    )

    # --------------------------------------------------------
    # Prevent answering a different question
    # --------------------------------------------------------

    if body.question_index != current_index:
        raise HTTPException(
            status_code=409,
            detail="This is not the current question",
        )

    answer_text = body.answer.strip()

    if not answer_text:
        raise HTTPException(
            status_code=400,
            detail="Answer cannot be empty",
        )

    # --------------------------------------------------------
    # Store answer privately
    # --------------------------------------------------------

    session_id = str(session["_id"])

    answer_result = await answer_service.submit_answer(
        session_id=session_id,
        participant_id=str(participant_id),
        question_index=current_index,
        answer=answer_text,
    )

    # --------------------------------------------------------
    # Check how many participants answered
    # --------------------------------------------------------

    question_answers = (
        await answer_service.get_question_answers(
            session_id=session_id,
            question_index=current_index,
        )
    )

    participant_ids = {
        answer["participantId"]
        for answer in question_answers
    }

    participant_count = len(
        session.get("participants", [])
    )

    answered_count = len(participant_ids)

    # --------------------------------------------------------
    # BOTH PARTICIPANTS HAVE ANSWERED
    # --------------------------------------------------------

    if (
        participant_count >= 2
        and answered_count >= participant_count
    ):
        next_index = current_index + 1

        db = session_service.get_db()

        # Atomically advance the question.
        #
        # Only the request that still sees the current
        # question index is allowed to advance it.
        result = await db[
            session_service.COL_SESSIONS
        ].update_one(
            {
                "sessionCode": code,
                "currentQuestion": current_index,
            },
            {
                "$set": {
                    "currentQuestion": next_index,
                }
            },
        )

        # Another request may have advanced the question
        # already. In that case, don't advance twice.
        if result.modified_count == 0:
            latest_session = (
                await session_service.get_session_by_code(
                    code
                )
            )

            latest_index = (
                latest_session.get(
                    "currentQuestion",
                    current_index,
                )
                if latest_session
                else current_index
            )

            return {
                "status": "next_question",
                "answered": True,
                "finished": (
                    latest_index
                    >= len(
                        session.get(
                            "questions",
                            [],
                        )
                    )
                ),
                "currentQuestion": latest_index,
                "totalQuestions": len(
                    session.get(
                        "questions",
                        [],
                    )
                ),
            }

        total_questions = len(
            session.get("questions", [])
        )

        finished = (
            next_index >= total_questions
        )

        # ----------------------------------------------------
        # SESSION COMPLETED
        # ----------------------------------------------------

        if finished:
            logger.info(
                "All questions answered for session %s",
                code,
            )

            # Fetch all private answers.
            all_answers = (
                await answer_service.get_answers(
                    session_id=session_id
                )
            )

            insights = None

            try:
                insights = (
                    await insight_service.insight_service
                    .generate_insights(
                        questions=session.get(
                            "questions",
                            [],
                        ),
                        answers=all_answers,
                    )
                )

                logger.info(
                    "AI insights generated for session %s",
                    code,
                )

            except Exception:
                logger.exception(
                    "AI insight generation failed for session %s",
                    code,
                )

            update_fields = {
                "status": "completed",
                "completed": True,
            }

            if insights is not None:
                update_fields["insights"] = insights

            await db[
                session_service.COL_SESSIONS
            ].update_one(
                {
                    "sessionCode": code,
                },
                {
                    "$set": update_fields,
                },
            )

            # Never send raw answers through WebSocket.
            await ws_manager.broadcast(
                code,
                {
                    "type": "session.completed",
                },
            )

            return {
                "status": "completed",
                "answered": True,
                "finished": True,
                "currentQuestion": next_index,
                "totalQuestions": total_questions,
            }

        # ----------------------------------------------------
        # MOVE BOTH CLIENTS TO NEXT QUESTION
        # ----------------------------------------------------

        await ws_manager.broadcast(
            code,
            {
                "type": "question.next",
                "currentQuestion": next_index,
                "totalQuestions": total_questions,
            },
        )

        return {
            "status": "next_question",
            "answered": True,
            "finished": False,
            "currentQuestion": next_index,
            "totalQuestions": total_questions,
        }

    # --------------------------------------------------------
    # WAITING FOR OTHER PARTICIPANT
    # --------------------------------------------------------

    await ws_manager.broadcast(
        code,
        {
            "type": "answer.received",
            "participantId": str(participant_id),
            "questionIndex": current_index,
        },
    )

    return {
        "status": "waiting",
        "answered": True,
        "finished": False,
        "currentQuestion": current_index,
        "answeredCount": answered_count,
        "participantCount": participant_count,
    }


# ============================================================
# QUESTION PROGRESS
# ============================================================

@router.get("/{code}/question/progress")
async def question_progress(code: str):
    """
    Returns question progress without exposing private answers.
    """

    code = code.upper()

    session = await session_service.get_session_by_code(
        code
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    total_questions = len(
        session.get("questions", [])
    )

    current_question = session.get(
        "currentQuestion",
        0,
    )

    return {
        "currentQuestion": current_question,
        "totalQuestions": total_questions,
        "finished": (
            current_question >= total_questions
        ),
    }

# ============================================================
# DELETE SESSION
# ============================================================

@router.delete("/{code}")
async def delete(code: str):
    code = code.upper()

    try:
        # Notify connected clients before deleting the session.
        await ws_manager.broadcast(
            code,
            {
                "type": "session.closed",
            },
        )

        await session_service.delete_session(
            code
        )

    except ValueError:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    except Exception:
        logger.exception(
            "Delete session failed"
        )
        raise

    return {
        "status": "deleted",
    }
