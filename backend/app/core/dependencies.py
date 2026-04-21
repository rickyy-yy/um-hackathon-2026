"""FastAPI dependencies — auth guard, current user, rate limit helpers."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

AUTH_COOKIE_NAME = "kira2je_session"


async def get_current_user(
    session: Optional[str] = Cookie(default=None, alias=AUTH_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_token(session)
        user_id = UUID(payload["sub"])
    except Exception:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session"
        ) from None

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_current_user_optional(
    session: Optional[str] = Cookie(default=None, alias=AUTH_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not session:
        return None
    try:
        return await get_current_user(session=session, db=db)
    except HTTPException:
        return None
