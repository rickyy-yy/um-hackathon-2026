"""Report generation — computes hard numbers locally, then asks the GLM to
write a narrative. Cannibalization detection and margin-decline flagging are
structured checks; only the prose comes from the AI.

Works for both authenticated (shop-scoped) and guest (guest_session-scoped)
callers via the shared ``Scope`` abstraction.
"""
from __future__ import annotations

import json
import logging
from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.scope import Scope
from app.models import CostEntry, MenuItem, Report, SalesRecord
from app.services import ai_service, tax_calculator

logger = logging.getLogger(__name__)

GREEN_THRESHOLD = 40.0
YELLOW_THRESHOLD = 20.0
MARGIN_DROP_ALERT_PP = 5.0
CANNIBAL_PRICE_WINDOW = 3.00

LANGUAGE_INSTRUCTIONS = {
    "en": "Respond in English. Use casual, plain-spoken tone — no MBA jargon.",
    "ms": "Jawab dalam Bahasa Malaysia casual. Jangan guna istilah MBA — cakap macam biasa.",
    "zh": "用简体中文回答。语气要亲切、口语化，不要使用商业术语。",
}


def score_for_margin(margin_pct: float) -> str:
    if margin_pct >= GREEN_THRESHOLD:
        return "green"
    if margin_pct >= YELLOW_THRESHOLD:
        return "yellow"
    return "red"


def _scope_item_filter(scope: Scope):
    if scope.shop_id is not None:
        return MenuItem.shop_id == scope.shop_id
    return MenuItem.guest_session_id == scope.guest_session_id


def _scope_sales_filter(scope: Scope):
    if scope.shop_id is not None:
        return SalesRecord.shop_id == scope.shop_id
    return SalesRecord.guest_session_id == scope.guest_session_id


def _scope_report_filter(scope: Scope):
    if scope.shop_id is not None:
        return Report.shop_id == scope.shop_id
    return Report.guest_session_id == scope.guest_session_id


