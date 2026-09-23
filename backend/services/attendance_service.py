"""
services/attendance_service.py — Two-factor attendance marking and decision fusion.

Rules:
  1. Optional anti-replay challenge verification: wrong or expired phrase flags as
     "wrong_or_expired_challenge".
  2. Session validation: verifies session exists, is active, and unexpired.
  3. Roll number targeted verification: when roll_no is provided, verifies biometrics
     directly against that student's enrolled embeddings.
  4. Face identification: compare incoming face frame against enrolled student(s).
  5. Voice verification: compare incoming voice against student voice embedding.
  6. Decision fusion: evaluate individual and weighted combined scores via evaluate_fusion().
  7. Duplicate guard: re-attempt in the SAME session is stored with reason "duplicate_attempt".
  8. All unrecognised, mismatched, duplicate, and failed challenge attempts are persisted
     with their respective flag_reason for security auditing.
"""

import logging
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.config import get_settings
from backend.models.student import Student
from backend.models.attendance import Attendance
from backend.models.session import ClassSession
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
    session_label: Optional[str] = None,
    frame_bytes: bytes = b"",
    audio_bytes: bytes = b"",
    challenge_id: Optional[str] = None,
    challenge_phrase: Optional[str] = None,
    today: Optional[date] = None,
    roll_no: Optional[str] = None,
    class_name: Optional[str] = None,
    section: Optional[str] = None,
) -> AttendanceResult:
    """
    Core two-factor attendance marking and security enforcement function.
    Validates session, checks roll_no identity, runs 2FA fusion, prevents duplicate session marks.
    """
    today = today or date.today()
    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()

    # ── Step 0a: Session validation (if registered in ClassSession) ───────────
    cleaned_code = session_id.strip().upper()
    session_obj = db.query(ClassSession).filter(ClassSession.session_id == cleaned_code).first()

    subject_name = None
    if session_obj:
        exp = session_obj.expires_at
        now_cmp = (
            datetime.now(timezone.utc)
            if exp.tzinfo is not None
            else datetime.now(timezone.utc).replace(tzinfo=None)
        )
        if not session_obj.is_active or now_cmp > exp:
            return AttendanceResult(
                face_score=None,
                voice_score=None,
                face_matched=False,
                voice_matched=False,
                is_present=False,
                is_flagged=True,
                flag_reason="invalid_or_expired_session",
                timestamp=now_iso,
                message="Attendance session code is invalid or has expired.",
            )
        subject_name = session_obj.subject.name if session_obj.subject else session_obj.class_name
        class_name = class_name or session_obj.class_name
        section = section or session_obj.section
        if not session_label:
            session_label = f"{subject_name} ({class_name})"

    # ── Step 0b: Anti-replay challenge verification ───────────────────────────
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
                marked_at=now_utc,
            )
            db.add(rec)
            db.commit()
            db.refresh(rec)

            return AttendanceResult(
                subject_name=subject_name,
                class_name=class_name,
                section=section,
                face_score=None,
                voice_score=None,
                face_matched=False,
                voice_matched=False,
                is_present=False,
                is_flagged=True,
                flag_reason="wrong_or_expired_challenge",
                timestamp=now_iso,
                message="Anti-replay challenge failed: phrase was wrong or expired.",
            )

    # ── Step 1: Student identification & Face matching ────────────────────────
    student: Optional[Student] = None
    face_score = 0.0

    if roll_no:
        target_student = db.query(Student).filter(
            func.lower(Student.roll_no) == roll_no.strip().lower()
        ).first()

        if not target_student:
            return AttendanceResult(
                roll_no=roll_no,
                subject_name=subject_name,
                class_name=class_name,
                section=section,
                face_score=None,
                voice_score=None,
                face_matched=False,
                voice_matched=False,
                is_present=False,
                is_flagged=True,
                flag_reason="unknown_roll_no",
                timestamp=now_iso,
                message=f"Roll number '{roll_no}' is not enrolled in the system.",
            )

        if not target_student.is_enrolled or not target_student.face_embedding:
            return AttendanceResult(
                student_id=target_student.id,
                student_name=target_student.name,
                roll_no=target_student.roll_no,
                subject_name=subject_name,
                class_name=class_name or target_student.class_name,
                section=section,
                face_score=None,
                voice_score=None,
                face_matched=False,
                voice_matched=False,
                is_present=False,
                is_flagged=True,
                flag_reason="not_enrolled",
                timestamp=now_iso,
                message=f"{target_student.name} ({target_student.roll_no}) is not enrolled for biometrics.",
            )

        # Compare face against target student
        stored_face = target_student.get_face_embedding()
        if stored_face:
            f_score, f_matched = face_service.recognize_face(
                frame_bytes, stored_face, threshold=settings.face_similarity_threshold
            )
            face_score = f_score
            if f_matched:
                student = target_student
            else:
                logger.warning(
                    f"[Attendance] Face mismatch for {target_student.roll_no}: "
                    f"score={face_score:.4f} < {settings.face_similarity_threshold}"
                )

    # Fallback to search all students if roll_no was not provided
    if student is None and not roll_no:
        student, face_score = _find_best_student_by_face(db, frame_bytes)

    if student is None:
        # Check if voice matches any student (voice matches but face fails attack)
        voice_student, voice_score = _find_best_student_by_voice(db, audio_bytes)
        if voice_student is not None:
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
                marked_at=now_utc,
            )
            db.add(rec)
            db.commit()
            db.refresh(rec)

            return AttendanceResult(
                student_id=voice_student.id,
                student_name=voice_student.name,
                roll_no=voice_student.roll_no,
                subject_name=subject_name,
                class_name=class_name or voice_student.class_name,
                section=section,
                face_score=round(face_score, 4),
                voice_score=round(voice_score, 4),
                face_matched=False,
                voice_matched=True,
                is_present=False,
                is_flagged=True,
                flag_reason="voice_matches_face_fails",
                timestamp=now_iso,
                message=f"Voice matched {voice_student.name}, but face verification failed.",
            )

        # Neither matched: unrecognised face
        logger.warning(f"[Attendance] Face verification failed. Best score={face_score:.4f}")
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
            marked_at=now_utc,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)

        return AttendanceResult(
            roll_no=roll_no,
            subject_name=subject_name,
            class_name=class_name,
            section=section,
            face_score=round(face_score, 4),
            voice_score=None,
            face_matched=False,
            voice_matched=False,
            is_present=False,
            is_flagged=True,
            flag_reason="unknown_face",
            timestamp=now_iso,
            message="Face verification failed. Please align your face with the camera.",
        )

    # ── Step 2: Duplicate guard (keyed strictly off student_id + session_id) ──
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
            marked_at=now_utc,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)

        return AttendanceResult(
            student_id=student.id,
            student_name=student.name,
            roll_no=student.roll_no,
            subject_name=subject_name,
            class_name=class_name or student.class_name,
            section=section,
            face_score=round(face_score, 4),
            is_duplicate=True,
            is_flagged=True,
            flag_reason="duplicate_attempt",
            is_present=True,
            timestamp=existing.marked_at.isoformat() if existing.marked_at else now_iso,
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
    face_matched = face_score >= settings.face_similarity_threshold
    is_present, is_flagged, flag_reason, combined_score = evaluate_fusion(
        face_score=face_score,
        voice_score=voice_score,
        face_threshold=settings.face_similarity_threshold,
        voice_threshold=settings.voice_similarity_threshold,
        face_weight=settings.face_weight,
        voice_weight=settings.voice_weight,
        combined_threshold=settings.combined_similarity_threshold,
    )

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
        marked_at=now_utc,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # ── Step 6: Result message ────────────────────────────────────────────────
    if is_present:
        display_subj = subject_name or (session_label.split(" (")[0] if session_label else student.class_name)
        msg = f"Attendance marked for {student.name}, {display_subj}"
    elif flag_reason == "face_matches_voice_fails":
        msg = f"Voice verification failed for {student.name} (voice score: {voice_score:.2f})."
    elif flag_reason == "combined_score_low":
        msg = f"Combined biometric score ({combined_score:.2f}) below threshold {settings.combined_similarity_threshold:.2f}."
    else:
        msg = f"Biometric verification failed — Face: {face_score:.2f}, Voice: {voice_score:.2f}"

    logger.info(
        f"[Attendance] {student.roll_no} | face={face_score:.4f} voice={voice_score:.4f} "
        f"combined={combined_score:.4f} present={is_present} flagged={is_flagged} reason={flag_reason}"
    )

    return AttendanceResult(
        student_id=student.id,
        student_name=student.name,
        roll_no=student.roll_no,
        subject_name=subject_name,
        class_name=class_name or student.class_name,
        section=section,
        face_score=round(face_score, 4),
        voice_score=round(voice_score, 4),
        face_matched=face_matched,
        voice_matched=voice_matched,
        is_present=is_present,
        is_flagged=is_flagged,
        flag_reason=flag_reason,
        timestamp=now_iso,
        message=msg,
    )
