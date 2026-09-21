"""
routers/enrollment.py — Student enrollment endpoints.

POST /enroll/student          → Create student record (no biometrics yet)
POST /enroll/{id}/face        → Upload 5-10 face frame images (multipart)
POST /enroll/{id}/voice       → Upload 3-5 audio samples (multipart)
POST /enroll/{id}/complete    → Finalise enrollment (mark is_enrolled=True)
GET  /enroll/students         → List students (enrolled + pending)
GET  /enroll/students/{id}    → Get single student
PUT  /enroll/students/{id}    → Update student metadata
DELETE /enroll/students/{id}  → Delete student
"""

import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.student import Student
from backend.routers.auth import get_current_faculty
from backend.schemas.student import (
    EnrollmentResponse, StudentCreate, StudentListOut, StudentOut, StudentUpdate
)
from backend.services import face_service, voice_service

router = APIRouter(prefix="/enroll", tags=["enrollment"])
logger = logging.getLogger(__name__)


# ── Student CRUD ──────────────────────────────────────────────────────────────

@router.post("/student", response_model=StudentOut, status_code=201)
def create_student(
    body: StudentCreate,
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """Create a student record before biometric enrollment."""
    if db.query(Student).filter(Student.roll_no == body.roll_no).first():
        raise HTTPException(status_code=409, detail=f"Roll no '{body.roll_no}' already exists.")
    student = Student(**body.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    logger.info(f"[Enroll] Student created: {student.roll_no}")
    return student


@router.get("/students", response_model=StudentListOut)
def list_students(
    class_name: str = None,
    enrolled_only: bool = False,
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """List all students with optional filters."""
    q = db.query(Student)
    if class_name:
        q = q.filter(Student.class_name == class_name)
    if enrolled_only:
        q = q.filter(Student.is_enrolled == True)
    students = q.order_by(Student.roll_no).all()
    return StudentListOut(total=len(students), students=students)


@router.get("/students/{student_id}", response_model=StudentOut)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.put("/students/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    body: StudentUpdate,
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


@router.delete("/students/{student_id}", status_code=204)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()


# ── Biometric enrollment ──────────────────────────────────────────────────────

@router.post("/{student_id}/face", response_model=EnrollmentResponse)
async def enroll_face(
    student_id: int,
    frames: Annotated[list[UploadFile], File(description="5-10 JPEG/PNG face images")],
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """
    Upload 5-10 face frame images for a student.
    Extracts ArcFace embeddings, averages them, and stores the result.
    Raw images are NOT persisted.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if not frames:
        raise HTTPException(status_code=400, detail="At least one frame is required.")

    frame_bytes_list = [await f.read() for f in frames]
    avg_embedding = face_service.enroll_face(frame_bytes_list)

    if avg_embedding is None:
        raise HTTPException(
            status_code=422,
            detail="No face could be detected in the uploaded frames. "
                   "Please ensure clear, front-facing photos.",
        )

    student.set_face_embedding(avg_embedding)
    db.commit()
    db.refresh(student)

    logger.info(f"[Enroll] Face enrolled for {student.roll_no} from {len(frames)} frames.")
    return EnrollmentResponse(
        student_id=student.id,
        roll_no=student.roll_no,
        name=student.name,
        face_frames_received=len(frames),
        voice_samples_received=0,
        is_enrolled=student.is_enrolled,
        message=f"Face enrolled successfully from {len(frames)} frames.",
    )


@router.post("/{student_id}/voice", response_model=EnrollmentResponse)
async def enroll_voice(
    student_id: int,
    samples: Annotated[list[UploadFile], File(description="3-5 short audio samples (WAV/WebM)")],
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """
    Upload 3-5 voice audio samples for a student.
    Extracts Resemblyzer embeddings, averages them, and stores the result.
    Raw audio is NOT persisted.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if not samples:
        raise HTTPException(status_code=400, detail="At least one voice sample is required.")

    audio_bytes_list = [await s.read() for s in samples]
    avg_embedding = voice_service.enroll_voice(audio_bytes_list)

    if avg_embedding is None:
        raise HTTPException(
            status_code=422,
            detail="Could not extract voice embeddings. "
                   "Ensure the audio is clear and at least 2 seconds long.",
        )

    student.set_voice_embedding(avg_embedding)
    db.commit()
    db.refresh(student)

    logger.info(f"[Enroll] Voice enrolled for {student.roll_no} from {len(samples)} samples.")
    return EnrollmentResponse(
        student_id=student.id,
        roll_no=student.roll_no,
        name=student.name,
        face_frames_received=0,
        voice_samples_received=len(samples),
        is_enrolled=student.is_enrolled,
        message=f"Voice enrolled successfully from {len(samples)} samples.",
    )


@router.post("/{student_id}/complete", response_model=EnrollmentResponse)
def complete_enrollment(
    student_id: int,
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """
    Finalise enrollment by setting is_enrolled=True.
    Requires both face and voice embeddings to be present.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    missing = []
    if not student.face_embedding:
        missing.append("face")
    if not student.voice_embedding:
        missing.append("voice")

    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot complete enrollment — missing: {', '.join(missing)}.",
        )

    student.is_enrolled = True
    student.enrolled_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(student)

    logger.info(f"[Enroll] Enrollment COMPLETE for {student.roll_no}.")
    return EnrollmentResponse(
        student_id=student.id,
        roll_no=student.roll_no,
        name=student.name,
        face_frames_received=1,  # already enrolled
        voice_samples_received=1,
        is_enrolled=True,
        message=f"Enrollment complete for {student.name}.",
    )
