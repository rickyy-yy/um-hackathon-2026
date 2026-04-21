from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class UploadResponse(BaseModel):
    id: UUID
    file_name: str
    file_type: str
    processing_status: str
    extracted_data_json: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


class ExtractedRow(BaseModel):
    item_name: str | None = None
    quantity_sold: int | None = None
    selling_price: float | None = None
    cost_per_unit: float | None = None
    sale_date: date | None = None
    payment_method: str | None = None


class ConfirmUploadRequest(BaseModel):
    rows: list[ExtractedRow]
