"""Dashboard helpers — currently just a short-lived Streamlit token."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import create_streamlit_token, decode_token
from app.models import Report, User

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.post("/token")
async def get_streamlit_token(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.user_id == user.id)
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    token = create_streamlit_token(user.id, report.id)
    return {"token": token, "report_id": str(report.id)}


@router.get("/verify-token")
async def verify_streamlit_token(token: str) -> dict:
    """Used by the Streamlit service to validate an inbound iframe token."""
    try:
        payload = decode_token(token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc
    if payload.get("scope") != "streamlit":
        raise HTTPException(status_code=401, detail="Wrong token scope")
    return {"user_id": payload["sub"], "report_id": payload.get("report_id")}
