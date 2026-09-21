"""
scheduler.py — APScheduler background jobs.

Jobs:
  - weekly_aggregation : Runs every Sunday at midnight.
    Aggregates attendance per student, recalculates MSE eligibility,
    and fires SMS alerts for at-risk students.
"""

import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def _weekly_aggregation_job() -> None:
    """Aggregate attendance and send at-risk / not-eligible alerts (runs weekly)."""
    logger.info("[Scheduler] Running weekly attendance aggregation …")
    try:
        from backend.database import SessionLocal
        from backend.services.analytics_service import compute_attendance_stats
        from backend.services.sms.factory import get_sms_provider

        db = SessionLocal()
        try:
            stats = compute_attendance_stats(db)
            provider = get_sms_provider()
            alerts_sent = 0
            for s in stats:
                if s.status == "eligible":
                    continue  # no alert needed

                from backend.models.student import Student
                from backend.models.alert import Alert

                student = db.query(Student).filter(Student.id == s.student_id).first()
                if not student:
                    continue

                if s.status == "not_eligible":
                    alert_type = "not_eligible"
                    msg = (
                        f"URGENT — Dear Parent, your ward {student.name} ({student.roll_no}) "
                        f"has attendance of {s.attendance_pct:.1f}%, which is BELOW the minimum "
                        f"required {int(student.__class__.__name__) if False else '55'}%. "
                        f"They are NOT ELIGIBLE for Mid-Semester Examination (MSE). "
                        f"Please contact the college immediately."
                    )
                    # Simpler: build from config
                    from backend.config import get_settings
                    cfg = get_settings()
                    msg = (
                        f"URGENT — Dear Parent, {student.name} ({student.roll_no}) "
                        f"has {s.attendance_pct:.1f}% attendance — below the {cfg.attendance_cutoff:.0f}% cutoff. "
                        f"They are NOT ELIGIBLE for MSE. Contact the college immediately."
                    )
                else:  # at_risk
                    alert_type = "at_risk"
                    from backend.config import get_settings
                    cfg = get_settings()
                    eligible_threshold = cfg.attendance_cutoff + cfg.at_risk_margin
                    msg = (
                        f"WARNING — Dear Parent, {student.name} ({student.roll_no}) "
                        f"has {s.attendance_pct:.1f}% attendance. "
                        f"They need at least {eligible_threshold:.0f}% to remain eligible for MSE. "
                        f"Please encourage regular attendance."
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
                alerts_sent += 1
            db.commit()
            logger.info(f"[Scheduler] Weekly aggregation done. {alerts_sent} alerts sent.")
        finally:
            db.close()
    except Exception as exc:
        logger.error(f"[Scheduler] Weekly aggregation failed: {exc}", exc_info=True)



def start_scheduler() -> None:
    global _scheduler
    _scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
    _scheduler.add_job(
        _weekly_aggregation_job,
        trigger=CronTrigger(day_of_week="sun", hour=0, minute=0),
        id="weekly_aggregation",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("[Scheduler] Started. Next weekly run: every Sunday 00:00 IST.")


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[Scheduler] Stopped.")
