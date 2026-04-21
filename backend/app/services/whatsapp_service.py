"""Generic WhatsApp delivery. Wraps a vendor-agnostic REST endpoint.

The PRD leaves the vendor unspecified; we support a simple bearer-token
POST with the recipient phone number and a base64 attachment. Any vendor
offering an equivalent API shape (twilio, vonage, msg91, etc.) can be
adapted here.
"""
from __future__ import annotations

import base64
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def send_report_whatsapp(
    *,
    phone_number: str,
    caption: str,
    attachment_bytes: bytes,
    attachment_name: str,
) -> None:
    if not settings.whatsapp_api_url or not settings.whatsapp_api_key:
        logger.warning(
            "WhatsApp credentials not configured — skipping send (to %s)", phone_number
        )
        raise RuntimeError("WhatsApp API is not configured")

    payload = {
        "to": phone_number,
        "caption": caption,
        "filename": attachment_name,
        "file_base64": base64.b64encode(attachment_bytes).decode("ascii"),
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            settings.whatsapp_api_url,
            json=payload,
            headers={"Authorization": f"Bearer {settings.whatsapp_api_key}"},
        )
        resp.raise_for_status()
