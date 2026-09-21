"""
services/attendance_service.py — Two-factor attendance marking logic.

Rules:
  1. Must be enrolled (both face and voice embeddings present).
  2. Face score >= FACE_SIMILARITY_THRESHOLD AND voice score >= VOICE_SIMILARITY_THRESHOLD
     → is_present = True
  3. Duplicate guard: if a student is already marked present for this session, reject.
  4. Unknown face (no match found) → log a flagged record with flag_reason.
"""

import logging
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.models.student import Student
from backend.models.attendance import Attendance
from backend.schemas.attendance import AttendanceResult
from backend.services import face_service, voice_service

logger = logging.getLogger(__name__)
settings = get_settings()


def _find_best_student_by_face(
    db: Session,
    frame_bytes: bytes,
) -> tuple[Optional[Student], float]:
    """
    Compare the incoming face frame against all enrolled students.
    Returns (best_student, best_score). Returns (None, 0.0) if no match.
    """
    students = (
        db.query(Student)
        .filter(Student.is_enrolled == True, Student.face_embedding.isnot(None))
        .all()
    )

    best_student: Optional[Student] = None
    best_score = 0.0

    for student in students:
        stored = student.get_face_embedding()
        if stored is None:
            continue
        score, matched = face_service.recognize_face(
            frame_bytes, stored, threshold=settings.face_similarity_threshold
        )
        if score > best_score:
            best_score = score
            if matched:
                best_student = student

    return best_student, best_score


def mark_attendance(
    db: Session,
    session_id: str,
    session_label: Optional[str],
    frame_bytes: bytes,
    audio_bytes: bytes,
    today: Optional[date] = None,
) -> AttendanceResult:
    """
    Core two-factor attendance marking function.

    Steps:
      1. Identify the student by face recognition (scan all enrolled students).
      2. If identified, verify voice against that student's voice embedding.
      3. Apply duplicate guard per (student, session_id).
      4. Persist attendance record.
      5. Return a detailed AttendanceResult.
    """
    today = today or date.today()

    # ── Step 1: Face identification ───────────────────────────────────────────
    student, face_score = _find_best_student_by_face(db, frame_bytes)

    if student is None:
        # Unknown face — log flagged record (no student_id)
        logger.warning(f"[Attendance] Unknown face detected. Best score={face_score:.4f}")
        return AttendanceResult(
            face_score=round(face_score, 4),
            voice_score=None,
            face_matched=False,
            voice_matched=False,
            is_present=False,
            is_flagged=True,
            flag_reason="unknown_face",
            message="Face not recognized. Please ensure you are enrolled.",
        )

    # ── Step 2: Duplicate guard ────────────────────────────────────────────────
    existing = (
        db.query(Attendance)
        .filter(
            Attendance.student_id == student.id,
            Attendance.session_id == session_id,
            Attendance.is_present == True,
        )
        .first()
    )
    if existing:
        logger.info(f"[Attendance] Duplicate attempt — student {student.roll_no}, session {session_id}")
        return AttendanceResult(
            student_id=student.id,
            student_name=student.name,
            roll_no=student.roll_no,
            face_score=round(face_score, 4),
            is_duplicate=True,
            is_present=True,
            message=f"{student.name} is already marked present for this session.",
        )

    # ── Step 3: Voice verification ────────────────────────────────────────────
    voice_score = 0.0
    voice_matched = False
    stored_voice = student.get_voice_embedding()

    if stored_voice and voice_service.is_available():
        voice_score, voice_matched = voice_service.recognize_voice(
            audio_bytes, stored_voice, threshold=settings.voice_similarity_threshold
        )
    else:
        logger.warning(
            f"[Attendance] Voice skipped for {student.roll_no}: "
            f"{'no embedding' if not stored_voice else 'service unavailable'}"
        )
        # Treat as voice mismatch
        voice_matched = False

    face_matched = face_score >= settings.face_similarity_threshold
    is_present = face_matched and voice_matched

    # ── Step 4: Detect mismatch / flag ────────────────────────────────────────
    is_flagged = face_matched and not voice_matched
    flag_reason = "voice_mismatch" if is_flagged else None

    # ── Step 5: Persist attendance record ─────────────────────────────────────
    record = Attendance(
        student_id=student.id,
        session_id=session_id,
        session_label=session_label,
        face_score=round(face_score, 4),
        voice_score=round(voice_score, 4),
        is_present=is_present,
        is_flagged=is_flagged,
        flag_reason=flag_reason,
        attendance_date=today,
        marked_at=datetime.now(timezone.utc),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # ── Build result ───────────────────────────────────────────────────────────
    if is_present:
        msg = f"✅ Present — {student.name} ({student.roll_no})"
    elif is_flagged:
        msg = f"⚠️ Voice mismatch for {student.name}. Attendance NOT marked."
    else:
        msg = f"❌ Not present — Face score {face_score:.2f}, Voice score {voice_score:.2f}"

    logger.info(
        f"[Attendance] {student.roll_no} | face={face_score:.4f} voice={voice_score:.4f} "
        f"present={is_present} flagged={is_flagged}"
    )

    return AttendanceResult(
        student_id=student.id,
        student_name=student.name,
        roll_no=student.roll_no,
        face_score=round(face_score, 4),
        voice_score=round(voice_score, 4),
        face_matched=face_matched,
        voice_matched=voice_matched,
        is_present=is_present,
        is_flagged=is_flagged,
        flag_reason=flag_reason,
        message=msg,
    )
