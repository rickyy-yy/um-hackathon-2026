"""Chat endpoints.

Structured data-collection flow (Tab 3 of the Upload page) and the
"Kalau saya...?" what-if strategy chat on the Report page. Works for both
authenticated (shop-scoped) and guest callers.
"""
from __future__ import annotations

import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.scope import Scope, get_scope
from app.models import ChatMessage, Report
from app.schemas.chat import ChatMessageRequest, ChatMessageResponse, ChatReply
from app.services import ai_service, chat_flow

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _scope_filter(scope: Scope):
    if scope.shop_id is not None:
        return ChatMessage.shop_id == scope.shop_id
    return ChatMessage.guest_session_id == scope.guest_session_id


def _report_scope_filter(scope: Scope):
    if scope.shop_id is not None:
        return Report.shop_id == scope.shop_id
    return Report.guest_session_id == scope.guest_session_id


@router.post("/message", response_model=ChatReply)
async def send_message(
    payload: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
) -> ChatReply:
    user_msg = ChatMessage(
        shop_id=scope.shop_id,
        guest_session_id=scope.guest_session_id,
        upload_id=payload.upload_id,
        role="user",
        content=payload.content,
    )
    db.add(user_msg)
    await db.flush()

    history = await _load_history(db, scope, payload.upload_id)

    try:
        result = chat_flow.next_turn(
            [{"role": m.role, "content": m.content} for m in history]
        )
    except ai_service.AIUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    reply_text = result.get("reply") or "..."
    assistant_msg = ChatMessage(
        shop_id=scope.shop_id,
        guest_session_id=scope.guest_session_id,
        upload_id=payload.upload_id,
        role="assistant",
        content=reply_text,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)

    return ChatReply(
        user_message=ChatMessageResponse.model_validate(user_msg),
        assistant_message=ChatMessageResponse.model_validate(assistant_msg),
        quick_replies=result.get("quick_replies", []) or [],
        collected_data=result.get("collected") or {},
        done=bool(result.get("done")),
    )


@router.get("/history", response_model=list[ChatMessageResponse])
async def history(
    upload_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
) -> list[ChatMessage]:
    return await _load_history(db, scope, upload_id)


@router.post("/opening", response_model=ChatReply)
async def opening(
    upload_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
) -> ChatReply:
    first = chat_flow.opening_message()
    msg = ChatMessage(
        shop_id=scope.shop_id,
        guest_session_id=scope.guest_session_id,
        upload_id=upload_id,
        role="assistant",
        content=first["reply"],
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return ChatReply(
        user_message=ChatMessageResponse(id=msg.id, role="assistant", content="", created_at=msg.created_at),
        assistant_message=ChatMessageResponse.model_validate(msg),
        quick_replies=first["quick_replies"],
        collected_data={},
        done=False,
    )


# --------------------------------------------------------------------------- #
# Strategy ("Kalau saya...?") chat — report-level what-if reasoning.
# --------------------------------------------------------------------------- #


STRATEGY_SYSTEM = """You are Kira, an AI business advisor for Malaysian F&B
micro-businesses. The user has a generated profitability report and wants to
explore what-if scenarios ("Kalau saya naikkan harga RM0.50?", "Kalau saya
buang salted egg?"). Ground every answer in the report numbers below.

Rules:
- Reply in the user's preferred language (English, Bahasa Malaysia, or 中文) —
  match the language of their question.
- Short, conversational, no jargon.
- Express money in RM, not percentages alone.
- Always end with ONE yellow pill on its own line in this exact format:
  "Estimated profit +RM<value>" or "Estimated profit -RM<value>" (or the
  equivalent in the user's language).
- Be specific: reference item names, the actual numbers in the report.
"""


@router.post("/strategy/{report_id}", response_model=ChatReply)
async def strategy_chat(
    report_id: UUID,
    payload: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
) -> ChatReply:
    result = await db.execute(
        select(Report).where(and_(Report.id == report_id, _report_scope_filter(scope)))
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="ERR_REPORT_NOT_FOUND")

    user_msg = ChatMessage(
        shop_id=scope.shop_id,
        guest_session_id=scope.guest_session_id,
        role="user",
        content=payload.content,
    )
    db.add(user_msg)
    await db.flush()

    try:
        reply = ai_service.complete_chat(
            [
                {"role": "system", "content": STRATEGY_SYSTEM},
                {
                    "role": "system",
                    "content": f"Report JSON:\n{json.dumps(report.summary_json, default=str)}",
                },
                {"role": "user", "content": payload.content},
            ],
            temperature=0.4,
        )
    except ai_service.AIUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    assistant_msg = ChatMessage(
        shop_id=scope.shop_id,
        guest_session_id=scope.guest_session_id,
        role="assistant",
        content=reply,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)

    quick_replies = [
        "What if I raise prices by 50 sen?",
        "Which item is most profitable?",
        "What should I drop?",
    ]
    return ChatReply(
        user_message=ChatMessageResponse.model_validate(user_msg),
        assistant_message=ChatMessageResponse.model_validate(assistant_msg),
        quick_replies=quick_replies,
        collected_data=None,
        done=False,
    )


async def _load_history(
    db: AsyncSession, scope: Scope, upload_id: UUID | None
) -> list[ChatMessage]:
    query = select(ChatMessage).where(_scope_filter(scope))
    if upload_id is not None:
        query = query.where(ChatMessage.upload_id == upload_id)
    query = query.order_by(ChatMessage.created_at)
    result = await db.execute(query)
    return list(result.scalars().all())
