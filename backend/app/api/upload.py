"""File upload + extraction endpoints."""
from __future__ import annotations

import logging
import secrets
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import CostEntry, DataUpload, MenuItem, SalesRecord, User
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
    """Return (safe_storage_name, extension). Strip path traversal."""
    raw = Path(original).name  # drops any dir components
    ext = Path(raw).suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
    if ".." in raw or "/" in raw or "\\" in raw:
        raise HTTPException(status_code=400, detail="Invalid filename")
    storage_name = f"{secrets.token_hex(16)}{ext}"
    return storage_name, ext


@router.post("/file", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataUpload:
    # MIME + size check
    content_type = (file.content_type or "").lower()
    if not any(content_type.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES):
        logger.info("Rejected upload with content-type: %s", content_type)

    body = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(body) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File larger than {settings.max_upload_size_mb} MB")

    storage_name, ext = _safe_filename(file.filename or "upload.bin")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / storage_name
    dest.write_bytes(body)

    upload = DataUpload(
        user_id=user.id,
        file_name=file.filename or storage_name,
        file_type=ext.lstrip("."),
        file_path=str(dest),
        processing_status="processing",
    )
    db.add(upload)
    await db.commit()
    await db.refresh(upload)

    # Run GLM extraction synchronously for MVP. A real deployment would push
    # this onto a background worker.
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
    user: User = Depends(get_current_user),
) -> DataUpload:
    upload = await _get_owned_upload(db, user, upload_id)
    return upload


@router.get("/{upload_id}/extracted-data", response_model=UploadResponse)
async def extracted_data(
    upload_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataUpload:
    return await _get_owned_upload(db, user, upload_id)


@router.put("/{upload_id}/confirm", response_model=UploadResponse)
async def confirm_upload(
    upload_id: UUID,
    payload: ConfirmUploadRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DataUpload:
    upload = await _get_owned_upload(db, user, upload_id)
    await _persist_rows(db, user, [row.model_dump() for row in payload.rows])
    upload.processing_status = "completed"
    upload.extracted_data_json = {"rows": [row.model_dump(mode="json") for row in payload.rows]}
    await db.commit()
    await db.refresh(upload)
    return upload


async def _get_owned_upload(db: AsyncSession, user: User, upload_id: UUID) -> DataUpload:
    result = await db.execute(
        select(DataUpload).where(DataUpload.id == upload_id, DataUpload.user_id == user.id)
    )
    upload = result.scalar_one_or_none()
    if upload is None:
        raise HTTPException(status_code=404, detail="Upload not found")
    return upload


async def _persist_rows(db: AsyncSession, user: User, rows: list[dict[str, Any]]) -> None:
    """Upsert menu items + append cost and sales rows."""
    # Cache existing menu items by name
    existing_result = await db.execute(select(MenuItem).where(MenuItem.user_id == user.id))
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
                user_id=user.id,
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
                    recorded_date=sale_date,
                )
            )

        if qty > 0 and price is not None:
            db.add(
                SalesRecord(
                    user_id=user.id,
                    menu_item_id=item.id,
                    quantity_sold=qty,
                    unit_selling_price=price,
                    sale_date=sale_date,
                    payment_method=row.get("payment_method"),
                )
            )
    await db.flush()
