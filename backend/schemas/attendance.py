"""
schemas/attendance.py — Pydantic I/O schemas for Attendance endpoints.
"""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class AttendanceMarkRequest(BaseModel):
    """Body sent by the client to mark attendance for a student."""
    session_id: str
    session_label: Optional[str] = None
    # Face frame is sent as a file upload (multipart), not in JSON body.
    # Voice sample is also a file upload. This schema covers session metadata.


class AttendanceResult(BaseModel):
    """Two-factor recognition result returned to the client."""
    student_id: Optional[int] = None
    student_name: Optional[str] = None
    roll_no: Optional[str] = None
    face_score: Optional[float] = None
    voice_score: Optional[float] = None
    face_matched: bool = False
    voice_matched: bool = False
    is_present: bool = False
    is_duplicate: bool = False
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    message: str = ""


class AttendanceOut(BaseModel):
    id: int
    student_id: int
    session_id: str
    session_label: Optional[str]
    face_score: Optional[float]
    voice_score: Optional[float]
    is_present: bool
    is_flagged: bool
    flag_reason: Optional[str]
    attendance_date: date
    marked_at: datetime

    model_config = {"from_attributes": True}


class AttendanceStats(BaseModel):
    """Per-student aggregated attendance summary.

    Three-tier MSE eligibility status:
      - 'eligible'     : attendance_pct >= cutoff + margin  (e.g. >= 60%)
      - 'at_risk'      : cutoff <= pct < cutoff + margin    (e.g. 55–59.9%)
      - 'not_eligible' : attendance_pct < cutoff            (e.g. < 55%)
    """
    student_id: int
    name: str
    roll_no: str
    class_name: str
    total_sessions: int
    present_count: int
    absent_count: int
    attendance_pct: float
    is_eligible: bool        # pct >= cutoff + margin
    is_at_risk: bool         # cutoff <= pct < cutoff + margin
    status: str              # 'eligible' | 'at_risk' | 'not_eligible'


class AlertOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    phone_number: str
    message: str
    provider: str
    status: str
    alert_type: str
    sent_at: datetime

    model_config = {"from_attributes": True}
