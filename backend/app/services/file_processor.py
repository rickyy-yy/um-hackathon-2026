"""File ingestion pipeline.

All extraction is GLM-driven. We only use local libraries (pandas, pdfplumber,
pytesseract) to produce a preliminary textual representation that is then
handed to the GLM for structured interpretation.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from app.services import ai_service, ocr_service

logger = logging.getLogger(__name__)

CSV_EXTENSIONS = {".csv", ".tsv"}
EXCEL_EXTENSIONS = {".xlsx", ".xls"}
PDF_EXTENSIONS = {".pdf"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

MIME_MAP = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
}

SYSTEM_PROMPT = """You are a data analyst assisting a Malaysian F&B micro-business.
Your job is to extract structured sales / cost / menu data from whatever the
user uploads — a POS export, a handwritten ledger photo, a Touch n Go
receipt, or a DuitNow QR screenshot.

Always return Malaysian Ringgit (MYR) values as decimal numbers (no "RM"
prefix, no commas). Always return dates as ISO-8601 (YYYY-MM-DD).
If you are unsure about a field, leave it null and add a human-readable
string to the "uncertainties" array explaining what you could not read.
"""


EXTRACT_SCHEMA_HINT = """Return strict JSON matching this shape:
{
  "rows": [
    {
      "item_name": "Nasi Lemak Ayam",
      "quantity_sold": 40,
      "selling_price": 7.50,
      "cost_per_unit": 3.20,
      "sale_date": "2026-03-15",
      "payment_method": "cash" | "touch_n_go" | "duitnow" | "card" | "other" | null
    }
  ],
  "missing_fields": ["cost_per_unit", ...],
  "uncertainties": ["Could not read the total for 15 Mar", ...]
}
"""


def extract_from_file(path: str | Path) -> dict[str, Any]:
    """Dispatch based on file extension. Returns the GLM's JSON interpretation."""
    path = Path(path)
    ext = path.suffix.lower()

    if ext in CSV_EXTENSIONS:
        return _extract_from_csv(path)
    if ext in EXCEL_EXTENSIONS:
        return _extract_from_excel(path)
    if ext in PDF_EXTENSIONS:
        return _extract_from_pdf(path)
    if ext in IMAGE_EXTENSIONS:
        return _extract_from_image(path, ext)

    raise ValueError(f"Unsupported file type: {ext}")


def _extract_from_csv(path: Path) -> dict[str, Any]:
    import pandas as pd

    df = pd.read_csv(path)
    return _interpret_tabular(df, source=f"CSV {path.name}")


def _extract_from_excel(path: Path) -> dict[str, Any]:
    import pandas as pd

    df = pd.read_excel(path)
    return _interpret_tabular(df, source=f"Excel {path.name}")


def _interpret_tabular(df, source: str) -> dict[str, Any]:
    headers = list(df.columns)
    preview = df.head(5).to_dict(orient="records")
    prompt = (
        f"The user uploaded a {source} with these column headers:\n"
        f"{json.dumps(headers, default=str)}\n\n"
        f"And these first 5 rows:\n{json.dumps(preview, default=str)}\n\n"
        f"Map every row in the file to the target schema.\n{EXTRACT_SCHEMA_HINT}"
    )
    # Also include a sample of all rows (capped) so the GLM can extract actual values
    all_rows = df.head(200).to_dict(orient="records")
    prompt += f"\n\nFull row sample (up to 200):\n{json.dumps(all_rows, default=str)}"
    return ai_service.complete_json(SYSTEM_PROMPT, prompt)


def _extract_from_pdf(path: Path) -> dict[str, Any]:
    text = ocr_service.ocr_pdf(path)
    if not text.strip():
        return {"rows": [], "missing_fields": [], "uncertainties": ["PDF appears to be empty"]}
    prompt = (
        "This text was extracted from a PDF uploaded by the user. Extract every "
        "sales line item you can find.\n\n"
        f"--- PDF TEXT ---\n{text}\n--- END ---\n\n{EXTRACT_SCHEMA_HINT}"
    )
    return ai_service.complete_json(SYSTEM_PROMPT, prompt)


def _extract_from_image(path: Path, ext: str) -> dict[str, Any]:
    """For images we try OCR for a text hint, then hand BOTH the text and the
    raw image to the GLM (vision) for maximum accuracy.
    """
    image_bytes = path.read_bytes()
    mime = MIME_MAP.get(ext, "image/jpeg")
    ocr_text = ocr_service.ocr_image_bytes(image_bytes)

    prompt = (
        "The user took a photo of their sales record. This could be a handwritten "
        "account book (buku akaun), a Touch n Go eWallet screenshot, a DuitNow QR "
        "receipt, or a printed POS receipt.\n\n"
        f"OCR preview (may be imperfect): {ocr_text or '(none)'}\n\n"
        f"Extract every sales line or transaction you can see in the image.\n{EXTRACT_SCHEMA_HINT}"
    )

    try:
        raw = ai_service.analyse_image(image_bytes, prompt, mime=mime)
        return ai_service._safe_json_loads(raw)  # noqa: SLF001 — internal helper
    except Exception as exc:  # noqa: BLE001
        logger.warning("Vision call failed, falling back to OCR-only: %s", exc)
        if not ocr_text.strip():
            return {
                "rows": [],
                "missing_fields": [],
                "uncertainties": ["Image could not be read"],
            }
        return ai_service.complete_json(SYSTEM_PROMPT, prompt)
