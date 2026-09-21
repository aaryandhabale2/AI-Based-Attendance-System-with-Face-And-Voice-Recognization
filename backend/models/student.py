"""
models/student.py — Student ORM model.

Only embeddings (numpy arrays serialised as JSON) are stored — never raw
face images or voice recordings, as those are biometric data.
"""

import json
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # ── Identity ───────────────────────────────────────────────────────────────
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    roll_no: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    class_name: Mapped[str] = mapped_column(String(60), nullable=False)  # e.g. "CS-A"
    parent_phone: Mapped[str] = mapped_column(String(15), nullable=False)

    # ── Biometric embeddings (stored as JSON-encoded float lists) ──────────────
    # face_embedding: average ArcFace embedding vector (512-d)
    face_embedding: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # voice_embedding: average Resemblyzer/SpeechBrain embedding vector (256-d)
    voice_embedding: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Enrolment status ───────────────────────────────────────────────────────
    is_enrolled: Mapped[bool] = mapped_column(default=False)
    enrolled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # ── Timestamps ─────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    attendance_records: Mapped[list["Attendance"]] = relationship(  # noqa: F821
        "Attendance", back_populates="student", cascade="all, delete-orphan"
    )
    alerts: Mapped[list["Alert"]] = relationship(  # noqa: F821
        "Alert", back_populates="student", cascade="all, delete-orphan"
    )

    # ── Helpers ────────────────────────────────────────────────────────────────
    def set_face_embedding(self, vector: list[float]) -> None:
        self.face_embedding = json.dumps(vector)

    def get_face_embedding(self) -> Optional[list[float]]:
        return json.loads(self.face_embedding) if self.face_embedding else None

    def set_voice_embedding(self, vector: list[float]) -> None:
        self.voice_embedding = json.dumps(vector)

    def get_voice_embedding(self) -> Optional[list[float]]:
        return json.loads(self.voice_embedding) if self.voice_embedding else None

    def __repr__(self) -> str:
        return f"<Student id={self.id} roll={self.roll_no} name={self.name!r}>"
