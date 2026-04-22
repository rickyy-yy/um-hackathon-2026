"""Kira2Lah color palette for Plotly."""

PRIMARY = "#0F6E56"
ACCENT = "#F0DD62"
SURFACE = "#C6DABF"
BG = "#F3E9D2"
ALERT = "#D64933"
INK = "#0d1b2a"

KIRA_COLORWAY = [PRIMARY, ACCENT, ALERT, SURFACE, INK]

PLOTLY_LAYOUT = {
    "colorway": KIRA_COLORWAY,
    "paper_bgcolor": "rgba(0,0,0,0)",
    "plot_bgcolor": "rgba(0,0,0,0)",
    "font": {"family": "Inter, sans-serif", "color": INK},
    "title": {"font": {"color": PRIMARY}},
    "xaxis": {"gridcolor": "rgba(15,110,86,0.1)"},
    "yaxis": {"gridcolor": "rgba(15,110,86,0.1)"},
}
