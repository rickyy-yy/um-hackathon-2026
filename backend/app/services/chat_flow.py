"""Structured chat flow for Tab 3 on the Upload page.

The PRD defines a mandatory question flow. We implement it as a GLM-driven
conversation that follows a system prompt describing the required sequence,
but still uses the GLM for natural Bahasa Malaysia phrasing and clarifying
follow-ups.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from app.services import ai_service

logger = logging.getLogger(__name__)


SYSTEM = """You are Kira, the AI business advisor for Kira2Lah. You are
helping a Malaysian F&B micro-business owner (hawker/gerai/warung) collect
the data needed for a profitability report. Match the user's language —
English, Bahasa Malaysia, or 中文 — and stay warm and casual. Short
sentences, no jargon.

Collect data in this order, asking ONE question at a time. Remember earlier
answers and don't re-ask.

1. Reporting period (tempoh laporan — bulan atau tarikh dari-hingga).
2. Menu items — for each item collect: nama, harga jual (RM), anggaran kos
   setiap unit (RM), jumlah dijual dalam tempoh tersebut.
3. Cara pembayaran pelanggan (cash / Touch n Go / DuitNow / kad / lain-lain)
   and rough % for each.
4. Any other expenses (sewa, api, gaji, dll).
5. Ingredient cost changes recently — mana satu, berapa naik/turun.

For every response you MUST return a single JSON object with this shape:

{
  "reply": "Your next Bahasa Malaysia message to the user.",
  "quick_replies": ["Chip 1", "Chip 2", "Tak pasti"],
  "collected": {
    "reporting_period": {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"} | null,
    "menu_items": [
      {"item_name": "Nasi Lemak Ayam", "selling_price": 7.50, "cost_per_unit": 3.20, "quantity_sold": 120, "category": "Rice"}
    ],
    "payment_methods": {"cash": 40, "touch_n_go": 30, "duitnow": 20, "card": 10},
    "other_expenses": [{"label": "Sewa", "amount_rm": 500}],
    "cost_changes": [{"ingredient": "Ayam", "change_rm": 0.30, "direction": "up"}]
  },
  "done": false
}

Set "done" to true only when all 5 sections have at least some data.
Quick replies should be short (≤ 20 chars) and contextually useful —
e.g., ["Dalam RM3.20", "RM2.50", "Tak pasti"].
"""


def next_turn(history: list[dict[str, str]]) -> dict[str, Any]:
    """Take the conversation so far (role/content tuples) and produce the
    next assistant response with parsed structured data.
    """
    messages = [{"role": "system", "content": SYSTEM}]
    messages.extend(history)

    # Nudge the model to emit JSON
    messages.append(
        {
            "role": "system",
            "content": "Respond now with a single JSON object matching the schema.",
        }
    )

    raw = ai_service.complete_chat(messages, temperature=0.4)
    try:
        return ai_service._safe_json_loads(raw)  # noqa: SLF001
    except Exception:  # noqa: BLE001
        logger.warning("Chat turn returned invalid JSON, wrapping as plain reply: %r", raw[:200])
        return {
            "reply": raw or "Maaf, cuba ulang sekali lagi?",
            "quick_replies": [],
            "collected": {},
            "done": False,
        }


def opening_message() -> dict[str, Any]:
    """First message when the user opens the chat tab — skip asking the GLM
    to save a round-trip. Later turns go through next_turn().
    """
    return {
        "reply": (
            "Hai! Saya Kira 👋 Jom kita kumpul data jualan anda supaya boleh "
            "buat laporan untung.\n\nMulakan dengan: **Tempoh laporan ini untuk "
            "tarikh mana?** Contoh: 1 Mac — 31 Mac 2026."
        ),
        "quick_replies": ["Bulan lepas", "Minggu lepas", "Custom"],
        "collected": {},
        "done": False,
    }
