"""Application configuration loaded from environment variables."""
from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    # Z.ai GLM
    zai_api_key: str = Field(default="", alias="ZAI_API_KEY")
    zai_base_url: str = Field(default="https://api.z.ai/v1", alias="ZAI_BASE_URL")
    zai_model_name: str = Field(default="glm-4", alias="ZAI_MODEL_NAME")

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://kira2lah_user:change_me_db_password@db:5432/kira2lah",
        alias="DATABASE_URL",
    )
    sync_database_url: str = Field(
        default="postgresql://kira2lah_user:change_me_db_password@db:5432/kira2lah",
        alias="SYNC_DATABASE_URL",
    )

    # Auth
    jwt_secret_key: str = Field(default="change_me_jwt_secret", alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expiration_minutes: int = Field(default=60 * 24, alias="JWT_EXPIRATION_MINUTES")
    cookie_secure: bool = Field(default=False, alias="COOKIE_SECURE")

    # OTP / SMS
    otp_length: int = Field(default=6, alias="OTP_LENGTH")
    otp_ttl_seconds: int = Field(default=300, alias="OTP_TTL_SECONDS")  # 5 min
    otp_max_requests_per_window: int = Field(default=3, alias="OTP_MAX_REQUESTS_PER_WINDOW")
    otp_window_seconds: int = Field(default=900, alias="OTP_WINDOW_SECONDS")  # 15 min
    sms_provider: str = Field(default="console", alias="SMS_PROVIDER")  # console | twilio | vonage

    # Guest / anonymous
    guest_ttl_hours: int = Field(default=24, alias="GUEST_TTL_HOURS")
    guest_reports_per_ip_per_day: int = Field(default=3, alias="GUEST_REPORTS_PER_IP_PER_DAY")

    # SMTP
    smtp_host: str = Field(default="smtp.example.com", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from: str = Field(default="no-reply@kira2lah.local", alias="SMTP_FROM")

    # WhatsApp
    whatsapp_api_key: str = Field(default="", alias="WHATSAPP_API_KEY")
    whatsapp_api_url: str = Field(default="", alias="WHATSAPP_API_URL")

    # URLs
    frontend_url: str = Field(default="http://localhost:3000", alias="FRONTEND_URL")
    streamlit_url: str = Field(default="http://streamlit:8501", alias="STREAMLIT_URL")

    # App
    secret_key: str = Field(default="change_me_app_secret", alias="SECRET_KEY")
    upload_dir: str = Field(default="/app/uploads", alias="UPLOAD_DIR")
    max_upload_size_mb: int = Field(default=10, alias="MAX_UPLOAD_SIZE_MB")
    rate_limit_per_minute: int = Field(default=60, alias="RATE_LIMIT_PER_MINUTE")

    @property
    def cors_origins(self) -> List[str]:
        return [self.frontend_url, "http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
