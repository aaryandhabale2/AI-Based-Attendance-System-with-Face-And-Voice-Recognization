"""
schemas/faculty.py — Pydantic I/O schemas for Faculty auth endpoints.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class FacultyCreate(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    department: Optional[str] = None
    password: str
    is_superadmin: bool = False


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
