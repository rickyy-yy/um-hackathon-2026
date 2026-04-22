"""Dashboard helpers — short-lived Streamlit token (shop-scoped)."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.scope import Scope, require_authenticated_scope
from app.core.security import create_streamlit_token, decode_token
from app.models import Report

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.post("/token")
async def get_streamlit_token(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(require_authenticated_scope),
) -> dict:
    result = await db.execute(
        select(Report).where(and_(Report.id == report_id, Report.shop_id == scope.shop_id))
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="ERR_REPORT_NOT_FOUND")
    token = create_streamlit_token(scope.user.id, report.id)
    return {"token": token, "report_id": str(report.id)}


@router.get("/verify-token")
async def verify_streamlit_token(token: str) -> dict:
    """Used by the Streamlit service to validate an inbound iframe token."""
    try:
        payload = decode_token(token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail=f"ERR_TOKEN_INVALID: {exc}") from exc
    if payload.get("scope") != "streamlit":
        raise HTTPException(status_code=401, detail="ERR_TOKEN_SCOPE_WRONG")
    return {"user_id": payload["sub"], "report_id": payload.get("report_id")}
