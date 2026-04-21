"""Kira2 Je FastAPI entry point."""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api import auth, chat, dashboard, menu_items, reports, tax, upload
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("kira2je")

# Limiter is available to endpoints via app.state.limiter. Apply
# @limiter.limit("5/minute") on specific endpoints (e.g. login) as needed.
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Kira2 Je API", version="1.0.0")
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(status_code=429, content={"detail": "Too many requests, slow down."})


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": "Kira2 Je API", "docs": "/docs"}


app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(menu_items.router)
app.include_router(reports.router)
app.include_router(tax.router)
app.include_router(dashboard.router)
