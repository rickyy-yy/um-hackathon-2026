"""Dev bootstrap — create tables if they don't exist.

Alembic migrations live under ``backend/migrations`` for longer-term schema
management, but for a hackathon compose-up we just ``create_all`` so the
stack is usable with a single command.
"""
from __future__ import annotations

import asyncio
import logging

from app.core.database import Base, engine
from app import models  # noqa: F401  — registers ORM classes

logger = logging.getLogger("kira2je.bootstrap")


async def init() -> None:
    logger.info("Creating database schema if missing")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Schema ready")


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    asyncio.run(init())


if __name__ == "__main__":
    main()
