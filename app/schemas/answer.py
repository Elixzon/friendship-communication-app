from datetime import datetime
from pydantic import BaseModel, Field


class SubmitAnswerRequest(BaseModel):
    question_id: int
    answer: str = Field(..., min_length=1, max_length=5000)


class AnswerModel(BaseModel):
    participant_id: str
    question_id: int
    answer: str
    submitted_at: datetime = Field(default_factory=datetime.utcnow)