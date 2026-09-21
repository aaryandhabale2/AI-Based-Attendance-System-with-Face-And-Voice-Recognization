"""
config.py — Application settings loaded from .env via pydantic-settings.
All configuration lives here; never import os.environ directly elsewhere.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────────────────────
    app_env: str = "development"
    app_secret_key: str = "change-me-to-a-long-random-secret"

    # ── Database ───────────────────────────────────────────────────────────────
    database_url: str = "sqlite:///./attendance.db"

    # ── Auth ───────────────────────────────────────────────────────────────────
    jwt_expire_minutes: int = 480

    # ── ML Thresholds ──────────────────────────────────────────────────────────
    face_similarity_threshold: float = 0.45
    voice_similarity_threshold: float = 0.75
    mse_eligibility_threshold: float = 55.0  # percentage

    # ── SMS ────────────────────────────────────────────────────────────────────
    sms_provider: str = "mock"
    fast2sms_api_key: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""
    msg91_auth_key: str = ""
    msg91_sender_id: str = "ATTEND"

    # ── CORS ───────────────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()
