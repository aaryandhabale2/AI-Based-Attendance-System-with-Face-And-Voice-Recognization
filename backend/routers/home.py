"""
routers/home.py — Home dashboard data endpoints (all require JWT).

GET /home/summary   → 4 stat cards + MSE eligibility breakdown
GET /home/trend     → Daily attendance % for area chart (7/30/semester days)
GET /home/subjects  → Subject-wise attendance % progress bars
GET /home/schedule  → Today's + upcoming class schedule
GET /home/activity  → Recent events (attendance, enrolment, alert, flagged)
GET /home/report    → Weekly attendance donut (Present / Absent / Late)
"""

import logging
from datetime import date, datetime, timedelta, timezone, time as dtime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.database import get_db
from backend.models.attendance import Attendance
from backend.models.student import Student
from backend.models.alert import Alert
from backend.models.subject import Subject, ClassSchedule
from backend.routers.auth import get_current_faculty
from backend.services.analytics_service import (
    compute_attendance_stats,
    get_eligibility_status,
)

router = APIRouter(prefix="/home", tags=["home"])
logger = logging.getLogger(__name__)
settings = get_settings()

# ─────────────────────────────────────────────────────────────────────────────
# HELPER — compute attendance % over a date range for a set of students
# ─────────────────────────────────────────────────────────────────────────────

def _pct_in_range(
    db: Session,
    from_date: date,
    to_date: date,
) -> float:
    """Return overall present % across all students in [from_date, to_date]."""
    total = (
        db.query(Attendance)
        .filter(
            Attendance.attendance_date >= from_date,
            Attendance.attendance_date <= to_date,
            Attendance.is_flagged == False,
        )
        .count()
    )
    present = (
        db.query(Attendance)
        .filter(
            Attendance.attendance_date >= from_date,
            Attendance.attendance_date <= to_date,
            Attendance.is_present == True,
        )
        .count()
    )
    return round((present / total * 100) if total else 0.0, 1)


