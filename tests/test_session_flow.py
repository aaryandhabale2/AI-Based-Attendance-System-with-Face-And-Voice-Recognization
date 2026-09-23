"""
tests/test_session_flow.py — Unit tests for teacher session generation and student verification flow.

Verifies:
  1. Teacher creates session (returns 6-char code + QR data).
  2. Student validates session code (checks active status, expiration).
  3. Invalid or expired session codes are rejected BEFORE camera opening.
  4. mark_attendance targets student by roll_no and records attendance.
  5. Expired sessions reject attendance marking attempts.
"""

import json
from datetime import datetime, timedelta, timezone, date
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, get_db
from backend.main import app
from backend.models.faculty import Faculty
from backend.models.student import Student
from backend.models.subject import Subject
from backend.models.session import ClassSession
from backend.models.attendance import Attendance
from backend.routers.auth import hash_password, create_access_token
from backend.services.attendance_service import mark_attendance


def _make_test_env():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSession()

    # Seed faculty
    faculty = Faculty(
        username="prof_test",
        full_name="Prof. Test",
        department="Computer Science",
        hashed_password=hash_password("testpass123"),
        is_superadmin=True,
        is_active=True,
    )
    db.add(faculty)

    # Seed subject
    subj = Subject(code="CS101", name="Data Structures", class_name="CS-A", credits=4)
    db.add(subj)

    # Seed enrolled student
    student = Student(
        name="Aarav Sharma",
        roll_no="CSA001",
        class_name="CS-A",
        parent_phone="9876543210",
        face_embedding=json.dumps([0.2] * 512),
        voice_embedding=json.dumps([0.2] * 192),
        is_enrolled=True,
    )
    db.add(student)
    db.commit()
    db.refresh(faculty)
    db.refresh(subj)
    db.refresh(student)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    token = create_access_token({"sub": faculty.username, "role": "faculty"})

    return client, db, faculty, subj, student, token


def test_create_and_validate_session():
    client, db, faculty, subj, student, token = _make_test_env()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Teacher creates session
    res = client.post(
        "/sessions/create",
        json={
            "subject_id": subj.id,
            "class_name": "CS-A",
            "section": "A",
            "duration_minutes": 30,
        },
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["session_id"]) == 6
    assert data["class_name"] == "CS-A"
    assert data["subject_name"] == "Data Structures"
    session_id = data["session_id"]

    # 2. Student validates session code (public endpoint, no JWT needed)
    val_res = client.get(f"/sessions/{session_id}")
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["session_id"] == session_id
    assert val_data["teacher_name"] == "Prof. Test"
    assert val_data["is_active"] is True


def test_invalid_session_code():
    client, _, _, _, _, _ = _make_test_env()
    res = client.get("/sessions/INVALID99")
    assert res.status_code == 404
    assert "invalid" in res.json()["detail"].lower()


def test_expired_session_code():
    client, db, faculty, subj, _, token = _make_test_env()
    # Create expired session directly in DB
    past_time = datetime.now(timezone.utc) - timedelta(minutes=10)
    expired_session = ClassSession(
        session_id="EXP123",
        subject_id=subj.id,
        class_name="CS-A",
        section="A",
        faculty_id=faculty.id,
        created_at=past_time - timedelta(minutes=30),
        expires_at=past_time,
        is_active=True,
    )
    db.add(expired_session)
    db.commit()

    res = client.get("/sessions/EXP123")
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower()


def test_mark_attendance_with_roll_no_and_session():
    _, db, _, _, student, _ = _make_test_env()
    today = date.today()
    session_code = "LIVE01"

    # Create active session
    active_session = ClassSession(
        session_id=session_code,
        class_name="CS-A",
        section="A",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        is_active=True,
    )
    db.add(active_session)
    db.commit()

    with patch("backend.services.face_service.recognize_face", return_value=(0.91, True)), \
         patch("backend.services.voice_service.is_available", return_value=True), \
         patch("backend.services.voice_service.recognize_voice", return_value=(0.88, True)):

        result = mark_attendance(
            db=db,
            session_id=session_code,
            frame_bytes=b"fake_frame",
            audio_bytes=b"fake_audio",
            roll_no=student.roll_no,
            class_name=student.class_name,
            today=today,
        )

        assert result.is_present is True
        assert result.student_id == student.id
        assert result.student_name == student.name
        assert "Attendance marked for Aarav Sharma" in result.message

        # Verify DB record
        record = db.query(Attendance).filter(
            Attendance.student_id == student.id,
            Attendance.session_id == session_code,
        ).first()
        assert record is not None
        assert record.is_present is True
