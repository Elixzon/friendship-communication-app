import random
from typing import List, Dict, Optional

from app.data.questions import QUESTIONS


class QuestionService:
    """
    Handles question selection and session progression.
    """

    def __init__(self):
        self._question_bank = QUESTIONS

    def generate_session_questions(
        self,
        total_questions: int = 10,
    ) -> List[Dict]:
        """
        Randomly select questions for a session.
        """

        if total_questions >= len(self._question_bank):
            selected = self._question_bank.copy()
            random.shuffle(selected)
            return selected

        return random.sample(self._question_bank, total_questions)

    def get_question(
        self,
        session: Dict,
    ) -> Optional[Dict]:
        """
        Returns the current question.
        """

        questions = session.get("questions", [])
        index = session.get("currentQuestion", 0)

        if index >= len(questions):
            return None

        question = questions[index]

        return {
            "id": question["id"],
            "text": question["text"],
            "category": question["category"],
            "index": index,
            "total": len(questions),
        }

    def next_question(
        self,
        session: Dict,
    ) -> Optional[Dict]:
        """
        Move to the next question.
        """

        session["currentQuestion"] += 1
        return self.get_question(session)

    def progress(
        self,
        session: Dict,
    ) -> Dict:
        """
        Returns session progress.
        """

        total = len(session.get("questions", []))
        current = session.get("currentQuestion", 0)

        return {
            "current": current + 1,
            "total": total,
            "finished": current >= total,
        }

    def is_finished(
        self,
        session: Dict,
    ) -> bool:
        """
        Returns True if all questions have been completed.
        """

        return session.get("currentQuestion", 0) >= len(
            session.get("questions", [])
        )


question_service = QuestionService()