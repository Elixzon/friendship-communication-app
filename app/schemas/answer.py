from pydantic import BaseModel, Field


class SubmitAnswerRequest(BaseModel):
    participant_id: str
    question_index: int = Field(..., ge=0)
    answer: str = Field(
        ...,
        min_length=1,
        max_length=5000,
    )