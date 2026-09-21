"""
services/analytics_service.py — Attendance aggregation and MSE eligibility.

Uses Pandas for all aggregation logic. Called by:
  - dashboard router (on-demand)
  - scheduler (weekly job)
"""

import logging
from datetime import date, timedelta
from typing import Optional

import pandas as pd
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.models.student import Student
from backend.models.attendance import Attendance
from backend.schemas.attendance import AttendanceStats

logger = logging.getLogger(__name__)
settings = get_settings()


def compute_attendance_stats(
    db: Session,
    class_name: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> list[AttendanceStats]:
    """
    Aggregate attendance per student using Pandas.

    Parameters
    ----------
    db         : SQLAlchemy session
    class_name : Optional class filter (e.g. "CS-A")
    from_date  : Optional start date filter
    to_date    : Optional end date filter (defaults to today)

    Returns
    -------
    List of AttendanceStats sorted by attendance_pct ascending (worst first).
    """
    to_date = to_date or date.today()
    from_date = from_date or (to_date - timedelta(weeks=16))  # ~4 months default

    # ── Fetch data ─────────────────────────────────────────────────────────────
    student_q = db.query(Student).filter(Student.is_enrolled == True)
    if class_name:
        student_q = student_q.filter(Student.class_name == class_name)
    students = student_q.all()

    if not students:
        return []

    student_ids = [s.id for s in students]

    att_q = (
        db.query(Attendance)
        .filter(
            Attendance.student_id.in_(student_ids),
            Attendance.attendance_date >= from_date,
            Attendance.attendance_date <= to_date,
        )
        .all()
    )

    # ── Build DataFrames ───────────────────────────────────────────────────────
    students_df = pd.DataFrame(
        [
            {
                "student_id": s.id,
                "name": s.name,
                "roll_no": s.roll_no,
                "class_name": s.class_name,
            }
            for s in students
        ]
    )

    if att_q:
        att_df = pd.DataFrame(
            [
                {
                    "student_id": a.student_id,
                    "session_id": a.session_id,
                    "attendance_date": a.attendance_date,
                    "is_present": a.is_present,
                }
                for a in att_q
            ]
        )
        # One record per (student, session_id) — take the best (is_present = True wins)
        att_df = att_df.sort_values("is_present", ascending=False).drop_duplicates(
            subset=["student_id", "session_id"]
        )
        # Count total unique sessions
        total_sessions = att_df["session_id"].nunique()
        # Count present per student
        present_df = (
            att_df[att_df["is_present"] == True]
            .groupby("student_id")
            .size()
            .reset_index(name="present_count")
        )
    else:
        total_sessions = 0
        present_df = pd.DataFrame(columns=["student_id", "present_count"])

    # ── Merge and compute percentages ──────────────────────────────────────────
    merged = students_df.merge(present_df, on="student_id", how="left")
    merged["present_count"] = merged["present_count"].fillna(0).astype(int)
    merged["total_sessions"] = total_sessions
    merged["absent_count"] = merged["total_sessions"] - merged["present_count"]
    merged["attendance_pct"] = (
        (merged["present_count"] / merged["total_sessions"].replace(0, 1)) * 100
    ).round(2)

    threshold = settings.mse_eligibility_threshold
    at_risk_threshold = threshold - 10.0

    merged["is_eligible"] = merged["attendance_pct"] >= threshold
    merged["is_at_risk"] = (
        (merged["attendance_pct"] >= at_risk_threshold)
        & (merged["attendance_pct"] < threshold)
    )

    # Sort worst first
    merged = merged.sort_values("attendance_pct", ascending=True)

    return [
        AttendanceStats(
            student_id=int(row["student_id"]),
            name=row["name"],
            roll_no=row["roll_no"],
            class_name=row["class_name"],
            total_sessions=int(row["total_sessions"]),
            present_count=int(row["present_count"]),
            absent_count=int(row["absent_count"]),
            attendance_pct=float(row["attendance_pct"]),
            is_eligible=bool(row["is_eligible"]),
            is_at_risk=bool(row["is_at_risk"]),
        )
        for _, row in merged.iterrows()
    ]


def get_attendance_trend(
    db: Session,
    weeks: int = 8,
    class_name: Optional[str] = None,
) -> list[dict]:
    """
    Return weekly attendance percentage for use in a Recharts line chart.
    Output: [{"week": "2024-W10", "attendance_pct": 72.5}, …]
    """
    today = date.today()
    from_date = today - timedelta(weeks=weeks)

    student_q = db.query(Student).filter(Student.is_enrolled == True)
    if class_name:
        student_q = student_q.filter(Student.class_name == class_name)
    student_ids = [s.id for s in student_q.all()]

    if not student_ids:
        return []

    att_records = (
        db.query(Attendance)
        .filter(
            Attendance.student_id.in_(student_ids),
            Attendance.attendance_date >= from_date,
        )
        .all()
    )

    if not att_records:
        return []

    df = pd.DataFrame(
        [
            {
                "student_id": a.student_id,
                "session_id": a.session_id,
                "attendance_date": pd.to_datetime(a.attendance_date),
                "is_present": a.is_present,
            }
            for a in att_records
        ]
    )

    # Deduplicate per (student, session)
    df = df.sort_values("is_present", ascending=False).drop_duplicates(
        subset=["student_id", "session_id"]
    )
    df["week"] = df["attendance_date"].dt.strftime("W%W")
    df["year_week"] = df["attendance_date"].dt.strftime("%Y-W%W")

    # Sessions per week
    sessions_per_week = df.drop_duplicates(subset=["session_id", "year_week"])[
        "year_week"
    ].value_counts().to_dict()

    present_per_week = (
        df[df["is_present"] == True]
        .groupby("year_week")["student_id"]
        .count()
        .to_dict()
    )

    result = []
    for yw, total_sess in sorted(sessions_per_week.items()):
        n_students = len(student_ids)
        max_possible = total_sess * n_students
        present = present_per_week.get(yw, 0)
        pct = round((present / max_possible * 100) if max_possible else 0, 1)
        result.append({"week": yw, "attendance_pct": pct, "sessions": total_sess})

    return result


def get_class_summary(db: Session) -> list[dict]:
    """
    Return per-class attendance summary for a bar chart.
    Output: [{"class_name": "CS-A", "attendance_pct": 78.2, "student_count": 12}, …]
    """
    classes = [
        r[0]
        for r in db.query(Student.class_name)
        .filter(Student.is_enrolled == True)
        .distinct()
        .all()
    ]
    result = []
    for cn in classes:
        stats = compute_attendance_stats(db, class_name=cn)
        if stats:
            avg_pct = sum(s.attendance_pct for s in stats) / len(stats)
            result.append(
                {
                    "class_name": cn,
                    "attendance_pct": round(avg_pct, 1),
                    "student_count": len(stats),
                    "eligible_count": sum(1 for s in stats if s.is_eligible),
                    "at_risk_count": sum(1 for s in stats if s.is_at_risk),
                }
            )
    return sorted(result, key=lambda x: x["class_name"])
