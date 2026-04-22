"""Report endpoints — generate, list, fetch, export, deliver.

Works for both authenticated (shop-scoped) and guest callers. Guests can
generate and view reports but cannot export or deliver them — the frontend
turns those controls into a sign-up prompt.
"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db
from app.core.scope import Scope, get_scope, require_authenticated_scope
from app.models import Report
from app.schemas.report import (
    GenerateReportRequest,
    ReportResponse,
    ReportSummary,
    SendReportRequest,
)
from app.services import (
    ai_service,
    email_service,
    export_service,
    report_generator,
    whatsapp_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _scope_filter(scope: Scope):
    if scope.shop_id is not None:
        return Report.shop_id == scope.shop_id
    return Report.guest_session_id == scope.guest_session_id


@router.post("/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def generate(
    payload: GenerateReportRequest,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
) -> Report:
    if scope.shop_id is None and scope.guest_session_id is None:
        raise HTTPException(status_code=401, detail="ERR_NOT_AUTHENTICATED")
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="ERR_DATE_RANGE_INVALID")
    try:
        report = await report_generator.generate_report(
            db, scope, payload.start_date, payload.end_date, payload.label
        )
    except ai_service.AIUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return report


@router.get("", response_model=list[ReportSummary])
async def list_reports(
    db: AsyncSession = Depends(get_db), scope: Scope = Depends(get_scope)
) -> list[ReportSummary]:
    result = await db.execute(
        select(Report)
        .where(_scope_filter(scope))
        .order_by(Report.report_month.desc(), Report.generated_at.desc())
    )
    items: list[ReportSummary] = []
    for r in result.scalars().all():
        agg = r.summary_json.get("aggregate_metrics", {}) if r.summary_json else {}
        items.append(
            ReportSummary(
                id=r.id,
                report_month=r.report_month,
                title=r.title,
                status=r.status,
                generated_at=r.generated_at,
                total_revenue=agg.get("total_revenue"),
                gross_profit=agg.get("gross_profit"),
            )
        )
    return items


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
) -> Report:
    return await _get_scoped(db, scope, report_id)


# ---- Export/deliver are authed-only ----

@router.get("/{report_id}/export/pdf")
async def export_pdf(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(require_authenticated_scope),
) -> Response:
    report = await _get_scoped(db, scope, report_id)
    data = export_service.export_pdf(report)
    filename = _safe_filename(report.title, "pdf")
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{report_id}/export/xlsx")
async def export_xlsx(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(require_authenticated_scope),
) -> Response:
    report = await _get_scoped(db, scope, report_id)
    data = export_service.export_xlsx(report)
    filename = _safe_filename(report.title, "xlsx")
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{report_id}/export/docx")
async def export_docx(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(require_authenticated_scope),
) -> Response:
    report = await _get_scoped(db, scope, report_id)
    data = export_service.export_docx(report)
    filename = _safe_filename(report.title, "docx")
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{report_id}/send/email", status_code=status.HTTP_202_ACCEPTED)
async def send_email(
    report_id: UUID,
    payload: SendReportRequest,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(require_authenticated_scope),
) -> dict[str, str]:
    if not settings.smtp_user or not settings.smtp_password:
        raise HTTPException(status_code=503, detail="ERR_EMAIL_NOT_CONFIGURED")
    report = await _get_scoped(db, scope, report_id)
    pdf = export_service.export_pdf(report)
    try:
        await email_service.send_report_email(
            to=payload.destination,
            subject=f"Kira2Lah — {report.title}",
            body=f"Hi,\n\nAttached is your Kira2Lah report: {report.title}.\n\n— Kira",
            attachment_bytes=pdf,
            attachment_name=_safe_filename(report.title, "pdf"),
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"ERR_EMAIL_DELIVERY_FAILED: {exc}") from exc
    return {"status": "sent"}


@router.post("/{report_id}/send/whatsapp", status_code=status.HTTP_202_ACCEPTED)
async def send_whatsapp(
    report_id: UUID,
    payload: SendReportRequest,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(require_authenticated_scope),
) -> dict[str, str]:
    if not settings.whatsapp_api_key or not settings.whatsapp_api_url:
        raise HTTPException(status_code=503, detail="ERR_WHATSAPP_NOT_CONFIGURED")
    report = await _get_scoped(db, scope, report_id)
    pdf = export_service.export_pdf(report)
    try:
        await whatsapp_service.send_report_whatsapp(
            phone_number=payload.destination,
            caption=f"Kira2Lah — {report.title}",
            attachment_bytes=pdf,
            attachment_name=_safe_filename(report.title, "pdf"),
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"ERR_WHATSAPP_DELIVERY_FAILED: {exc}") from exc
    return {"status": "sent"}


async def _get_scoped(db: AsyncSession, scope: Scope, report_id: UUID) -> Report:
    result = await db.execute(
        select(Report).where(and_(Report.id == report_id, _scope_filter(scope)))
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="ERR_REPORT_NOT_FOUND")
    return report


def _safe_filename(title: str, ext: str) -> str:
    safe = "".join(c if c.isalnum() or c in (" ", "-", "_") else "_" for c in title).strip()
    return f"{safe or 'report'}.{ext}"
