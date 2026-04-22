"""Transfer ownership of a browser's guest-session data to a freshly signed-up
user.

When an anonymous user clicks "Try Now", we stamp their browser with a
signed guest-session cookie. Any data they upload or reports they generate
are keyed against that guest session. When they later sign up, this helper
migrates the rows over so the user does not lose their work.
"""
from __future__ import annotations

import logging
from typing import Optional
from uuid import UUID

from fastapi import Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import GUEST_COOKIE_NAME
from app.core.security import decode_token
from app.models.chat_message import ChatMessage
from app.models.data_upload import DataUpload
from app.models.guest_session import GuestSession
from app.models.menu_item import MenuItem
from app.models.report import Report
from app.models.sales_record import SalesRecord
from app.models.shop import Shop
from app.models.user import User

logger = logging.getLogger("kira2lah.guest")


def _read_guest_cookie(request: Request) -> Optional[UUID]:
    token = request.cookies.get(GUEST_COOKIE_NAME)
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload.get("scope") != "guest":
            return None
        return UUID(payload["sub"])
    except Exception:  # noqa: BLE001
        return None


async def adopt_guest_if_any(db: AsyncSession, request: Request, user: User) -> Optional[Shop]:
    """If the browser carries a valid guest session cookie, attach its data
    to ``user`` inside a dedicated new shop. Returns the created shop or None.
    """
    guest_id = _read_guest_cookie(request)
    if guest_id is None:
        return None

    result = await db.execute(select(GuestSession).where(GuestSession.id == guest_id))
    guest = result.scalar_one_or_none()
    if guest is None:
        return None

    # If the guest didn't actually upload anything, nothing to migrate.
    reports = (
        await db.execute(select(Report).where(Report.guest_session_id == guest_id))
    ).scalars().all()
    uploads = (
        await db.execute(select(DataUpload).where(DataUpload.guest_session_id == guest_id))
    ).scalars().all()
    if not reports and not uploads:
        return None

    shop = Shop(
        owner_user_id=user.id,
        shop_name=(user.full_name or "My shop") + " — first upload",
        shop_type="hawker_stall",
    )
    db.add(shop)
    await db.flush()

    # Point guest-owned rows at the new shop and clear the guest FK.
    for stmt in (
        update(MenuItem).where(MenuItem.guest_session_id == guest_id).values(
            shop_id=shop.id, guest_session_id=None
        ),
        update(SalesRecord).where(SalesRecord.guest_session_id == guest_id).values(
            shop_id=shop.id, guest_session_id=None
        ),
        update(DataUpload).where(DataUpload.guest_session_id == guest_id).values(
            shop_id=shop.id, guest_session_id=None
        ),
        update(Report).where(Report.guest_session_id == guest_id).values(
            shop_id=shop.id, guest_session_id=None
        ),
        update(ChatMessage).where(ChatMessage.guest_session_id == guest_id).values(
            shop_id=shop.id, guest_session_id=None
        ),
    ):
        await db.execute(stmt)

    user.last_shop_id = shop.id
    # Delete the guest session row; all data is now under the real shop.
    await db.delete(guest)
    await db.commit()
    logger.info("Adopted guest session %s into user %s, shop %s", guest_id, user.id, shop.id)
    return shop
