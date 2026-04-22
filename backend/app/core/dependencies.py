"""FastAPI dependencies — auth guard, current user, current shop, guest session."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.shop import Shop
from app.models.user import User

AUTH_COOKIE_NAME = "kira2lah_session"
GUEST_COOKIE_NAME = "kira2lah_guest"


async def get_current_user(
    session: Optional[str] = Cookie(default=None, alias=AUTH_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ERR_NOT_AUTHENTICATED")
    try:
        payload = decode_token(session)
        user_id = UUID(payload["sub"])
    except Exception:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="ERR_INVALID_SESSION"
        ) from None

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ERR_USER_NOT_FOUND")
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


async def get_current_shop(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Shop:
    """Resolve the active shop for the current user.

    Precedence:
    1. `X-Shop-Id` header if it belongs to the user
    2. `user.last_shop_id`
    3. The user's oldest shop
    """
    shop_id: Optional[UUID] = None
    header_val = request.headers.get("x-shop-id")
    if header_val:
        try:
            shop_id = UUID(header_val)
        except ValueError:
            shop_id = None

    if shop_id:
        result = await db.execute(
            select(Shop).where(Shop.id == shop_id, Shop.owner_user_id == user.id)
        )
        shop = result.scalar_one_or_none()
        if shop is not None:
            return shop

    if user.last_shop_id:
        result = await db.execute(
            select(Shop).where(
                Shop.id == user.last_shop_id, Shop.owner_user_id == user.id
            )
        )
        shop = result.scalar_one_or_none()
        if shop is not None:
            return shop

    result = await db.execute(
        select(Shop)
        .where(Shop.owner_user_id == user.id, Shop.is_active == True)  # noqa: E712
        .order_by(Shop.created_at.asc())
        .limit(1)
    )
    shop = result.scalar_one_or_none()
    if shop is None:
        raise HTTPException(status_code=status.HTTP_428_PRECONDITION_REQUIRED, detail="ERR_NO_SHOP")
    return shop
