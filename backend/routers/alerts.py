"""
routers/alerts.py — SMS alert history endpoints.

GET /alerts               → All alerts (newest first)
GET /alerts/student/{id}  → Alerts for a specific student
POST /alerts/trigger      → Manually trigger alerts for at-risk and not-eligible students
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.database import get_db
from backend.models.alert import Alert
from backend.models.student import Student
from backend.routers.auth import get_current_faculty
from backend.schemas.attendance import AlertOut
from backend.services.analytics_service import compute_attendance_stats
from backend.services.sms.factory import get_sms_provider

router = APIRouter(prefix="/alerts", tags=["alerts"])
logger = logging.getLogger(__name__)
settings = get_settings()


def _alert_to_out(alert: Alert, db: Session) -> AlertOut:
    student = db.query(Student).filter(Student.id == alert.student_id).first()
    return AlertOut(
        id=alert.id,
        student_id=alert.student_id,
        student_name=student.name if student else "Unknown",
        phone_number=alert.phone_number,
        message=alert.message,
        provider=alert.provider,
        status=alert.status,
        alert_type=alert.alert_type,
        sent_at=alert.sent_at,
    )


@router.get("", response_model=list[AlertOut])
def list_alerts(
    limit: int = 50,
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """Return the most recent SMS alerts."""
    alerts = (
        db.query(Alert)
        .order_by(Alert.sent_at.desc())
        .limit(limit)
        .all()
    )
    return [_alert_to_out(a, db) for a in alerts]


@router.get("/student/{student_id}", response_model=list[AlertOut])
def student_alerts(
    student_id: int,
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """Return all alerts for a specific student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    alerts = (
        db.query(Alert)
        .filter(Alert.student_id == student_id)
        .order_by(Alert.sent_at.desc())
        .all()
    )
    return [_alert_to_out(a, db) for a in alerts]


@router.post("/trigger", status_code=202)
def trigger_alerts(
    class_name: Optional[str] = None,
    db: Session = Depends(get_db),
    _faculty=Depends(get_current_faculty),
):
    """
    Manually trigger SMS alerts for all at-risk and not-eligible students.
    At Risk message differs from Not Eligible message.
    Returns a summary of alerts sent.
    """
    stats = compute_attendance_stats(db, class_name=class_name)
    provider = get_sms_provider()
    eligible_threshold = settings.attendance_cutoff + settings.at_risk_margin
    alerts_sent = 0
    failed = 0

    for s in stats:
        if s.status == "eligible":
            continue

        student = db.query(Student).filter(Student.id == s.student_id).first()
        if not student:
            continue

        if s.status == "not_eligible":
            alert_type = "not_eligible"
            msg = (
                f"URGENT — Dear Parent, {student.name} ({student.roll_no}) "
                f"has {s.attendance_pct:.1f}% attendance — below the "
                f"{settings.attendance_cutoff:.0f}% minimum cutoff. "
                f"They are NOT ELIGIBLE for MSE. Contact the college immediately."
            )
        else:  # at_risk
            alert_type = "at_risk"
            msg = (
                f"WARNING — Dear Parent, {student.name} ({student.roll_no}) "
                f"has {s.attendance_pct:.1f}% attendance. "
                f"They need at least {eligible_threshold:.0f}% to be eligible for MSE. "
                f"Please encourage regular attendance to avoid losing eligibility."
            )

        response = provider.send(student.parent_phone, msg)
        alert_log = Alert(
            student_id=student.id,
            phone_number=student.parent_phone,
            message=msg,
            provider=provider.name,
            status="sent" if response.get("success") else "failed",
            provider_response=str(response),
            alert_type=alert_type,
        )
        db.add(alert_log)
        if response.get("success"):
            alerts_sent += 1
        else:
            failed += 1

    db.commit()
    return {
        "message": f"Alerts triggered. Sent: {alerts_sent}, Failed: {failed}.",
        "sent": alerts_sent,
        "failed": failed,
        "provider": provider.name,
    }
