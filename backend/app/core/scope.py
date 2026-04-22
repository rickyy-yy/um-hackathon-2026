"""Resolve the data scope for an incoming request.

Both authenticated users (scoped to a Shop) and anonymous "Try Now" users
(scoped to a GuestSession) can upload data, run reports, and chat. This
module returns a uniform ``Scope`` so downstream endpoints don't need to
branch on which kind of caller they have.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db
from app.core.dependencies import (
    AUTH_COOKIE_NAME,
    GUEST_COOKIE_NAME,
    get_current_user_optional,
)
from app.core.security import create_access_token, decode_token
from app.models.guest_session import GuestSession
from app.models.shop import Shop
from app.models.user import User


@dataclass
class Scope:
    user: Optional[User]
    shop: Optional[Shop]
    guest_session: Optional[GuestSession]

    @property
    def is_guest(self) -> bool:
        return self.guest_session is not None and self.user is None

    @property
    def shop_id(self) -> Optional[UUID]:
        return self.shop.id if self.shop else None

    @property
    def guest_session_id(self) -> Optional[UUID]:
        return self.guest_session.id if self.guest_session else None


def _set_guest_cookie(response: Response, guest_id: UUID) -> None:
    token = create_access_token(
        subject=guest_id,
        expires_minutes=settings.guest_ttl_hours * 60,
        extra={"scope": "guest"},
    )
    response.set_cookie(
        key=GUEST_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.guest_ttl_hours * 3600,
        path="/",
    )


async def _read_or_create_guest(
    request: Request, response: Response, db: AsyncSession
) -> GuestSession:
    """Resolve the caller's guest session, minting a fresh one if missing or expired."""
    cookie = request.cookies.get(GUEST_COOKIE_NAME)
    now = datetime.now(timezone.utc)
    if cookie:
        try:
            payload = decode_token(cookie)
            if payload.get("scope") == "guest":
                gid = UUID(payload["sub"])
                result = await db.execute(select(GuestSession).where(GuestSession.id == gid))
                existing = result.scalar_one_or_none()
                if existing is not None:
                    expires_at = existing.expires_at.replace(tzinfo=timezone.utc)
                    if expires_at > now:
                        return existing
        except Exception:  # noqa: BLE001
            pass

    ip = request.client.host if request.client else None
    preferred_language = request.headers.get("x-preferred-language", "en")
    guest = GuestSession(
        ip_address=ip,
        preferred_language=preferred_language,
        expires_at=now + timedelta(hours=settings.guest_ttl_hours),
    )
    db.add(guest)
    await db.commit()
    await db.refresh(guest)
    _set_guest_cookie(response, guest.id)
    return guest


async def get_scope(
    request: Request,
    response: Response,
    user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
    session_cookie: Optional[str] = Cookie(default=None, alias=AUTH_COOKIE_NAME),
) -> Scope:
    """Return the active scope (shop for authed users, guest session otherwise)."""
    if user is not None:
        # Resolve active shop via header or user.last_shop_id
        shop_id: Optional[UUID] = None
        header_val = request.headers.get("x-shop-id")
        if header_val:
            try:
                shop_id = UUID(header_val)
            except ValueError:
                shop_id = None

        if shop_id is None and user.last_shop_id:
            shop_id = user.last_shop_id

        shop: Optional[Shop] = None
        if shop_id:
            result = await db.execute(
                select(Shop).where(Shop.id == shop_id, Shop.owner_user_id == user.id)
            )
            shop = result.scalar_one_or_none()

        if shop is None:
            # Fall back to the user's oldest shop, if any.
            result = await db.execute(
                select(Shop)
                .where(Shop.owner_user_id == user.id, Shop.is_active == True)  # noqa: E712
                .order_by(Shop.created_at.asc())
                .limit(1)
            )
            shop = result.scalar_one_or_none()

        return Scope(user=user, shop=shop, guest_session=None)

    guest = await _read_or_create_guest(request, response, db)
    return Scope(user=None, shop=None, guest_session=guest)


async def require_authenticated_scope(scope: Scope = Depends(get_scope)) -> Scope:
    if scope.user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ERR_NOT_AUTHENTICATED")
    if scope.shop is None:
        raise HTTPException(status_code=status.HTTP_428_PRECONDITION_REQUIRED, detail="ERR_NO_SHOP")
    return scope
