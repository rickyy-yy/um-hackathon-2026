"""Malaysian LHDN individual / sole-proprietor progressive tax calculator.

These are YA 2024 reference rates as documented in the PRD. They are NOT a
substitute for professional tax advice.
"""
from __future__ import annotations

from dataclasses import dataclass

# (upper_bound, rate) — progressive brackets. The final bracket has no cap (None).
BRACKETS: list[tuple[float | None, float]] = [
    (5_000, 0.00),
    (20_000, 0.01),
    (35_000, 0.03),
    (50_000, 0.06),
    (70_000, 0.11),
    (100_000, 0.19),
    (400_000, 0.25),
    (600_000, 0.26),
    (2_000_000, 0.28),
    (None, 0.30),
]


@dataclass
class TaxResult:
    tax: float
    bracket_label: str


def calculate_tax(taxable_income: float) -> TaxResult:
    if taxable_income <= 0:
        return TaxResult(tax=0.0, bracket_label="RM0 - RM5,000 (0%)")

    remaining = taxable_income
    prev_cap = 0.0
    tax = 0.0
    applicable_bracket = "RM0 - RM5,000 (0%)"

    for cap, rate in BRACKETS:
        if cap is None:
            # Final bracket
            applicable_bracket = f"Above RM{int(prev_cap):,} ({int(rate * 100)}%)"
            tax += remaining * rate
            break

        bracket_width = cap - prev_cap
        if remaining <= bracket_width:
            applicable_bracket = (
                f"RM{int(prev_cap) + 1:,} - RM{int(cap):,} ({int(rate * 100)}%)"
            )
            tax += remaining * rate
            break

        tax += bracket_width * rate
        remaining -= bracket_width
        prev_cap = cap

    return TaxResult(tax=round(tax, 2), bracket_label=applicable_bracket)
