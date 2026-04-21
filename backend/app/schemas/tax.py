from __future__ import annotations

from pydantic import BaseModel


class TaxEstimate(BaseModel):
    tax_year: int
    total_revenue: float
    total_expenses: float
    taxable_income: float
    estimated_tax: float
    tax_bracket: str
    note: str