# ─────────────────────────────────────────────────────────────────────────────
# 1. SUMMARY — 4 stat cards
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/summary")
def home_summary(
    db: Session = Depends(get_db),
    faculty=Depends(get_current_faculty),
):
    """
    Returns everything needed for the top stat cards and MSE eligibility panel.
    """
    today = date.today()
    last_week_start = today - timedelta(days=7)
    two_weeks_ago   = today - timedelta(days=14)

    # ── Student counts ──────────────────────────────────────────────────────
    total_students = db.query(Student).filter(Student.is_enrolled == True).count()

    # ── Overall attendance % + last-week delta ──────────────────────────────
    stats = compute_attendance_stats(db)
    avg_pct_now  = round(sum(s.attendance_pct for s in stats) / len(stats), 1) if stats else 0.0

    pct_last_week = _pct_in_range(db, two_weeks_ago, last_week_start)
    pct_this_week = _pct_in_range(db, last_week_start, today)
    delta_pct = round(pct_this_week - pct_last_week, 1) if pct_last_week else None

    # ── MSE eligibility breakdown ──────────────────────────────────────────
    eligible     = sum(1 for s in stats if s.status == "eligible")
    at_risk      = sum(1 for s in stats if s.status == "at_risk")
    not_eligible = sum(1 for s in stats if s.status == "not_eligible")
    needs_attention = at_risk + not_eligible

    # ── Today's sessions (classes) ─────────────────────────────────────────
    today_dow = today.weekday()
    total_classes_today = (
        db.query(ClassSchedule)
        .filter(ClassSchedule.day_of_week == today_dow)
        .count()
    )
    # "Completed" = sessions where at least one attendance record exists today
    completed_sessions = (
        db.query(Attendance.session_id)
        .filter(Attendance.attendance_date == today)
        .distinct()
        .count()
    )

    return {
        "total_students":       total_students,
        "total_classes_today":  total_classes_today,
        "completed_today":      min(completed_sessions, total_classes_today),
        "average_attendance_pct": avg_pct_now,
        "attendance_delta":     delta_pct,      # None if not computable
        "needs_attention":      needs_attention,
        "eligible_count":       eligible,
        "at_risk_count":        at_risk,
        "not_eligible_count":   not_eligible,
        "attendance_cutoff":    settings.attendance_cutoff,
        "at_risk_margin":       settings.at_risk_margin,
        "eligible_threshold":   settings.attendance_cutoff + settings.at_risk_margin,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. TREND — daily attendance % for area chart
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/trend")
def home_trend(
    days: int = Query(7, ge=1, le=365, description="7, 30, or 112 for semester"),
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """
    Returns one data point per day with attendance % for the Recharts AreaChart.
    Output: [{"date": "Mon\\n15 Sep", "pct": 82.5}, …]
    """
    today = date.today()
    from_date = today - timedelta(days=days - 1)

    records = (
        db.query(Attendance)
        .filter(
            Attendance.attendance_date >= from_date,
            Attendance.attendance_date <= today,
            Attendance.is_flagged == False,
        )
        .all()
    )

    # Group by date
    from collections import defaultdict
    by_date: dict[date, list[Attendance]] = defaultdict(list)
    for rec in records:
        by_date[rec.attendance_date].append(rec)

    result = []
    cursor = from_date
    while cursor <= today:
        day_recs = by_date.get(cursor, [])
        total   = len(day_recs)
        present = sum(1 for r in day_recs if r.is_present)
        pct     = round((present / total * 100) if total else 0.0, 1)

        # Format label to match mockup: "Mon\n15 Sep"
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        label = f"{day_names[cursor.weekday()]}\n{cursor.day} {cursor.strftime('%b')}"

        result.append({
            "date":    cursor.isoformat(),
            "label":   label,
            "pct":     pct,
            "present": present,
            "total":   total,
        })
        cursor += timedelta(days=1)

    return result


# ─────────────────────────────────────────────────────────────────────────────
# 3. SUBJECTS — subject-wise attendance %
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/subjects")
def home_subjects(
    class_name: Optional[str] = None,
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """
    Returns subject-wise attendance % computed from real attendance records.

    Strategy: Session IDs that begin with "{SUBJECT_CODE}_" are linked to
    the subject directly.  Session IDs without a subject prefix are split
    proportionally across the total sessions for that class.
    """
    subjects = db.query(Subject).all()
    if class_name:
        subjects = [s for s in subjects if s.class_name == class_name]

    result = []
    for subj in subjects:
        # Find attendance records whose session_id starts with the subject code
        prefix = f"{subj.code}_"
        subj_records = (
            db.query(Attendance)
            .join(Student, Attendance.student_id == Student.id)
            .filter(
                Student.class_name == subj.class_name,
                Attendance.session_id.like(f"{prefix}%"),
                Attendance.is_flagged == False,
            )
            .all()
        )

        if subj_records:
            total   = len(subj_records)
            present = sum(1 for r in subj_records if r.is_present)
            pct     = round(present / total * 100, 1)
        else:
            # Fallback: use overall class attendance %
            class_stats = compute_attendance_stats(db, class_name=subj.class_name)
            if class_stats:
                pct = round(sum(s.attendance_pct for s in class_stats) / len(class_stats), 1)
            else:
                pct = 0.0

        result.append({
            "subject_id":  subj.id,
            "code":        subj.code,
            "name":        subj.name,
            "class_name":  subj.class_name,
            "attendance_pct": pct,
            "color":       subj.color or "#6D4AE8",
            "data_source": "real" if subj_records else "class_average_fallback",
        })

    # Sort by attendance_pct descending (best first, as in mockup)
    result.sort(key=lambda x: x["attendance_pct"], reverse=True)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# 4. SCHEDULE — upcoming classes
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/schedule")
def home_schedule(
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """
    Returns upcoming class schedule for the next 7 days,
    starting from today.  Used for the Upcoming Classes list.
    """
    today = date.today()
    now   = datetime.now()

    schedules = (
        db.query(ClassSchedule)
        .join(Subject, ClassSchedule.subject_id == Subject.id)
        .all()
    )

    result = []
    for sched in schedules:
        # Find next occurrence (within next 7 days)
        for offset in range(7):
            check_date = today + timedelta(days=offset)
            if check_date.weekday() == sched.day_of_week:
                # Build session datetime
                session_dt = datetime(
                    check_date.year, check_date.month, check_date.day,
                    sched.start_time.hour, sched.start_time.minute
                )
                # Skip sessions that already ended today
                session_end_dt = datetime(
                    check_date.year, check_date.month, check_date.day,
                    sched.end_time.hour, sched.end_time.minute
                )
                if check_date == today and session_end_dt < now:
                    continue

                session_id = (
                    f"{sched.subject.code}_{sched.subject.class_name}_"
                    f"{check_date.isoformat()}_{sched.start_time.strftime('%H-%M')}"
                )
                result.append({
                    "schedule_id":  sched.id,
                    "subject_id":   sched.subject_id,
                    "subject_code": sched.subject.code,
                    "subject_name": sched.subject.name,
                    "class_name":   sched.subject.class_name,
                    "date":         check_date.isoformat(),
                    "day_name":     sched.day_name,
                    "start_time":   sched.start_time.strftime("%I:%M %p"),
                    "end_time":     sched.end_time.strftime("%I:%M %p"),
                    "room":         sched.room,
                    "session_id":   session_id,
                    "is_today":     check_date == today,
                    "color":        sched.subject.color or "#6D4AE8",
                })
                break  # Only next occurrence per schedule

    # Sort by date then start_time
    result.sort(key=lambda x: (x["date"], x["start_time"]))
    return result[:10]  # Return max 10 upcoming


# ─────────────────────────────────────────────────────────────────────────────
# 5. ACTIVITY — recent events
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/activity")
def home_activity(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """
    Returns last `limit` real events from the system:
      - Attendance marked (present)
      - Attendance flagged (security events)
      - Student enrolled
      - SMS alert sent
    """
    events = []

    # Attendance marked
    att_records = (
        db.query(Attendance)
        .filter(Attendance.is_present == True)
        .order_by(Attendance.marked_at.desc())
        .limit(limit)
        .all()
    )
    for a in att_records:
        name = a.student.name if a.student else "Unknown"
        events.append({
            "type":      "attendance",
            "icon":      "check",
            "color":     "#22C55E",
            "title":     f"Attendance marked for {a.session_label or a.session_id}",
            "subtitle":  name,
            "timestamp": a.marked_at.isoformat(),
        })

    # Flagged events
    flagged = (
        db.query(Attendance)
        .filter(Attendance.is_flagged == True)
        .order_by(Attendance.marked_at.desc())
        .limit(limit)
        .all()
    )
    for a in flagged:
        reason_label = (a.flag_reason or "security_event").replace("_", " ").title()
        events.append({
            "type":      "flagged",
            "icon":      "alert",
            "color":     "#EF4444",
            "title":     f"Flagged attempt: {reason_label}",
            "subtitle":  a.student.name if a.student else "Unknown face",
            "timestamp": a.marked_at.isoformat(),
        })

    # Enrolled students (use created_at if available, else skip)
    students = (
        db.query(Student)
        .filter(Student.is_enrolled == True)
        .order_by(Student.id.desc())
        .limit(limit)
        .all()
    )
    for s in students:
        events.append({
            "type":      "enroll",
            "icon":      "user-plus",
            "color":     "#3B82F6",
            "title":     f"New student joined your class ({s.class_name})",
            "subtitle":  s.name,
            "timestamp": None,  # Student model has no created_at
        })

    # Alerts sent
    alerts = (
        db.query(Alert)
        .order_by(Alert.sent_at.desc())
        .limit(limit)
        .all()
    )
    for al in alerts:
        events.append({
            "type":      "alert",
            "icon":      "bell",
            "color":     "#F59E0B",
            "title":     f"Low attendance alert sent ({al.alert_type})",
            "subtitle":  al.student_name if hasattr(al, "student_name") else "—",
            "timestamp": al.sent_at.isoformat() if al.sent_at else None,
        })

    # Sort by timestamp (None last), return top N
    def sort_key(e):
        ts = e["timestamp"]
        return ts if ts else "0000-00-00T00:00:00"

    events.sort(key=sort_key, reverse=True)
    return events[:limit]


# ─────────────────────────────────────────────────────────────────────────────
# 6. REPORT — weekly donut (Present / Absent / Late)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/report")
def home_report(
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """
    Returns weekly attendance counts for the donut chart:
      present, absent, late, total, week_label
    'Late' = marked_at > (session start + late_after_minutes).
    Since most existing records don't have a linked schedule, Late is computed
    by comparing marked_at against a nominal 09:00 session start unless the
    session_id embeds a time component.
    """
    today = date.today()
    week_start = today - timedelta(days=today.weekday())   # Monday
    week_end   = week_start + timedelta(days=6)            # Sunday

    records = (
        db.query(Attendance)
        .filter(
            Attendance.attendance_date >= week_start,
            Attendance.attendance_date <= week_end,
            Attendance.is_flagged == False,
        )
        .all()
    )

    late_threshold_minutes = settings.late_after_minutes
    present = 0
    absent  = 0
    late    = 0

    for rec in records:
        if not rec.is_present:
            absent += 1
            continue

        # Try to determine session start from session_id (format CODE_CLASS_DATE_HH-MM)
        parts = rec.session_id.split("_")
        session_start_hour, session_start_min = 9, 0
        if len(parts) >= 4:
            time_part = parts[-1]  # e.g. "10-00"
            try:
                h, m = time_part.split("-")
                session_start_hour, session_start_min = int(h), int(m)
            except ValueError:
                pass  # Use default 09:00

        session_start_dt = datetime(
            rec.attendance_date.year,
            rec.attendance_date.month,
            rec.attendance_date.day,
            session_start_hour,
            session_start_min,
        )

        late_cutoff = session_start_dt + timedelta(minutes=late_threshold_minutes)
        if rec.marked_at and rec.marked_at.replace(tzinfo=None) > late_cutoff:
            late += 1
        else:
            present += 1

    total = present + absent + late
    week_label = f"Weekly report ({week_start.strftime('%d %b')} – {week_end.strftime('%d %b')})"

    present_pct = round(present / total * 100) if total else 0
    absent_pct  = round(absent  / total * 100) if total else 0
    late_pct    = round(late    / total * 100) if total else 0

    return {
        "present":      present,
        "absent":       absent,
        "late":         late,
        "total":        total,
        "present_pct":  present_pct,
        "absent_pct":   absent_pct,
        "late_pct":     late_pct,
        "week_label":   week_label,
        "week_start":   week_start.isoformat(),
        "week_end":     week_end.isoformat(),
    }
