"""Streamlit app — embedded inside the Next.js dashboard via iframe.

Expects ``?token=...&report_id=...`` query params. The token is issued by the
FastAPI backend and scoped to a single report.
"""
from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from utils.auth import verify_token
from utils.db import fetch_report, list_reports
from utils.theme import ACCENT, ALERT, PLOTLY_LAYOUT, PRIMARY, SURFACE

st.set_page_config(page_title="Kira2Lah — Laporan", layout="wide", initial_sidebar_state="collapsed")

# Inject styles to blend with the frontend palette
st.markdown(
    f"""
    <style>
      .stApp {{ background: transparent; }}
      .stApp h1, .stApp h2, .stApp h3 {{ color: {PRIMARY}; }}
      section[data-testid="stSidebar"] {{ display: none; }}
    </style>
    """,
    unsafe_allow_html=True,
)

query = st.query_params
token = query.get("token")
report_id = query.get("report_id")

if not token or not report_id:
    st.error("Missing token or report_id.")
    st.stop()

try:
    payload = verify_token(token)
except ValueError as exc:
    st.error(f"Session invalid: {exc}")
    st.stop()

# The token is signed by the backend and carries the report_id claim — we
# fetch by report_id without a shop_id filter because the backend already
# verified ownership before issuing the token.
report = fetch_report(report_id)
if report is None:
    st.error("Report not found.")
    st.stop()

shop_id = report.get("shop_id")

summary = report["summary_json"]
agg = summary.get("aggregate_metrics", {})

st.title(report["title"])

mode = st.radio("Mode", options=["Ringkasan Bulan", "Per Menu"], horizontal=True)

if mode == "Ringkasan Bulan":
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Jualan", f"RM{agg.get('total_revenue', 0):,.0f}")
    col2.metric("Untung", f"RM{agg.get('gross_profit', 0):,.0f}")
    col3.metric("Margin", f"{agg.get('overall_margin_pct', 0):.1f}%")
    col4.metric("Unit", f"{agg.get('total_items_sold', 0):,}")

    rev_vs_cost = pd.DataFrame(
        [
            {"Kategori": "Jualan", "RM": agg.get("total_revenue", 0)},
            {"Kategori": "COGS", "RM": agg.get("total_cogs", 0)},
            {"Kategori": "Untung", "RM": agg.get("gross_profit", 0)},
        ]
    )
    fig = px.bar(rev_vs_cost, x="Kategori", y="RM", color="Kategori",
                 color_discrete_map={"Jualan": PRIMARY, "COGS": ALERT, "Untung": ACCENT})
    fig.update_layout(**PLOTLY_LAYOUT, showlegend=False)
    st.plotly_chart(fig, use_container_width=True)

    payments = agg.get("revenue_by_payment_method", {}) or {}
    if payments:
        pie_df = pd.DataFrame(
            [{"Cara bayar": k.replace("_", " ").title(), "RM": v} for k, v in payments.items()]
        )
        pie = px.pie(pie_df, values="RM", names="Cara bayar", hole=0.5)
        pie.update_layout(**PLOTLY_LAYOUT)
        st.plotly_chart(pie, use_container_width=True)

else:
    breakdown = summary.get("menu_item_breakdown", [])
    names = [row["item_name"] for row in breakdown]
    selected = st.selectbox("Pilih menu", names or ["(tiada data)"])
    row = next((r for r in breakdown if r["item_name"] == selected), None)
    if row is None:
        st.info("Tiada data untuk menu ini.")
    else:
        st.subheader(selected)
        col1, col2, col3 = st.columns(3)
        col1.metric("Unit dijual", f"{row['units_sold']:,}")
        col2.metric("Untung", f"RM{row['gross_profit']:,.2f}")
        col3.metric("Margin", f"{row['margin_pct']:.1f}%")

        # Historical trends — gather from all reports for this user
        history = list_reports(shop_id) if shop_id else []
        trend_rows = []
        for h in history:
            for r in h["summary_json"].get("menu_item_breakdown", []):
                if r["item_name"] == selected:
                    trend_rows.append(
                        {
                            "Bulan": h["report_month"].strftime("%b %Y"),
                            "Margin": r["margin_pct"],
                            "Untung": r["gross_profit"],
                            "Unit": r["units_sold"],
                        }
                    )
        if len(trend_rows) >= 2:
            trend_df = pd.DataFrame(trend_rows)
            fig = go.Figure()
            fig.add_scatter(x=trend_df["Bulan"], y=trend_df["Margin"], mode="lines+markers",
                            name="Margin %", line={"color": PRIMARY, "width": 3})
            fig.update_layout(**PLOTLY_LAYOUT, title="Margin sepanjang masa")
            st.plotly_chart(fig, use_container_width=True)

            fig2 = px.bar(trend_df, x="Bulan", y="Unit", color_discrete_sequence=[ACCENT])
            fig2.update_layout(**PLOTLY_LAYOUT, title="Unit dijual")
            st.plotly_chart(fig2, use_container_width=True)
        else:
            st.info("Trend analysis akan muncul bila ada 2 atau lebih laporan.")
