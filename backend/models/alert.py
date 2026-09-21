"""
models/alert.py — SMS alert log ORM model.

Every SMS (real or mock) is persisted here so the UI can display
a "Sent Alerts" panel without calling the SMS provider again.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # ── Foreign key ────────────────────────────────────────────────────────────
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True
    )

    # ── SMS details ────────────────────────────────────────────────────────────
    phone_number: Mapped[str] = mapped_column(String(15), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str] = mapped_column(String(30), nullable=False)  # mock|fast2sms|…
    status: Mapped[str] = mapped_column(String(20), default="sent")   # sent|failed
    provider_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Reason ─────────────────────────────────────────────────────────────────
    # e.g. "below_threshold" | "at_risk" | "absent_streak"
    alert_type: Mapped[str] = mapped_column(String(40), nullable=False)

    # ── Timestamp ──────────────────────────────────────────────────────────────
    sent_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # ── Relationship ───────────────────────────────────────────────────────────
    student: Mapped["Student"] = relationship("Student", back_populates="alerts")  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"<Alert id={self.id} student_id={self.student_id} "
            f"type={self.alert_type!r} status={self.status!r}>"
        )
