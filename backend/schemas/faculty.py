"""
schemas/faculty.py — Pydantic I/O schemas for Faculty auth endpoints.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator


class FacultyCreate(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    department: Optional[str] = None
    password: str
    is_superadmin: bool = False


class FacultyUpdate(BaseModel):
    """Self-service profile update — all fields optional."""
    full_name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    """Self-service password change — requires current password for verification."""
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("New password must be at least 6 characters")
        return v


class FacultyOut(BaseModel):
    id: int
    username: str
    full_name: str
    email: Optional[str]
    department: Optional[str]
    is_active: bool
    is_superadmin: bool
    last_login: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    faculty: FacultyOut
