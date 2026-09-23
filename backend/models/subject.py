"""
models/subject.py — Subject and ClassSchedule ORM models.

Subject      : A course taught in a class (e.g. Data Structures, CS-A).
ClassSchedule: A recurring weekly slot for a subject (day, start/end time).

Session IDs in existing attendance follow the pattern:
  "{CLASS}_{YYYY-MM-DD}_{PERIOD}"  e.g. "CS-A_2026-09-15_morning"

The subject_code prefix is used to link attendance → subject for computing
subject-wise attendance percentages.  When new sessions are created via the
"Generate Class Link" feature the session_id will embed the subject_code:
  "{SUBJECT_CODE}_{CLASS}_{YYYY-MM-DD}_{HH-MM}"  e.g. "DS_CS-A_2026-09-15_10-00"
"""

from datetime import time
from typing import Optional

from sqlalchemy import String, Integer, Time, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # e.g. "DS", "DBMS", "WT", "CN", "OS"
    code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(120), nullable=False)

    # Class this subject belongs to: "CS-A", "CS-B", "IT-A"
    class_name: Mapped[str] = mapped_column(String(40), nullable=False, index=True)

    # Number of credits / hours (informational)
    credits: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=4)

    # Colour dot shown in UI (optional hex)
    color: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    __table_args__ = (
        UniqueConstraint("code", "class_name", name="uq_subject_code_class"),
    )

    schedules: Mapped[list["ClassSchedule"]] = relationship(
        "ClassSchedule", back_populates="subject", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Subject code={self.code!r} class={self.class_name!r}>"


class ClassSchedule(Base):
    """One recurring weekly slot for a subject."""
    __tablename__ = "class_schedules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    subject_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # 0 = Monday … 6 = Sunday (matches Python datetime.weekday())
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)

    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)

    room: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)

    subject: Mapped["Subject"] = relationship("Subject", back_populates="schedules")

    @property
    def day_name(self) -> str:
        return ["Monday", "Tuesday", "Wednesday", "Thursday",
                "Friday", "Saturday", "Sunday"][self.day_of_week]

    def __repr__(self) -> str:
        return (
            f"<ClassSchedule subject_id={self.subject_id} "
            f"day={self.day_name} {self.start_time}-{self.end_time}>"
        )
