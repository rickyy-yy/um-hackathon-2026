from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ChatMessageRequest(BaseModel):
    content: str
    upload_id: UUID | None = None


class ChatMessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatReply(BaseModel):
    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse
    quick_replies: list[str] = []
    collected_data: dict | None = None
    done: bool = False
