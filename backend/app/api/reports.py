"""Report endpoints — generate, list, fetch, export, deliver."""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import Report, User
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


@router.post("/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def generate(
    payload: GenerateReportRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Report:
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="end_date must be on or after start_date")
    try:
        report = await report_generator.generate_report(
            db, user, payload.start_date, payload.end_date, payload.label
        )
    except ai_service.AIUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return report


@router.get("", response_model=list[ReportSummary])
async def list_reports(
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> list[ReportSummary]:
    result = await db.execute(
        select(Report)
        .where(Report.user_id == user.id)
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
    user: User = Depends(get_current_user),
) -> Report:
    return await _get_owned(db, user, report_id)


@router.get("/{report_id}/export/pdf")
async def export_pdf(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    report = await _get_owned(db, user, report_id)
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
    user: User = Depends(get_current_user),
) -> Response:
    report = await _get_owned(db, user, report_id)
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
    user: User = Depends(get_current_user),
) -> Response:
    report = await _get_owned(db, user, report_id)
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
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    report = await _get_owned(db, user, report_id)
    pdf = export_service.export_pdf(report)
    try:
        await email_service.send_report_email(
            to=payload.destination,
            subject=f"Kira2 Je — {report.title}",
            body=(
                f"Hi,\n\nAttached is your Kira2 Je report: {report.title}.\n\n"
                f"— Kira"
            ),
            attachment_bytes=pdf,
            attachment_name=_safe_filename(report.title, "pdf"),
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Email delivery failed: {exc}") from exc
    return {"status": "sent"}


@router.post("/{report_id}/send/whatsapp", status_code=status.HTTP_202_ACCEPTED)
async def send_whatsapp(
    report_id: UUID,
    payload: SendReportRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    report = await _get_owned(db, user, report_id)
    pdf = export_service.export_pdf(report)
    try:
        await whatsapp_service.send_report_whatsapp(
            phone_number=payload.destination,
            caption=f"Kira2 Je — {report.title}",
            attachment_bytes=pdf,
            attachment_name=_safe_filename(report.title, "pdf"),
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"WhatsApp delivery failed: {exc}") from exc
    return {"status": "sent"}


async def _get_owned(db: AsyncSession, user: User, report_id: UUID) -> Report:
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.user_id == user.id)
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


def _safe_filename(title: str, ext: str) -> str:
    safe = "".join(c if c.isalnum() or c in (" ", "-", "_") else "_" for c in title).strip()
    return f"{safe or 'report'}.{ext}"
