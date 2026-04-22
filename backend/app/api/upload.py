"""File upload + extraction endpoints.

Supports both authenticated (shop-scoped) and anonymous guest flows. Guest
uploads are rate-limited by IP and auto-expire with the guest session.
"""
from __future__ import annotations

import logging
import secrets
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db
from app.core.scope import Scope, get_scope
from app.models import CostEntry, DataUpload, GuestSession, MenuItem, SalesRecord
from app.schemas.upload import ConfirmUploadRequest, UploadResponse
from app.services import ai_service, file_processor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/upload", tags=["upload"])

ALLOWED_EXTS = {".csv", ".tsv", ".xlsx", ".xls", ".pdf", ".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_PREFIXES = (
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument",
    "application/pdf",
    "image/",
)


def _safe_filename(original: str) -> tuple[str, str]:
    raw = Path(original).name
    ext = Path(raw).suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail="ERR_FILE_TYPE_UNSUPPORTED")
    if ".." in raw or "/" in raw or "\\" in raw:
        raise HTTPException(status_code=400, detail="ERR_FILENAME_INVALID")
    storage_name = f"{secrets.token_hex(16)}{ext}"
    return storage_name, ext


async def _enforce_guest_rate_limit(db: AsyncSession, scope: Scope) -> None:
    """Cap guest uploads to N reports per IP per 24 h (see GUEST_REPORTS_PER_IP_PER_DAY)."""
    if not scope.is_guest or scope.guest_session is None:
        return
    ip = scope.guest_session.ip_address
    if not ip:
        return
    window_start = datetime.now(timezone.utc) - timedelta(hours=24)
    result = await db.execute(
        select(func.count(DataUpload.id))
        .join(GuestSession, DataUpload.guest_session_id == GuestSession.id)
        .where(
            and_(
                GuestSession.ip_address == ip,
                DataUpload.created_at >= window_start,
            )
        )
    )
    count = result.scalar_one() or 0
    if count >= settings.guest_reports_per_ip_per_day:
        raise HTTPException(status_code=429, detail="ERR_GUEST_RATE_LIMITED")


@router.post("/file", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
) -> DataUpload:
    # Guest upload rate limit.
    await _enforce_guest_rate_limit(db, scope)

    # Authed users must have an active shop; guests always have a session.
    if not scope.is_guest and scope.shop is None:
        raise HTTPException(status_code=428, detail="ERR_NO_SHOP")

    content_type = (file.content_type or "").lower()
    if not any(content_type.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES):
        logger.info("Rejected upload with content-type: %s", content_type)

    body = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(body) > max_bytes:
        raise HTTPException(status_code=413, detail="ERR_FILE_TOO_LARGE")

    storage_name, ext = _safe_filename(file.filename or "upload.bin")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / storage_name
    dest.write_bytes(body)

    upload = DataUpload(
        shop_id=scope.shop_id,
        guest_session_id=scope.guest_session_id,
        file_name=file.filename or storage_name,
        file_type=ext.lstrip("."),
        file_path=str(dest),
        processing_status="processing",
    )
    db.add(upload)
    await db.commit()
    await db.refresh(upload)

    try:
        extracted = file_processor.extract_from_file(dest)
        upload.extracted_data_json = extracted
        if extracted.get("missing_fields") or extracted.get("uncertainties"):
            upload.processing_status = "needs_clarification"
        else:
            upload.processing_status = "completed"
    except ai_service.AIUnavailableError as exc:
        upload.processing_status = "failed"
        upload.extracted_data_json = {"error": str(exc)}
    except Exception as exc:  # noqa: BLE001
        logger.exception("Extraction failed")
        upload.processing_status = "failed"
        upload.extracted_data_json = {"error": str(exc)}

    await db.commit()
    await db.refresh(upload)
    return upload


@router.get("/{upload_id}/status", response_model=UploadResponse)
async def get_status(
    upload_id: UUID,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
) -> DataUpload:
    return await _get_scoped_upload(db, scope, upload_id)


@router.get("/{upload_id}/extracted-data", response_model=UploadResponse)
async def extracted_data(
    upload_id: UUID,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
) -> DataUpload:
    return await _get_scoped_upload(db, scope, upload_id)


@router.put("/{upload_id}/confirm", response_model=UploadResponse)
async def confirm_upload(
    upload_id: UUID,
    payload: ConfirmUploadRequest,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
) -> DataUpload:
    upload = await _get_scoped_upload(db, scope, upload_id)
    await _persist_rows(db, scope, [row.model_dump() for row in payload.rows])
    upload.processing_status = "completed"
    upload.extracted_data_json = {"rows": [row.model_dump(mode="json") for row in payload.rows]}
    await db.commit()
    await db.refresh(upload)
    return upload


async def _get_scoped_upload(db: AsyncSession, scope: Scope, upload_id: UUID) -> DataUpload:
    conditions = [DataUpload.id == upload_id]
    if scope.shop_id is not None:
        conditions.append(DataUpload.shop_id == scope.shop_id)
    elif scope.guest_session_id is not None:
        conditions.append(DataUpload.guest_session_id == scope.guest_session_id)
    else:
        raise HTTPException(status_code=401, detail="ERR_NOT_AUTHENTICATED")

    result = await db.execute(select(DataUpload).where(and_(*conditions)))
    upload = result.scalar_one_or_none()
    if upload is None:
        raise HTTPException(status_code=404, detail="ERR_UPLOAD_NOT_FOUND")
    return upload


async def _persist_rows(db: AsyncSession, scope: Scope, rows: list[dict[str, Any]]) -> None:
    """Upsert menu items + append cost and sales rows scoped to shop or guest."""
    scope_filter = (
        (MenuItem.shop_id == scope.shop_id)
        if scope.shop_id is not None
        else (MenuItem.guest_session_id == scope.guest_session_id)
    )
    existing_result = await db.execute(select(MenuItem).where(scope_filter))
    existing = {m.name.lower(): m for m in existing_result.scalars().all()}

    for row in rows:
        name = (row.get("item_name") or "").strip()
        if not name:
            continue
        qty = int(row.get("quantity_sold") or 0)
        price = row.get("selling_price")
        cost = row.get("cost_per_unit")
        sale_date = row.get("sale_date") or datetime.utcnow().date()
        if isinstance(sale_date, str):
            try:
                sale_date = datetime.fromisoformat(sale_date).date()
            except ValueError:
                continue

        item = existing.get(name.lower())
        if item is None:
            item = MenuItem(
                shop_id=scope.shop_id,
                guest_session_id=scope.guest_session_id,
                name=name,
                category=row.get("category"),
                selling_price=price or 0,
            )
            db.add(item)
            await db.flush()
            existing[name.lower()] = item

        if cost is not None:
            db.add(
                CostEntry(
                    menu_item_id=item.id,
                    cost_per_unit=cost,
                    recorded_date=sale_date if isinstance(sale_date, date) else date.today(),
                )
            )

        if qty > 0 and price is not None:
            db.add(
                SalesRecord(
                    shop_id=scope.shop_id,
                    guest_session_id=scope.guest_session_id,
                    menu_item_id=item.id,
                    quantity_sold=qty,
                    unit_selling_price=price,
                    sale_date=sale_date if isinstance(sale_date, date) else date.today(),
                    payment_method=row.get("payment_method"),
                )
            )
    await db.flush()
