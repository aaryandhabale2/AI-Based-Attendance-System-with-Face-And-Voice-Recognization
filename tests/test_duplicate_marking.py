"""
tests/test_duplicate_marking.py — Unit tests for duplicate attendance prevention.

Verifies:
  1. A student can mark attendance once per session (is_present=True, is_duplicate=False).
  2. A subsequent attempt within the same session is rejected as a duplicate:
     - is_duplicate=True
     - Stored with is_flagged=True, flag_reason="duplicate_attempt"
  3. Marking attendance for a DIFFERENT session proceeds normally.
"""

from datetime import date
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base
from backend.models.student import Student
from backend.models.attendance import Attendance
from backend.services.attendance_service import mark_attendance


def _make_test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return TestingSessionLocal()


def test_duplicate_marking_same_session():
    db = _make_test_db()
    today = date(2026, 9, 21)
    session_id = "TEST_MORNING_SESSION"

    # Create dummy student
    import json as _json
    student = Student(
        name="Test Student",
        roll_no="TEST001",
        class_name="CS-A",
        parent_phone="9999999999",
        face_embedding=_json.dumps([0.1] * 512),
        voice_embedding=_json.dumps([0.1] * 192),
        is_enrolled=True,
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    fake_frame = b"fake_frame_bytes"
    fake_audio = b"fake_audio_bytes"

    # Mock recognition services to return high matching scores
    with patch("backend.services.attendance_service._find_best_student_by_face") as mock_face, \
         patch("backend.services.voice_service.is_available", return_value=True), \
         patch("backend.services.voice_service.recognize_voice", return_value=(0.95, True)):

        mock_face.return_value = (student, 0.92)

        # ── First mark: Should succeed ─────────────────────────────────────────
        res1 = mark_attendance(
            db=db,
            session_id=session_id,
            session_label="Morning Session",
            frame_bytes=fake_frame,
            audio_bytes=fake_audio,
            today=today,
        )

        assert res1.is_present is True
        assert res1.is_duplicate is False
        assert res1.is_flagged is False
        assert res1.student_id == student.id

        # Verify record in DB
        records = db.query(Attendance).filter(
            Attendance.student_id == student.id,
            Attendance.session_id == session_id,
        ).all()
        assert len(records) == 1
        assert records[0].is_present is True

        # ── Second mark in SAME session: Must be flagged as duplicate ──────────
        res2 = mark_attendance(
            db=db,
            session_id=session_id,
            session_label="Morning Session",
            frame_bytes=fake_frame,
            audio_bytes=fake_audio,
            today=today,
        )

        assert res2.is_duplicate is True
        assert res2.is_flagged is True
        assert res2.flag_reason == "duplicate_attempt"

        # Check that the duplicate attempt was persisted with flag_reason
        dup_records = db.query(Attendance).filter(
            Attendance.student_id == student.id,
            Attendance.session_id == session_id,
            Attendance.is_flagged == True,
        ).all()
        assert len(dup_records) == 1
        assert dup_records[0].flag_reason == "duplicate_attempt"

        # ── Third mark in DIFFERENT session: Should succeed ───────────────────
        diff_session = "TEST_AFTERNOON_SESSION"
        res3 = mark_attendance(
            db=db,
            session_id=diff_session,
            session_label="Afternoon Session",
            frame_bytes=fake_frame,
            audio_bytes=fake_audio,
            today=today,
        )

        assert res3.is_present is True
        assert res3.is_duplicate is False
        assert res3.is_flagged is False
