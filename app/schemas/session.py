import re

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime


class ParticipantOut(BaseModel):
    id: str
    displayName: str
    joinedAt: datetime
    consent: bool = False


class SessionOut(BaseModel):
    id: str
    sessionCode: str
    createdAt: datetime
    expiresAt: datetime
    status: str
    ownerId: str
    participants: List[ParticipantOut] = []
    reflectionPrompt: Optional[str] = None


class CreateSessionReq(BaseModel):
    displayName: str = Field(..., min_length=1)

    @field_validator('displayName')
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError('displayName must not be blank')
        return value


class JoinSessionReq(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)
    displayName: str = Field(..., min_length=1)

    @field_validator('code')
    @classmethod
    def normalize_code(cls, value: str) -> str:
        value = value.strip().upper()
        if not re.fullmatch(r'[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}', value):
            raise ValueError('code must be a six-character session code')
        return value

    @field_validator('displayName')
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError('displayName must not be blank')
        return value


class ConsentReq(BaseModel):
    participantId: str
    consent: bool
