"""
routers/student_auth.py — Student authentication & self-service endpoints.

Students log in with roll_no + password (default password = roll_no).
Returns a JWT scoped to the student role.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.config import get_settings
from backend.database import get_db
from backend.models.student import Student
from backend.models.attendance import Attendance

router = APIRouter(prefix="/student", tags=["student"])
settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/student/login", auto_error=False)

STUDENT_ROLE = "student"


# ── Schemas ────────────────────────────────────────────────────────────────────
class StudentLoginRequest(BaseModel):
    roll_no: str
    password: str


class StudentToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student: dict


class StudentProfile(BaseModel):
    id: int
    name: str
    roll_no: str
    class_name: str
    is_enrolled: bool


# ── Password & Token Helpers ───────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def create_student_token(student_id: int, roll_no: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": str(student_id),
        "roll": roll_no,
        "role": STUDENT_ROLE,
        "exp": expire,
    }
    return jwt.encode(payload, settings.app_secret_key, algorithm="HS256")


def get_current_student(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Student:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate student credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise exc
    try:
        payload = jwt.decode(token, settings.app_secret_key, algorithms=["HS256"])
        if payload.get("role") != STUDENT_ROLE:
            raise exc
        student_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise exc

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise exc
    return student


# ── Seed helper (called at startup) ───────────────────────────────────────────
def seed_student_passwords(db: Session) -> None:
    """Give every student a default password = their roll_no (if not set)."""
    students = db.query(Student).filter(Student.password_hash == None).all()  # noqa: E711
    for s in students:
        s.password_hash = hash_password(s.roll_no)
    if students:
        db.commit()


# ── Routes ─────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=StudentToken)
def student_login(body: StudentLoginRequest, db: Session = Depends(get_db)):
    student = db.query(Student).filter(
        func.lower(Student.roll_no) == body.roll_no.strip().lower()
    ).first()

    if not student:
        raise HTTPException(status_code=401, detail="Roll number not found.")

    # If password_hash is not set, default to roll_no
    if not student.password_hash:
        student.password_hash = hash_password(student.roll_no)
        db.commit()

    if not verify_password(body.password, student.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password.")

    token = create_student_token(student.id, student.roll_no)
    return StudentToken(
        access_token=token,
        student={
            "id": student.id,
            "name": student.name,
            "roll_no": student.roll_no,
            "class_name": student.class_name,
            "is_enrolled": student.is_enrolled,
        },
    )


@router.get("/me")
def get_my_profile(student: Student = Depends(get_current_student)):
    return {
        "id": student.id,
        "name": student.name,
        "roll_no": student.roll_no,
        "class_name": student.class_name,
        "is_enrolled": student.is_enrolled,
        "enrolled_at": student.enrolled_at.isoformat() if student.enrolled_at else None,
        "created_at": student.created_at.isoformat() if student.created_at else None,
    }


@router.get("/my-attendance")
def get_my_attendance(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    records = (
        db.query(Attendance)
        .filter(Attendance.student_id == student.id)
        .order_by(Attendance.attendance_date.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": r.id,
            "session_label": r.session_label or r.session_id,
            "is_present": r.is_present,
            "attendance_date": r.attendance_date.isoformat() if r.attendance_date else None,
            "marked_at": r.marked_at.isoformat() if r.marked_at else None,
        }
        for r in records
    ]


@router.get("/my-summary")
def get_my_summary(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    total = db.query(Attendance).filter(Attendance.student_id == student.id).count()
    present = db.query(Attendance).filter(
        Attendance.student_id == student.id,
        Attendance.is_present == True,  # noqa: E712
    ).count()
    absent = total - present
    pct = round((present / total * 100), 1) if total > 0 else 0.0

    # Subject-wise breakdown from session_label
    all_records = db.query(Attendance).filter(Attendance.student_id == student.id).all()
    subjects: dict = {}
    for r in all_records:
        label = r.session_label or "Unknown"
        # session_label format: "SubjectName (Class)" or "SubjectName"
        subj = label.split("(")[0].strip() if "(" in label else label
        if subj not in subjects:
            subjects[subj] = {"total": 0, "present": 0}
        subjects[subj]["total"] += 1
        if r.is_present:
            subjects[subj]["present"] += 1

    subject_list = []
    COLORS = ["#6D4AE8", "#3B82F6", "#22C55E", "#F97316", "#EF4444", "#8B5CF6", "#EC4899"]
    for i, (name, data) in enumerate(subjects.items()):
        t = data["total"]
        p = data["present"]
        subject_list.append({
            "name": name,
            "total": t,
            "present": p,
            "absent": t - p,
            "pct": round(p / t * 100, 1) if t > 0 else 0.0,
            "color": COLORS[i % len(COLORS)],
            "eligible": (p / t * 100) >= 75 if t > 0 else False,
        })

    return {
        "total_classes": total,
        "present": present,
        "absent": absent,
        "attendance_pct": pct,
        "eligible": pct >= 75,
        "subjects": sorted(subject_list, key=lambda x: -x["pct"]),
    }
