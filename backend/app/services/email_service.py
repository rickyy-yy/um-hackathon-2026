"""Email delivery for generated reports. Uses aiosmtplib."""
from __future__ import annotations

import logging
from email.message import EmailMessage

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


async def send_report_email(
    *,
    to: str,
    subject: str,
    body: str,
    attachment_bytes: bytes,
    attachment_name: str,
    attachment_mime: str = "application/pdf",
) -> None:
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    maintype, subtype = attachment_mime.split("/", 1)
    msg.add_attachment(
        attachment_bytes, maintype=maintype, subtype=subtype, filename=attachment_name
    )

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=settings.smtp_password or None,
            start_tls=settings.smtp_port == 587,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("SMTP send failed: %s. Placeholder credentials in use?", exc)
        raise
