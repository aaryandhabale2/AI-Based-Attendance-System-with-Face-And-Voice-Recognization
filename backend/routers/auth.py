"""
routers/auth.py — Faculty authentication endpoints.

POST /auth/login          → Returns JWT token
GET  /auth/me             → Returns current faculty info  (requires token)
POST /auth/register       → Create a new faculty account  (superadmin only)
GET  /auth/faculty        → List all faculty accounts      (superadmin only)
DELETE /auth/faculty/{id} → Deactivate an account          (superadmin only)
"""

from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.database import get_db
from backend.models.faculty import Faculty
from backend.schemas.faculty import (
    FacultyCreate, FacultyOut, LoginRequest, TokenResponse
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

# ── Password hashing ────────────────────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Helpers ───────────────────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.app_secret_key, algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.app_secret_key, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_faculty(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db),
) -> Faculty:
    payload = decode_token(token)
    faculty_id: int = payload.get("sub")
    if not faculty_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    faculty = db.query(Faculty).filter(Faculty.id == int(faculty_id), Faculty.is_active == True).first()
    if not faculty:
        raise HTTPException(status_code=401, detail="Faculty not found or inactive")
    return faculty


def require_superadmin(faculty: Faculty = Depends(get_current_faculty)) -> Faculty:
    if not faculty.is_superadmin:
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return faculty


# ── Routes ────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
def login(form_data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a faculty member and return a JWT access token."""
    faculty = db.query(Faculty).filter(
        Faculty.username == form_data.username,
        Faculty.is_active == True,
    ).first()
    if not faculty or not verify_password(form_data.password, faculty.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    faculty.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(faculty)
    token = create_access_token({"sub": str(faculty.id), "username": faculty.username})
    return TokenResponse(access_token=token, faculty=FacultyOut.model_validate(faculty))


@router.get("/me", response_model=FacultyOut)
def get_me(current: Faculty = Depends(get_current_faculty)):
    """Return the currently authenticated faculty member's profile."""
    return current


@router.post("/register", response_model=FacultyOut, status_code=201)
def register_faculty(
    body: FacultyCreate,
    db: Session = Depends(get_db),
    _admin: Faculty = Depends(require_superadmin),
):
    """Create a new faculty account. Superadmin only."""
    if db.query(Faculty).filter(Faculty.username == body.username).first():
        raise HTTPException(status_code=409, detail="Username already exists")
    faculty = Faculty(
        username=body.username,
        full_name=body.full_name,
        email=body.email,
        department=body.department,
        hashed_password=hash_password(body.password),
        is_superadmin=body.is_superadmin,
    )
    db.add(faculty)
    db.commit()
    db.refresh(faculty)
    return faculty


@router.get("/faculty", response_model=list[FacultyOut])
def list_faculty(
    db: Session = Depends(get_db),
    _admin: Faculty = Depends(require_superadmin),
):
    """List all faculty accounts. Superadmin only."""
    return db.query(Faculty).all()


@router.delete("/faculty/{faculty_id}", status_code=204)
def deactivate_faculty(
    faculty_id: int,
    db: Session = Depends(get_db),
    current: Faculty = Depends(require_superadmin),
):
    """Soft-deactivate a faculty account. Superadmin only."""
    if faculty_id == current.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    faculty.is_active = False
    db.commit()
