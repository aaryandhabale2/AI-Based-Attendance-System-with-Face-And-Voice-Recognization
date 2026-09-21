"""
services/attendance_service.py — Two-factor attendance marking and decision fusion.

Rules:
  1. Optional anti-replay challenge verification: wrong or expired phrase flags as
     "wrong_or_expired_challenge".
  2. Face identification: compare incoming face frame against enrolled students.
  3. Voice verification: compare incoming voice against student voice embedding.
  4. Decision fusion: evaluate individual and weighted combined scores via evaluate_fusion().
  5. Duplicate guard: re-attempt in the same session is stored with reason "duplicate_attempt".
  6. All unrecognised, mismatched, duplicate, and failed challenge attempts are persisted
     with their respective flag_reason for security auditing.
"""

import logging
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.models.student import Student
from backend.models.attendance import Attendance
from backend.schemas.attendance import AttendanceResult
from backend.services import face_service, voice_service, challenge_service
from backend.services.fusion_service import evaluate_fusion

logger = logging.getLogger(__name__)
settings = get_settings()


def _find_best_student_by_face(
    db: Session,
    frame_bytes: bytes,
) -> tuple[Optional[Student], float]:
    """
    Compare the incoming face frame against all enrolled students.
    Returns (best_student, best_score).
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


def _find_best_student_by_voice(
    db: Session,
    audio_bytes: bytes,
) -> tuple[Optional[Student], float]:
    """
    Compare incoming audio against all enrolled students to detect voice match.
    Used to detect 'voice matches but face fails' attacks.
    """
    if not voice_service.is_available():
        return None, 0.0

    students = (
        db.query(Student)
        .filter(Student.is_enrolled == True, Student.voice_embedding.isnot(None))
        .all()
    )

    best_student: Optional[Student] = None
    best_score = 0.0

    for student in students:
        stored = student.get_voice_embedding()
        if stored is None:
            continue
        score, matched = voice_service.recognize_voice(
            audio_bytes, stored, threshold=settings.voice_similarity_threshold
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
    challenge_id: Optional[str] = None,
    challenge_phrase: Optional[str] = None,
    today: Optional[date] = None,
) -> AttendanceResult:
    """
    Core two-factor attendance marking and security enforcement function.
    """
    today = today or date.today()

    # ── Step 0: Anti-replay challenge verification (if submitted) ─────────────
    if challenge_id is not None or challenge_phrase is not None:
        valid_challenge, reason = challenge_service.verify_challenge(challenge_id, challenge_phrase)
        if not valid_challenge:
            logger.warning(f"[Attendance] Challenge failed: {reason}")
            rec = Attendance(
                student_id=None,
                session_id=session_id,
                session_label=session_label,
                face_score=None,
                voice_score=None,
                is_present=False,
                is_flagged=True,
                flag_reason="wrong_or_expired_challenge",
                attendance_date=today,
                marked_at=datetime.now(timezone.utc),
            )
            db.add(rec)
            db.commit()
            db.refresh(rec)

            return AttendanceResult(
                face_score=None,
                voice_score=None,
                face_matched=False,
                voice_matched=False,
                is_present=False,
                is_flagged=True,
                flag_reason="wrong_or_expired_challenge",
                message="Anti-replay challenge failed: phrase was wrong or expired.",
            )

    # ── Step 1: Face identification ───────────────────────────────────────────
    student, face_score = _find_best_student_by_face(db, frame_bytes)

    if student is None:
        # Check if the voice matches any student (voice matches but face fails)
        voice_student, voice_score = _find_best_student_by_voice(db, audio_bytes)
        if voice_student is not None:
            # Voice matched a student, but face failed
            logger.warning(
                f"[Attendance] Voice matches {voice_student.roll_no} (score={voice_score:.4f}), "
                f"but face failed (score={face_score:.4f})"
            )
            rec = Attendance(
                student_id=voice_student.id,
                session_id=session_id,
                session_label=session_label,
                face_score=round(face_score, 4),
                voice_score=round(voice_score, 4),
                is_present=False,
                is_flagged=True,
                flag_reason="voice_matches_face_fails",
                attendance_date=today,
                marked_at=datetime.now(timezone.utc),
            )
            db.add(rec)
            db.commit()
            db.refresh(rec)

            return AttendanceResult(
                student_id=voice_student.id,
                student_name=voice_student.name,
                roll_no=voice_student.roll_no,
                face_score=round(face_score, 4),
                voice_score=round(voice_score, 4),
                face_matched=False,
                voice_matched=True,
                is_present=False,
                is_flagged=True,
                flag_reason="voice_matches_face_fails",
                message=f"Voice matched {voice_student.name}, but face verification failed.",
            )

        # Neither face nor voice matched any student: unknown face
        logger.warning(f"[Attendance] Unknown face detected. Best score={face_score:.4f}")
        rec = Attendance(
            student_id=None,
            session_id=session_id,
            session_label=session_label,
            face_score=round(face_score, 4),
            voice_score=None,
            is_present=False,
            is_flagged=True,
            flag_reason="unknown_face",
            attendance_date=today,
            marked_at=datetime.now(timezone.utc),
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)

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
        rec = Attendance(
            student_id=student.id,
            session_id=session_id,
            session_label=session_label,
            face_score=round(face_score, 4),
            voice_score=None,
            is_present=False,
            is_flagged=True,
            flag_reason="duplicate_attempt",
            attendance_date=today,
            marked_at=datetime.now(timezone.utc),
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)

        return AttendanceResult(
            student_id=student.id,
            student_name=student.name,
            roll_no=student.roll_no,
            face_score=round(face_score, 4),
            is_duplicate=True,
            is_flagged=True,
            flag_reason="duplicate_attempt",
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
        voice_matched = False

    # ── Step 4: Biometric decision fusion ─────────────────────────────────────
    is_present, is_flagged, flag_reason, combined_score = evaluate_fusion(
        face_score=face_score,
        voice_score=voice_score,
        face_threshold=settings.face_similarity_threshold,
        voice_threshold=settings.voice_similarity_threshold,
        face_weight=settings.face_weight,
        voice_weight=settings.voice_weight,
        combined_threshold=settings.combined_similarity_threshold,
    )
    face_matched = face_score >= settings.face_similarity_threshold

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

    # ── Step 6: Result message ────────────────────────────────────────────────
    if is_present:
        msg = f"✅ Present — {student.name} ({student.roll_no}) [Combined: {combined_score:.2f}]"
    elif flag_reason == "face_matches_voice_fails":
        msg = f"⚠️ Voice mismatch for {student.name} (voice score: {voice_score:.2f}). Attendance NOT marked."
    elif flag_reason == "combined_score_low":
        msg = f"⚠️ Combined score ({combined_score:.2f}) below threshold {settings.combined_similarity_threshold:.2f}."
    else:
        msg = f"❌ Biometric verification failed — Face: {face_score:.2f}, Voice: {voice_score:.2f}"

    logger.info(
        f"[Attendance] {student.roll_no} | face={face_score:.4f} voice={voice_score:.4f} "
        f"combined={combined_score:.4f} present={is_present} flagged={is_flagged} reason={flag_reason}"
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
