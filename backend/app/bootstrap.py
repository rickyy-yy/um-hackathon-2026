"""Dev bootstrap — runs Alembic migrations to sync the schema.

For a hackathon compose-up we drive Alembic programmatically so the stack
becomes usable with a single ``docker compose up``. Production deployments
should run ``alembic upgrade head`` explicitly as part of their deploy step.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

from alembic import command
from alembic.config import Config

logger = logging.getLogger("kira2lah.bootstrap")


def _alembic_config() -> Config:
    backend_dir = Path(__file__).resolve().parent.parent
    cfg = Config(str(backend_dir / "migrations" / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_dir / "migrations"))
    # Pull the URL from the environment so alembic and the live app agree.
    from app.config import settings

    cfg.set_main_option("sqlalchemy.url", settings.sync_database_url)
    return cfg


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    logger.info("Running Alembic migrations")
    cfg = _alembic_config()
    command.upgrade(cfg, "head")
    logger.info("Migrations complete")


if __name__ == "__main__":
    main()
