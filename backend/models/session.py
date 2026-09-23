"""
models/session.py — ClassSession ORM model for live attendance sessions.

Teachers create a session (with Subject, Class, Section, Expiry) and generate
a session code + QR. Students scan or enter this code before any verification occurs.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class ClassSession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Human-readable 6-character code e.g. "CS-8921" or "7X9K2P"
    session_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)

    # Associated subject (optional FK)
    subject_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Class & section e.g. "CS-A", "CS-B", "IT-A"
    class_name: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    section: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="A")

    # Faculty who started the session
    faculty_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("faculty.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Lifecycle & Expiration
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)

    # Relationships
    subject = relationship("Subject", lazy="joined")
    faculty = relationship("Faculty", lazy="joined")

    @property
    def is_expired(self) -> bool:
        now = datetime.now(timezone.utc)
        exp = self.expires_at
        if exp.tzinfo is None:
            now = datetime.now()
        return now > exp

    def __repr__(self) -> str:
        return (
            f"<ClassSession id={self.id} code={self.session_id!r} "
            f"class={self.class_name!r} active={self.is_active}>"
        )
