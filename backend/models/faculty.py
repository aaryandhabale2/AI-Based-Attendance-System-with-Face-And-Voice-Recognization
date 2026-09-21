"""
models/faculty.py — Faculty (dashboard user) ORM model.

Passwords are stored as bcrypt hashes — never in plain text.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class Faculty(Base):
    __tablename__ = "faculty"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # ── Identity ───────────────────────────────────────────────────────────────
    username: Mapped[str] = mapped_column(String(60), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)

    # ── Auth ───────────────────────────────────────────────────────────────────
    hashed_password: Mapped[str] = mapped_column(String(128), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superadmin: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # ── Timestamps ─────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    def __repr__(self) -> str:
        return f"<Faculty id={self.id} username={self.username!r}>"