async def generate_report(
    db: AsyncSession,
    scope: Scope,
    start: date,
    end: date,
    label: str | None = None,
) -> Report:
    label = label or f"{start.strftime('%B %Y')} Report"
    logger.info(
        "Generating report scope=(shop=%s guest=%s) period=%s..%s",
        scope.shop_id,
        scope.guest_session_id,
        start,
        end,
    )

    items_result = await db.execute(
        select(MenuItem).where(_scope_item_filter(scope), MenuItem.is_active == True)  # noqa: E712
    )
    items = {item.id: item for item in items_result.scalars().all()}

    sales_result = await db.execute(
        select(SalesRecord).where(
            and_(
                _scope_sales_filter(scope),
                SalesRecord.sale_date >= start,
                SalesRecord.sale_date <= end,
            )
        )
    )
    sales = sales_result.scalars().all()

    costs_result = await db.execute(
        select(CostEntry).where(CostEntry.menu_item_id.in_(list(items.keys()) or [UUID(int=0)]))
    )
    cost_entries = costs_result.scalars().all()

    costs_by_item: dict[UUID, list[CostEntry]] = defaultdict(list)
    for c in cost_entries:
        costs_by_item[c.menu_item_id].append(c)
    for bucket in costs_by_item.values():
        bucket.sort(key=lambda c: c.recorded_date)

    def cost_for(item_id: UUID, on: date) -> Decimal:
        bucket = costs_by_item.get(item_id, [])
        applicable = [c for c in bucket if c.recorded_date <= on]
        if applicable:
            return applicable[-1].cost_per_unit
        return bucket[0].cost_per_unit if bucket else Decimal("0")

    per_item: dict[UUID, dict[str, Any]] = {}
    for item_id, item in items.items():
        per_item[item_id] = {
            "item_id": str(item_id),
            "item_name": item.name,
            "category": item.category,
            "units_sold": 0,
            "total_revenue": Decimal("0"),
            "total_cost": Decimal("0"),
            "gross_profit": Decimal("0"),
            "margin_pct": 0.0,
            "profitability_score": "green",
            "selling_price": item.selling_price,
        }

    revenue_by_payment: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    for s in sales:
        if s.menu_item_id not in per_item:
            continue
        row = per_item[s.menu_item_id]
        row["units_sold"] += s.quantity_sold
        revenue = s.unit_selling_price * s.quantity_sold
        cost = cost_for(s.menu_item_id, s.sale_date) * s.quantity_sold
        row["total_revenue"] += revenue
        row["total_cost"] += cost
        row["gross_profit"] += revenue - cost
        revenue_by_payment[s.payment_method or "other"] += revenue

    menu_breakdown: list[dict[str, Any]] = []
    total_revenue = Decimal("0")
    total_cogs = Decimal("0")
    total_units = 0
    for row in per_item.values():
        rev = row["total_revenue"]
        cost = row["total_cost"]
        margin = float(((rev - cost) / rev) * 100) if rev > 0 else 0.0
        row["margin_pct"] = round(margin, 2)
        row["profitability_score"] = score_for_margin(margin)
        row["total_revenue"] = float(rev)
        row["total_cost"] = float(cost)
        row["gross_profit"] = float(rev - cost)
        row["selling_price"] = float(row["selling_price"])
        total_revenue += rev
        total_cogs += cost
        total_units += row["units_sold"]
        menu_breakdown.append(row)

    menu_breakdown.sort(key=lambda r: r["gross_profit"], reverse=True)

    overall_margin = (
        float((total_revenue - total_cogs) / total_revenue * 100)
        if total_revenue > 0
        else 0.0
    )

    prev_report = await _fetch_previous_report(db, scope, start)
    declining_items: list[dict[str, Any]] = []
    cannibalization_flags: list[dict[str, Any]] = []

    if prev_report is not None:
        prev_items = {
            row["item_name"]: row
            for row in prev_report.summary_json.get("menu_item_breakdown", [])
        }
        for row in menu_breakdown:
            prev = prev_items.get(row["item_name"])
            if prev is None:
                continue
            delta = row["margin_pct"] - prev["margin_pct"]
            row["margin_change_vs_prev"] = round(delta, 2)
            row["cost_change_vs_prev"] = round(
                (row["total_cost"] / max(row["units_sold"], 1))
                - (prev["total_cost"] / max(prev["units_sold"], 1)),
                2,
            )
            if delta <= -MARGIN_DROP_ALERT_PP:
                declining_items.append(
                    {
                        "item_name": row["item_name"],
                        "current_margin_pct": row["margin_pct"],
                        "previous_margin_pct": prev["margin_pct"],
                        "margin_drop_pct": round(-delta, 2),
                        "reason_estimate": None,
                    }
                )

        cannibalization_flags = _detect_cannibalization(menu_breakdown)

    aggregate = {
        "total_revenue": float(total_revenue),
        "total_cogs": float(total_cogs),
        "gross_profit": float(total_revenue - total_cogs),
        "overall_margin_pct": round(overall_margin, 2),
        "total_items_sold": total_units,
        "revenue_by_payment_method": {k: float(v) for k, v in revenue_by_payment.items()},
    }

    period_days = max((end - start).days + 1, 1)
    annualisation = 365.0 / period_days
    est_annual_revenue = float(total_revenue) * annualisation
    est_annual_expenses = float(total_cogs) * annualisation
    est_taxable = max(est_annual_revenue - est_annual_expenses, 0.0)
    tax_result = tax_calculator.calculate_tax(est_taxable)

    tax_estimation = {
        "estimated_annual_revenue": round(est_annual_revenue, 2),
        "estimated_annual_expenses": round(est_annual_expenses, 2),
        "estimated_taxable_income": round(est_taxable, 2),
        "estimated_tax": tax_result.tax,
        "tax_bracket": tax_result.bracket_label,
        "note": "Estimate only. Please consult a tax professional.",
    }

    summary_json = {
        "reporting_period": {
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "label": label,
        },
        "aggregate_metrics": aggregate,
        "menu_item_breakdown": menu_breakdown,
        "declining_items": declining_items,
        "cannibalization_flags": cannibalization_flags,
        "tax_estimation": tax_estimation,
    }

    shop_name, shop_type, lang = _scope_narrative_context(scope)
    ai_recs = _ask_glm_for_narrative(summary_json, shop_name, shop_type, lang)

    report = Report(
        shop_id=scope.shop_id,
        guest_session_id=scope.guest_session_id,
        report_month=start.replace(day=1),
        title=label,
        summary_json=summary_json,
        ai_recommendations=ai_recs,
        status="completed",
    )
    db.add(report)
    await db.flush()
    await db.commit()
    await db.refresh(report)
    return report


