from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class GenerateReportRequest(BaseModel):
    start_date: date
    end_date: date
    label: str | None = None


class ReportSummary(BaseModel):
    id: UUID
    report_month: date
    title: str
    status: str
    generated_at: datetime
    total_revenue: float | None = None
    gross_profit: float | None = None

    model_config = {"from_attributes": True}


class ReportResponse(BaseModel):
    id: UUID
    report_month: date
    title: str
    summary_json: dict[str, Any]
    ai_recommendations: str
    status: str
    generated_at: datetime

    model_config = {"from_attributes": True}


class SendReportRequest(BaseModel):
    destination: str  # email or phone number
