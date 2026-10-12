from datetime import datetime
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Header, HTTPException

from ..database import get_db
from ..config import settings

router = APIRouter(prefix="/api/admin", tags=["admin"])

ADMIN_TOKEN = settings.ADMIN_ACCESS_TOKEN


def require_admin(authorization: str | None):
    if not ADMIN_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="Admin access is not configured",
        )

    expected = f"Bearer {ADMIN_TOKEN}"

    if authorization != expected:
        raise HTTPException(
            status_code=401,
            detail="Admin authentication required",
        )


def serialize(value: Any):
    if isinstance(value, ObjectId):
        return str(value)

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, dict):
        return {k: serialize(v) for k, v in value.items()}

    if isinstance(value, list):
        return [serialize(v) for v in value]

    return value


@router.get("/sessions")
async def admin_list_sessions(
    authorization: str | None = Header(default=None),
):
    require_admin(authorization)

    db = get_db()

    # Collect every session ID that still has answers or participants.
    session_ids: set[str] = set()

    async for doc in db["answers"].find(
        {},
        {"sessionId": 1},
    ):
        if doc.get("sessionId"):
            session_ids.add(str(doc["sessionId"]))

    async for doc in db["participants"].find(
        {},
        {"sessionId": 1},
    ):
        if doc.get("sessionId"):
            session_ids.add(str(doc["sessionId"]))

    sessions = []

    for session_id in session_ids:
        participants = []

        participant_filter = {"sessionId": session_id}
        try:
            participant_filter = {
                "$or": [
                    {"sessionId": session_id},
                    {"sessionId": ObjectId(session_id)},
                ]
            }
        except Exception:
            pass

        async for participant in db["participants"].find(
            participant_filter
        ):
            participants.append(
                {
                    "id": str(participant["_id"]),
                    "displayName": participant.get(
                        "displayName",
                        "Unknown",
                    ),
                    "status": participant.get("status"),
                    "consent": participant.get("consent"),
                    "joinedAt": serialize(
                        participant.get("joinedAt")
                    ),
                }
            )

        answer_filter = {"sessionId": session_id}
        try:
            answer_filter = {
                "$or": [
                    {"sessionId": session_id},
                    {"sessionId": ObjectId(session_id)},
                ]
            }
        except Exception:
            pass

        answer_count = await db["answers"].count_documents(
            answer_filter
        )

        latest_answer = await db["answers"].find_one(
            answer_filter,
            sort=[("createdAt", -1)],
        )

        # Try to recover active-session metadata when available.
        active_session = None

        try:
            active_session = await db["sessions"].find_one(
                {"_id": ObjectId(session_id)}
            )
        except Exception:
            pass

        sessions.append(
            {
                "sessionId": session_id,
                "sessionCode": (
                    active_session.get("sessionCode")
                    if active_session
                    else None
                ),
                "status": (
                    active_session.get("status")
                    if active_session
                    else "historical"
                ),
                "completed": (
                    bool(active_session.get("completed"))
                    if active_session
                    else True
                ),
                "currentQuestion": (
                    active_session.get("currentQuestion")
                    if active_session
                    else None
                ),
                "totalQuestions": (
                    len(active_session.get("questions", []))
                    if active_session
                    else None
                ),
                "participants": participants,
                "answerCount": answer_count,
                "lastAnswerAt": (
                    serialize(
                        latest_answer.get("createdAt")
                    )
                    if latest_answer
                    else None
                ),
            }
        )

    sessions.sort(
        key=lambda x: x.get("lastAnswerAt") or "",
        reverse=True,
    )

    return {
        "count": len(sessions),
        "sessions": sessions,
    }


@router.get("/sessions/{session_id}")
async def admin_get_session(
    session_id: str,
    authorization: str | None = Header(default=None),
):
    require_admin(authorization)

    db = get_db()

    participants = []

    participant_filter = {"sessionId": session_id}
    try:
        participant_filter = {
            "$or": [
                {"sessionId": session_id},
                {"sessionId": ObjectId(session_id)},
            ]
        }
    except Exception:
        pass

    async for participant in db["participants"].find(
        participant_filter
    ):
        participants.append(
            {
                "id": str(participant["_id"]),
                "displayName": participant.get(
                    "displayName",
                    "Unknown",
                ),
                "status": participant.get("status"),
                "consent": participant.get("consent"),
                "joinedAt": serialize(
                    participant.get("joinedAt")
                ),
            }
        )

    answers = []

    answer_filter = {"sessionId": session_id}
    try:
        answer_filter = {
            "$or": [
                {"sessionId": session_id},
                {"sessionId": ObjectId(session_id)},
            ]
        }
    except Exception:
        pass

    async for answer in db["answers"].find(
        answer_filter
    ).sort("questionIndex", 1):
        answers.append(
            {
                "id": str(answer["_id"]),
                "participantId": str(
                    answer.get("participantId")
                ),
                "questionIndex": answer.get(
                    "questionIndex"
                ),
                "answer": answer.get("answer", ""),
                "createdAt": serialize(
                    answer.get("createdAt")
                ),
            }
        )

    if not participants and not answers:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    active_session = None

    try:
        active_session = await db["sessions"].find_one(
            {"_id": ObjectId(session_id)}
        )
    except Exception:
        pass

    return {
        "sessionId": session_id,
        "sessionCode": (
            active_session.get("sessionCode")
            if active_session
            else None
        ),
        "status": (
            active_session.get("status")
            if active_session
            else "historical"
        ),
        "completed": (
            bool(active_session.get("completed"))
            if active_session
            else True
        ),
        "questions": (
            active_session.get("questions", [])
            if active_session
            else []
        ),
        "participants": participants,
        "answers": answers,
        "insights": (
            active_session.get("insights")
            if active_session
            else None
        ),
    }
