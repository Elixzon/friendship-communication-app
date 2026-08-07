from typing import Dict, List


class InsightService:
    """
    This service converts private answers into relationship insights.

    IMPORTANT:
    - Never expose raw answers.
    - Never reveal who said what.
    - Speak only about the relationship.
    """

    def build_prompt(
        self,
        questions: List[Dict],
        answers: List[Dict],
    ) -> str:

        prompt = """
You are an expert relationship communication coach.

Your task is NOT to summarize answers.

Your task is to identify:

1. Hidden appreciation
2. Communication gaps
3. Emotional mismatches
4. Shared values
5. Assumptions
6. Opportunities for deeper conversations

CRITICAL RULES

- Never reveal who wrote an answer.
- Never quote an answer.
- Never expose private information.
- Speak only about the relationship.
- Be constructive.
- Avoid blaming either participant.

Return JSON only.

Structure:

{
    "shared_strengths": [],
    "hidden_appreciation": [],
    "communication_gaps": [],
    "emotional_patterns": [],
    "conversation_prompts": [],
    "growth_suggestions": []
}

Questions:
"""

        for q in questions:
            prompt += f"\nQuestion: {q['text']}\n"

            related = [
                a for a in answers
                if a["question_id"] == q["id"]
            ]

            for answer in related:
                prompt += f"Answer: {answer['answer']}\n"

        return prompt


insight_service = InsightService()