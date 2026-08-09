from datetime import datetime

from ..database import get_db


COL_ANSWERS = "answers"


async def submit_answer(
    session_id: str,
    participant_id: str,
    question_index: int,
    answer: str,
):
    db = get_db()

    # One answer per participant per question.
    existing = await db[COL_ANSWERS].find_one(
        {
            "sessionId": session_id,
            "participantId": participant_id,
            "questionIndex": question_index,
        }
    )

    if existing:
        return {
            "already_answered": True,
            "answer_id": str(existing["_id"]),
        }

    result = await db[COL_ANSWERS].insert_one(
        {
            "sessionId": session_id,
            "participantId": participant_id,
            "questionIndex": question_index,
            "answer": answer,
            "createdAt": datetime.utcnow(),
        }
    )

    return {
        "already_answered": False,
        "answer_id": str(result.inserted_id),
    }


async def get_answers(session_id: str):
    db = get_db()

    answers = []

    async for answer in db[COL_ANSWERS].find(
        {"sessionId": session_id}
    ):
        answer["_id"] = str(answer["_id"])
        answers.append(answer)

    return answers


async def get_question_answers(
    session_id: str,
    question_index: int,
):
    db = get_db()

    answers = []

    async for answer in db[COL_ANSWERS].find(
        {
            "sessionId": session_id,
            "questionIndex": question_index,
        }
    ):
        answer["_id"] = str(answer["_id"])
        answers.append(answer)

    return answers


async def clear_answers(session_id: str):
    db = get_db()

    await db[COL_ANSWERS].delete_many(
        {
            "sessionId": session_id
        }
    )