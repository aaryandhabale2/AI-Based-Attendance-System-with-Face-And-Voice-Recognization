"""
models/attendance.py — Attendance record ORM model.

Each row represents one two-factor attendance event for one student on one date.
"""

from datetime import datetime, date
from typing import Optional

from sqlalchemy import String, Float, Boolean, DateTime, Date, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # ── Foreign key (nullable for unrecognised/unknown attempts) ───────────────
    student_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # ── Session identification ─────────────────────────────────────────────────
    session_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # e.g. "CS-A_2024-03-15_morning"
    session_label: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    # ── Recognition scores ─────────────────────────────────────────────────────
    face_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    voice_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # ── Outcome ────────────────────────────────────────────────────────────────
    is_present: Mapped[bool] = mapped_column(Boolean, default=False)
    # Flagged when an unrecognised or mismatched attempt is made
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    flag_reason: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # ── Date/time ──────────────────────────────────────────────────────────────
    attendance_date: Mapped[date] = mapped_column(Date, index=True)
    marked_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # ── Relationship ───────────────────────────────────────────────────────────
    student: Mapped["Student"] = relationship(  # noqa: F821
        "Student", back_populates="attendance_records"
    )

    def __repr__(self) -> str:
        return (
            f"<Attendance id={self.id} student_id={self.student_id} "
            f"date={self.attendance_date} present={self.is_present}>"
        )
