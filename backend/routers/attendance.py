"""
routers/attendance.py — Attendance marking and query endpoints.

POST /attendance/mark            → Two-factor recognition + mark present
GET  /attendance/sessions        → List active session IDs
GET  /attendance/today           → Today's attendance records
GET  /attendance/student/{id}    → All records for a specific student
GET  /attendance/export          → CSV export (Pandas)
GET  /attendance/flagged         → List flagged/suspicious records
"""

import csv
import io
import logging
from datetime import date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.attendance import Attendance
from backend.models.student import Student
from backend.routers.auth import get_current_faculty
from backend.schemas.attendance import AttendanceOut, AttendanceResult
from backend.services.attendance_service import mark_attendance

router = APIRouter(prefix="/attendance", tags=["attendance"])
logger = logging.getLogger(__name__)


@router.post("/mark", response_model=AttendanceResult)
async def mark(
    session_id: Annotated[str, Form()],
    frame: Annotated[UploadFile, File(description="Webcam frame (JPEG/PNG)")],
    audio: Annotated[UploadFile, File(description="Mic audio (WAV/WebM)")],
    session_label: Annotated[Optional[str], Form()] = None,
    db: Session = Depends(get_db),
):
    """
    Two-factor attendance marking endpoint.
    Does NOT require JWT — students use it directly from the live attendance page.
    Returns face score, voice score, and final decision.
    """
    frame_bytes = await frame.read()
    audio_bytes = await audio.read()

    if not frame_bytes:
        raise HTTPException(status_code=400, detail="Face frame is empty.")
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio sample is empty.")

    result = mark_attendance(
        db=db,
        session_id=session_id,
        session_label=session_label,
        frame_bytes=frame_bytes,
        audio_bytes=audio_bytes,
    )
    return result


@router.get("/today", response_model=list[AttendanceOut])
def today_attendance(
    session_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """Return all attendance records for today."""
    q = db.query(Attendance).filter(Attendance.attendance_date == date.today())
    if session_id:
        q = q.filter(Attendance.session_id == session_id)
    return q.order_by(Attendance.marked_at.desc()).all()


@router.get("/student/{student_id}", response_model=list[AttendanceOut])
def student_attendance(
    student_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """Return all attendance records for a specific student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    q = db.query(Attendance).filter(Attendance.student_id == student_id)
    if from_date:
        q = q.filter(Attendance.attendance_date >= from_date)
    if to_date:
        q = q.filter(Attendance.attendance_date <= to_date)
    return q.order_by(Attendance.attendance_date.desc()).all()


@router.get("/flagged", response_model=list[AttendanceOut])
def flagged_records(
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """Return all flagged (suspicious/mismatch) attendance records."""
    return (
        db.query(Attendance)
        .filter(Attendance.is_flagged == True)
        .order_by(Attendance.marked_at.desc())
        .all()
    )


@router.get("/export")
def export_csv(
    class_name: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """
    Export attendance data as a CSV file.
    Uses Pandas for the pivot / reshape before writing.
    """
    import pandas as pd

    to_date = to_date or date.today()

    # Fetch all attendance with student info via join
    q = (
        db.query(Attendance, Student)
        .join(Student, Attendance.student_id == Student.id)
    )
    if class_name:
        q = q.filter(Student.class_name == class_name)
    if from_date:
        q = q.filter(Attendance.attendance_date >= from_date)
    q = q.filter(Attendance.attendance_date <= to_date)
    rows = q.all()

    if not rows:
        raise HTTPException(status_code=404, detail="No attendance records found for the given filters.")

    data = [
        {
            "Roll No": s.roll_no,
            "Name": s.name,
            "Class": s.class_name,
            "Date": a.attendance_date.isoformat(),
            "Session": a.session_id,
            "Present": "Yes" if a.is_present else "No",
            "Face Score": round(a.face_score, 3) if a.face_score else "",
            "Voice Score": round(a.voice_score, 3) if a.voice_score else "",
            "Flagged": "Yes" if a.is_flagged else "No",
            "Flag Reason": a.flag_reason or "",
        }
        for a, s in rows
    ]

    df = pd.DataFrame(data)
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)

    filename = f"attendance_{from_date or 'all'}_{to_date}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
