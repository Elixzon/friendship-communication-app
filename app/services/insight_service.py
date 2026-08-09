import json
import logging
from typing import Dict, List

from google import genai
from google.genai import types

from ..config import settings


logger = logging.getLogger("backend.insight_service")


class InsightService:
    """
    Generates private relationship insights from friendship answers.

    Privacy rules:
    - Never expose raw answers to the frontend.
    - Never identify which participant gave which answer.
    - Insights describe the relationship as a whole.
    """

    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not configured"
            )

        self.client = genai.Client(
            api_key=settings.GEMINI_API_KEY
        )

    def build_prompt(
        self,
        questions: List[Dict],
        answers: List[Dict],
    ) -> str:
        prompt = """
You are an expert relationship communication coach.

Analyze the answers from two friends and identify
patterns in their friendship.

Your task is NOT to summarize individual answers.

Identify:

1. Hidden appreciation
2. Communication gaps
3. Emotional mismatches
4. Shared values
5. Assumptions
6. Opportunities for deeper conversations

CRITICAL PRIVACY RULES:

- Never reveal who wrote an answer.
- Never quote an answer.
- Never expose private information.
- Never mention participant IDs.
- Speak only about the relationship as a whole.
- Do not blame either participant.
- Be constructive and supportive.
- Do not make psychological or medical diagnoses.

Return valid JSON only.

Use exactly this structure:

{
    "shared_strengths": [],
    "hidden_appreciation": [],
    "communication_gaps": [],
    "emotional_patterns": [],
    "conversation_prompts": [],
    "growth_suggestions": []
}

Questions and anonymous answers:
"""

        for question in questions:
            prompt += (
                f"\nQuestion: {question['text']}\n"
            )

            related_answers = [
                answer
                for answer in answers
                if (
                    answer.get("questionIndex")
                    == question["id"]
                    or answer.get("question_id")
                    == question["id"]
                )
            ]

            for answer in related_answers:
                prompt += (
                    "Anonymous answer: "
                    f"{answer.get('answer', '')}\n"
                )

        return prompt

    async def generate_insights(
        self,
        questions: List[Dict],
        answers: List[Dict],
    ) -> Dict:
        """
        Send anonymous friendship answers to Gemini
        and return structured insights.
        """

        if not settings.GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not configured"
            )

        prompt = self.build_prompt(
            questions,
            answers,
        )

        logger.info(
            "Generating AI relationship insights "
            "for %d questions",
            len(questions),
        )

        response = await self.client.aio.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "You are a careful relationship "
                    "communication coach. "
                    "Return only valid JSON."
                ),
                response_mime_type="application/json",
            ),
        )

        content = response.text

        if not content:
            raise RuntimeError(
                "Gemini returned an empty response"
            )

        try:
            insights = json.loads(content)

        except json.JSONDecodeError as error:
            logger.exception(
                "Gemini returned invalid JSON"
            )

            raise RuntimeError(
                "Gemini returned invalid JSON"
            ) from error

        required_fields = [
            "shared_strengths",
            "hidden_appreciation",
            "communication_gaps",
            "emotional_patterns",
            "conversation_prompts",
            "growth_suggestions",
        ]

        for field in required_fields:
            if field not in insights:
                insights[field] = []

            if not isinstance(
                insights[field],
                list,
            ):
                insights[field] = [
                    str(insights[field])
                ]

        return insights


insight_service = InsightService()