"""
schemas/student.py — Pydantic I/O schemas for Student endpoints.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator
import re


class StudentCreate(BaseModel):
    name: str
    roll_no: str
    class_name: str
    parent_phone: str

    @field_validator("parent_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10:
            raise ValueError("parent_phone must have at least 10 digits")
        return digits


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    class_name: Optional[str] = None
    parent_phone: Optional[str] = None


class StudentOut(BaseModel):
    id: int
    name: str
    roll_no: str
    class_name: str
    parent_phone: str
    is_enrolled: bool
    enrolled_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class StudentListOut(BaseModel):
    total: int
    students: list[StudentOut]


class EnrollmentResponse(BaseModel):
    student_id: int
    roll_no: str
    name: str
    face_frames_received: int
    voice_samples_received: int
    is_enrolled: bool
    message: str
