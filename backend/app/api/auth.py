"""Auth endpoints: phone-based signup + password/OTP login + password reset.

Login identifier is the user's Malaysian mobile phone number, normalized to
E.164 before storage and lookup. Email is kept as an optional profile field
(used for report delivery) but is NOT a credential.

Note: we intentionally do NOT use `from __future__ import annotations` here.
slowapi's @limiter.limit wrapper leaves FastAPI unable to resolve string
forward refs (e.g. "SignupRequest") because the wrapped function's
__globals__ points at slowapi's module, not ours.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db
from app.core.dependencies import AUTH_COOKIE_NAME, get_current_user
from app.core.security import (
    InvalidPhoneNumberError,
    create_access_token,
    hash_password,
    normalize_phone,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import (
    LoginPasswordRequest,
    OtpRequest,
    OtpRequestedResponse,
    OtpVerifyRequest,
    PasswordResetRequest,
    SignupRequest,
    UpdateProfileRequest,
    UserResponse,
)
from app.services import otp_service

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.jwt_expiration_minutes * 60,
        path="/",
    )


def _normalize_or_400(raw: str) -> str:
    try:
        return normalize_phone(raw)
    except InvalidPhoneNumberError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None


def _dev_code(code: str) -> str | None:
    """Echo the OTP back only when using the console SMS stub."""
    return code if settings.sms_provider.lower() == "console" else None


# ---------- Signup ----------

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def signup(
    request: Request,
    payload: SignupRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    phone = _normalize_or_400(payload.phone_number)

    existing = await db.execute(select(User).where(User.phone_number == phone))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="ERR_PHONE_ALREADY_REGISTERED")

    user = User(
        phone_number=phone,
        password_hash=hash_password(payload.password),
        full_name=(payload.full_name or None),
        email=(payload.email.lower() if payload.email else None),
        preferred_language=payload.preferred_language,
    )
    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="ERR_PHONE_ALREADY_REGISTERED") from None

    token = create_access_token(user.id)
    _set_auth_cookie(response, token)

    # Adopt any guest data created in this browser so the user's sign-up does
    # not lose work they already did.
    from app.services.guest_adoption import adopt_guest_if_any  # local import to avoid cycles

    await adopt_guest_if_any(db, request, user)

    return user


# ---------- Login (password) ----------

@router.post("/login/password", response_model=UserResponse)
@limiter.limit("10/minute")
async def login_with_password(
    request: Request,
    payload: LoginPasswordRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    phone = _normalize_or_400(payload.phone_number)
    result = await db.execute(select(User).where(User.phone_number == phone))
    user = result.scalar_one_or_none()
    # Uniform error to avoid leaking whether the phone is registered.
    if user is None or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="ERR_INVALID_CREDENTIALS")

    token = create_access_token(user.id)
    _set_auth_cookie(response, token)
    return user


# ---------- Login (OTP) ----------

@router.post("/otp/request", response_model=OtpRequestedResponse)
@limiter.limit("5/minute")
async def request_otp(
    request: Request,
    payload: OtpRequest,
    db: AsyncSession = Depends(get_db),
) -> OtpRequestedResponse:
    phone = _normalize_or_400(payload.phone_number)

    if payload.purpose == "password_reset":
        # Only dispatch a reset code if the account exists, but still return a
        # success payload so we don't leak enumeration.
        result = await db.execute(select(User).where(User.phone_number == phone))
        if result.scalar_one_or_none() is None:
            return OtpRequestedResponse(
                delivered=True, expires_in_seconds=settings.otp_ttl_seconds, dev_code=None
            )

    try:
        code, ttl = await otp_service.issue_otp(db, phone, payload.purpose)
    except otp_service.OtpRateLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from None
    return OtpRequestedResponse(delivered=True, expires_in_seconds=ttl, dev_code=_dev_code(code))


@router.post("/otp/verify", response_model=UserResponse)
@limiter.limit("10/minute")
async def verify_otp_login(
    request: Request,
    payload: OtpVerifyRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    if payload.purpose != "login":
        # verify endpoint is sign-in only; password reset uses /password/reset
        raise HTTPException(status_code=400, detail="ERR_OTP_PURPOSE_INVALID")
    phone = _normalize_or_400(payload.phone_number)

    try:
        await otp_service.verify_and_consume(db, phone, payload.code, "login")
    except otp_service.OtpInvalidError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from None

    result = await db.execute(select(User).where(User.phone_number == phone))
    user = result.scalar_one_or_none()
    if user is None:
        # No account yet — OTP sign-in requires an existing user.
        raise HTTPException(status_code=404, detail="ERR_USER_NOT_FOUND")

    token = create_access_token(user.id)
    _set_auth_cookie(response, token)
    return user


# ---------- Password reset ----------

@router.post("/password/reset", response_model=UserResponse)
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    payload: PasswordResetRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    phone = _normalize_or_400(payload.phone_number)
    try:
        await otp_service.verify_and_consume(db, phone, payload.code, "password_reset")
    except otp_service.OtpInvalidError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from None

    result = await db.execute(select(User).where(User.phone_number == phone))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="ERR_USER_NOT_FOUND")

    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id)
    _set_auth_cookie(response, token)
    return user


# ---------- Session ----------

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> Response:
    response.delete_cookie(key=AUTH_COOKIE_NAME, path="/")
    return response


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    payload: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    if payload.full_name is not None:
        user.full_name = payload.full_name or None
    if payload.email is not None:
        user.email = payload.email.lower() if payload.email else None
    if payload.preferred_language is not None:
        user.preferred_language = payload.preferred_language
    if payload.theme_preference is not None:
        user.theme_preference = payload.theme_preference
    await db.commit()
    await db.refresh(user)
    return user
