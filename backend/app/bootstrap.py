"""Dev bootstrap — runs Alembic migrations to sync the schema.

Handles three database states:

1. **Empty DB** — Alembic runs the baseline migration and creates everything.
2. **Alembic-managed DB** — upgrade to head; no-op if already there.
3. **Iteration-1 leftover schema** (tables exist, but no ``alembic_version``
   table, because iteration 1 used ``Base.metadata.create_all``) — we detect
   this and drop the public schema before running the baseline. This matches
   the documented behaviour in ``DESIGN_DECISIONS.md``: there is no in-place
   upgrade path from iteration 1.

For production deploys this module is replaced by an explicit
``alembic upgrade head`` as part of the deploy pipeline.
"""
from __future__ import annotations

import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

logger = logging.getLogger("kira2lah.bootstrap")


def _alembic_config() -> Config:
    backend_dir = Path(__file__).resolve().parent.parent
    cfg = Config(str(backend_dir / "migrations" / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_dir / "migrations"))
    from app.config import settings

    cfg.set_main_option("sqlalchemy.url", settings.sync_database_url)
    return cfg


def _reset_iteration_one_schema_if_present() -> None:
    """If we detect iteration-1 orphan tables (no alembic_version), wipe them.

    Checked conservatively: only drop if the ``users`` table exists **and**
    there is no ``alembic_version`` table. In any other shape (fully empty DB,
    or Alembic-managed DB) we do nothing and let Alembic proceed normally.
    """
    from app.config import settings

    engine = create_engine(settings.sync_database_url)
    try:
        with engine.connect() as conn:
            inspector = inspect(conn)
            tables = set(inspector.get_table_names())
            if "alembic_version" in tables:
                return  # Alembic is in charge; leave it alone.
            if "users" not in tables:
                return  # Empty or near-empty DB; nothing to clean up.
            logger.warning(
                "Detected iteration-1 schema (tables present, no alembic_version). "
                "Dropping public schema so the baseline migration can run. "
                "This wipes existing data — this is documented behaviour."
            )
            # CASCADE drops all objects owned by the public schema in one shot.
            conn.execute(text("DROP SCHEMA public CASCADE"))
            conn.execute(text("CREATE SCHEMA public"))
            conn.commit()
    finally:
        engine.dispose()


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    _reset_iteration_one_schema_if_present()
    logger.info("Running Alembic migrations")
    cfg = _alembic_config()
    command.upgrade(cfg, "head")
    logger.info("Migrations complete")


if __name__ == "__main__":
    main()
