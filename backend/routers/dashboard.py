"""
routers/dashboard.py — Faculty dashboard data endpoints.

GET /dashboard/stats          → Overall stat cards
GET /dashboard/trend          → Weekly attendance trend (Recharts line chart)
GET /dashboard/classes        → Per-class summary (bar chart)
GET /dashboard/students       → Student table with search, filter, pagination
GET /dashboard/at-risk        → Students below eligibility threshold
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.student import Student
from backend.models.attendance import Attendance
from backend.models.alert import Alert
from backend.routers.auth import get_current_faculty
from backend.schemas.attendance import AttendanceStats
from backend.services.analytics_service import (
    compute_attendance_stats,
    get_attendance_trend,
    get_class_summary,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
logger = logging.getLogger(__name__)


@router.get("/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """
    Return high-level stat cards for the dashboard header.
    """
    total_students = db.query(Student).filter(Student.is_enrolled == True).count()
    stats = compute_attendance_stats(db)
    eligible = sum(1 for s in stats if s.is_eligible)
    at_risk = sum(1 for s in stats if s.is_at_risk)
    not_eligible = sum(1 for s in stats if not s.is_eligible and not s.is_at_risk)
    avg_pct = round(sum(s.attendance_pct for s in stats) / len(stats), 1) if stats else 0.0
    total_alerts = db.query(Alert).count()
    flagged_today = (
        db.query(Attendance)
        .filter(Attendance.is_flagged == True)
        .count()
    )

    return {
        "total_students": total_students,
        "average_attendance_pct": avg_pct,
        "eligible_count": eligible,
        "at_risk_count": at_risk,
        "not_eligible_count": not_eligible,
        "total_alerts_sent": total_alerts,
        "flagged_attempts": flagged_today,
    }


@router.get("/trend")
def attendance_trend(
    weeks: int = Query(8, ge=1, le=52),
    class_name: Optional[str] = None,
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """Weekly attendance trend data for Recharts line chart."""
    return get_attendance_trend(db, weeks=weeks, class_name=class_name)


@router.get("/classes")
def class_summary(
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """Per-class attendance summary for a bar chart."""
    return get_class_summary(db)


@router.get("/students", response_model=list[AttendanceStats])
def student_table(
    class_name: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = Query(None, description="eligible|at_risk|not_eligible"),
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """
    Student table with search and filter support.
    Returns AttendanceStats (includes eligibility badges).
    """
    stats = compute_attendance_stats(db, class_name=class_name)

    if search:
        search_lower = search.lower()
        stats = [
            s for s in stats
            if search_lower in s.name.lower() or search_lower in s.roll_no.lower()
        ]

    if status == "eligible":
        stats = [s for s in stats if s.is_eligible]
    elif status == "at_risk":
        stats = [s for s in stats if s.is_at_risk]
    elif status == "not_eligible":
        stats = [s for s in stats if not s.is_eligible and not s.is_at_risk]

    return stats


@router.get("/at-risk", response_model=list[AttendanceStats])
def at_risk_students(
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """Return only students who are at-risk or not eligible."""
    stats = compute_attendance_stats(db)
    return [s for s in stats if s.is_at_risk or not s.is_eligible]
