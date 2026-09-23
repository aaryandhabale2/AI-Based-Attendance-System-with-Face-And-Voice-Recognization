"""
routers/session.py — Teacher attendance session generation and validation endpoints.

Teachers create a session (QR + 6-char code) for a specific Subject, Class, and Section.
Students validate the session code BEFORE any camera opens.
"""

import json
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.session import ClassSession
from backend.models.subject import Subject
from backend.models.faculty import Faculty
from backend.routers.auth import get_current_faculty

router = APIRouter(prefix="/sessions", tags=["sessions"])


# ── Schemas ────────────────────────────────────────────────────────────────────
class CreateSessionRequest(BaseModel):
    subject_id: Optional[int] = None
    class_name: str
    section: Optional[str] = "A"
    duration_minutes: int = 30


class SessionDetailResponse(BaseModel):
    session_id: str
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    class_name: str
    section: Optional[str] = "A"
    teacher_name: Optional[str] = None
    created_at: str
    expires_at: str
    is_active: bool
    qr_data: str


# ── Code generator helper ──────────────────────────────────────────────────────
def _generate_code(length: int = 6) -> str:
    # Avoid confusing characters like O, 0, I, 1
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(chars) for _ in range(length))


# ── Endpoints ──────────────────────────────────────────────────────────────────
@router.post("/create", response_model=SessionDetailResponse)
def create_session(
    body: CreateSessionRequest,
    db: Session = Depends(get_db),
    faculty: Faculty = Depends(get_current_faculty),
):
    """
    Teacher creates an attendance session for a class/subject.
    Generates a unique 6-character code + QR payload.
    """
    subject = None
    if body.subject_id:
        subject = db.query(Subject).filter(Subject.id == body.subject_id).first()

    # Generate unique code
    for _ in range(10):
        code = _generate_code(6)
        if not db.query(ClassSession).filter(ClassSession.session_id == code).first():
            break
    else:
        code = f"S{secrets.token_hex(3).upper()}"

    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=max(5, min(body.duration_minutes, 180)))

    session = ClassSession(
        session_id=code,
        subject_id=body.subject_id,
        class_name=body.class_name.strip(),
        section=body.section.strip() if body.section else "A",
        faculty_id=faculty.id if faculty else None,
        created_at=now,
        expires_at=expires,
        is_active=True,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    qr_payload = json.dumps({
        "session_id": session.session_id,
        "subject_id": session.subject_id,
        "subject_name": subject.name if subject else body.class_name,
        "class_name": session.class_name,
        "section": session.section,
        "teacher_name": faculty.full_name if faculty else "Faculty",
        "expires_at": expires.isoformat(),
    })

    return SessionDetailResponse(
        session_id=session.session_id,
        subject_id=session.subject_id,
        subject_name=subject.name if subject else None,
        subject_code=subject.code if subject else None,
        class_name=session.class_name,
        section=session.section,
        teacher_name=faculty.full_name if faculty else None,
        created_at=session.created_at.isoformat() if session.created_at else now.isoformat(),
        expires_at=session.expires_at.isoformat(),
        is_active=session.is_active,
        qr_data=qr_payload,
    )


@router.get("/active", response_model=list[SessionDetailResponse])
def get_active_sessions(
    db: Session = Depends(get_db),
    faculty: Faculty = Depends(get_current_faculty),
):
    """List active sessions created by the current faculty or all active sessions."""
    q = db.query(ClassSession).filter(ClassSession.is_active == True)
    if not faculty.is_superadmin:
        q = q.filter(ClassSession.faculty_id == faculty.id)

    all_sessions = q.order_by(ClassSession.created_at.desc()).all()
    sessions = [s for s in all_sessions if not s.is_expired]
    results = []
    for s in sessions:
        qr_payload = json.dumps({
            "session_id": s.session_id,
            "subject_id": s.subject_id,
            "subject_name": s.subject.name if s.subject else s.class_name,
            "class_name": s.class_name,
            "section": s.section,
            "expires_at": s.expires_at.isoformat() if s.expires_at else "",
        })
        results.append(
            SessionDetailResponse(
                session_id=s.session_id,
                subject_id=s.subject_id,
                subject_name=s.subject.name if s.subject else None,
                subject_code=s.subject.code if s.subject else None,
                class_name=s.class_name,
                section=s.section,
                teacher_name=s.faculty.full_name if s.faculty else None,
                created_at=s.created_at.isoformat() if s.created_at else "",
                expires_at=s.expires_at.isoformat() if s.expires_at else "",
                is_active=s.is_active,
                qr_data=qr_payload,
            )
        )
    return results


@router.get("/{session_id}", response_model=SessionDetailResponse)
def get_session(session_id: str, db: Session = Depends(get_db)):
    """
    Public/student endpoint: validates session code before opening camera.
    Returns 404 if invalid code, 400 if expired.
    """
    cleaned_code = session_id.strip().upper()
    session = db.query(ClassSession).filter(
        ClassSession.session_id == cleaned_code
    ).first()

    if not session or not session.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session code is invalid or has been closed by the teacher.",
        )

    # Check expiration
    if session.is_expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This attendance session has expired. Ask your teacher for a new code.",
        )

    qr_payload = json.dumps({
        "session_id": session.session_id,
        "subject_id": session.subject_id,
        "subject_name": session.subject.name if session.subject else session.class_name,
        "class_name": session.class_name,
        "section": session.section,
        "teacher_name": session.faculty.full_name if session.faculty else "Faculty",
        "expires_at": session.expires_at.isoformat(),
    })

    return SessionDetailResponse(
        session_id=session.session_id,
        subject_id=session.subject_id,
        subject_name=session.subject.name if session.subject else session.class_name,
        subject_code=session.subject.code if session.subject else None,
        class_name=session.class_name,
        section=session.section,
        teacher_name=session.faculty.full_name if session.faculty else "Faculty",
        created_at=session.created_at.isoformat() if session.created_at else "",
        expires_at=session.expires_at.isoformat() if session.expires_at else "",
        is_active=session.is_active,
        qr_data=qr_payload,
    )


@router.post("/{session_id}/end")
def end_session(
    session_id: str,
    db: Session = Depends(get_db),
    faculty: Faculty = Depends(get_current_faculty),
):
    """End/close an attendance session so no further scans are accepted."""
    cleaned_code = session_id.strip().upper()
    session = db.query(ClassSession).filter(ClassSession.session_id == cleaned_code).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if not faculty.is_superadmin and session.faculty_id != faculty.id:
        raise HTTPException(status_code=403, detail="Not authorized to close this session.")

    session.is_active = False
    db.commit()
    return {"message": f"Session {session.session_id} has been ended."}
