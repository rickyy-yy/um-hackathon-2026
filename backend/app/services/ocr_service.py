"""Thin wrapper around pytesseract + pdf2image for preprocessing before
sending text to the GLM.
"""
from __future__ import annotations

import logging
from io import BytesIO
from pathlib import Path

logger = logging.getLogger(__name__)


def ocr_image_bytes(data: bytes) -> str:
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        logger.warning("pytesseract/PIL not available; returning empty OCR text")
        return ""

    try:
        img = Image.open(BytesIO(data))
        return pytesseract.image_to_string(img, lang="eng+msa") or pytesseract.image_to_string(img)
    except Exception as exc:  # noqa: BLE001
        logger.warning("OCR failed: %s", exc)
        return ""


def ocr_pdf(path: str | Path) -> str:
    """Extract text from a PDF. Tries structured extraction first, then OCR."""
    path = Path(path)
    try:
        import pdfplumber

        text_parts: list[str] = []
        with pdfplumber.open(str(path)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text_parts.append(page_text)
        text = "\n".join(text_parts).strip()
        if text:
            return text
    except Exception as exc:  # noqa: BLE001
        logger.info("pdfplumber failed, falling back to OCR: %s", exc)

    # Fall back to rasterized OCR
    try:
        from pdf2image import convert_from_path

        images = convert_from_path(str(path))
        chunks: list[str] = []
        for img in images:
            buf = BytesIO()
            img.save(buf, format="PNG")
            chunks.append(ocr_image_bytes(buf.getvalue()))
        return "\n".join(chunks)
    except Exception as exc:  # noqa: BLE001
        logger.warning("PDF OCR failed: %s", exc)
        return ""