def _scope_narrative_context(scope: Scope) -> tuple[str, str, str]:
    if scope.shop is not None:
        shop_name = scope.shop.shop_name
        shop_type = scope.shop.shop_type
        lang = scope.user.preferred_language if scope.user else "en"
        return shop_name, shop_type, lang
    lang = scope.guest_session.preferred_language if scope.guest_session else "en"
    return "Guest shop", "hawker_stall", lang


async def _fetch_previous_report(db: AsyncSession, scope: Scope, current_start: date) -> Report | None:
    result = await db.execute(
        select(Report)
        .where(
            and_(
                _scope_report_filter(scope),
                Report.report_month < current_start.replace(day=1),
            )
        )
        .order_by(Report.report_month.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


def _detect_cannibalization(breakdown: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_category: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in breakdown:
        cat = row.get("category")
        if not cat:
            continue
        by_category[cat].append(row)

    flags: list[dict[str, Any]] = []
    for cat, rows in by_category.items():
        for i in range(len(rows)):
            for j in range(len(rows)):
                if i == j:
                    continue
                a, b = rows[i], rows[j]
                if a["units_sold"] == 0 or b["units_sold"] == 0:
                    continue
                if a["margin_pct"] >= b["margin_pct"]:
                    continue
                price_gap = abs(a["selling_price"] - b["selling_price"])
                if price_gap > CANNIBAL_PRICE_WINDOW:
                    continue
                per_unit_cost_b = b["total_cost"] / max(b["units_sold"], 1)
                hypothetical_additional_profit = (
                    a["units_sold"] * (b["selling_price"] - per_unit_cost_b)
                )
                current_combined = a["gross_profit"] + b["gross_profit"]
                post_removal = b["gross_profit"] + hypothetical_additional_profit
                if post_removal > current_combined:
                    flags.append(
                        {
                            "item_a": a["item_name"],
                            "item_b": b["item_name"],
                            "category": cat,
                            "item_a_margin_pct": a["margin_pct"],
                            "item_b_margin_pct": b["margin_pct"],
                            "item_a_volume": a["units_sold"],
                            "item_b_volume": b["units_sold"],
                            "potential_profit_uplift": round(
                                post_removal - current_combined, 2
                            ),
                            "recommendation": None,
                        }
                    )
    return flags


def _ask_glm_for_narrative(summary: dict[str, Any], biz_name: str, biz_type: str, lang: str) -> str:
    language_instruction = LANGUAGE_INSTRUCTIONS.get(lang, LANGUAGE_INSTRUCTIONS["en"])
    system = (
        "You are Kira, the AI business advisor for Kira2Lah — a tool for Malaysian "
        "F&B micro-entrepreneurs (mak cik gerai, pak cik hawker, small warung "
        "owners). " + language_instruction + " Always express money in RM with "
        "plain-language phrasing. Structure your answer with clear short sections: "
        "Summary, Items to watch, Recommended actions. Focus on actionable advice "
        "in RM, not percentages."
    )
    user = (
        f"Business: {biz_name} ({biz_type})\n"
        f"Report data (JSON):\n{json.dumps(summary, indent=2, default=str)}\n\n"
        "Write 3 sections:\n"
        "1. Summary — 2–3 sentence financial summary.\n"
        "2. Items to watch — highlight declining margins and losses, in RM.\n"
        "3. Recommended actions — 3 concrete actions (e.g. 'Raise Teh Tarik by "
        "RM0.50'). Be specific, reference the numbers.\n"
        "If cannibalization flags are present, analyse them and recommend: remove, "
        "reprice, or keep. Output plain text (no markdown headings, but use line "
        "breaks). Start immediately with the first section."
    )
    try:
        return ai_service.complete_text(system, user, temperature=0.4).strip()
    except ai_service.AIUnavailableError as exc:
        logger.error("GLM narrative failed: %s", exc)
        raise
