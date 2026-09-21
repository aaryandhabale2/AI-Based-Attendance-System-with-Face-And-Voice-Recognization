"""
seed.py — Realistic demo data seed script.

Creates:
  - 2 superadmin faculty accounts
  - 3 regular faculty accounts
  - 35 students across 3 classes (CS-A, CS-B, IT-A)
  - 9 weeks of attendance data (Mon–Sat, 2 sessions/day)
  - Realistic patterns: some students always present, some at-risk, some absent
  - SMS alerts for at-risk/ineligible students

Run with:
  python -m backend.seed
  (from the project root, with the virtual env active)
"""

import random
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# Ensure project root is on sys.path when run as __main__
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database import init_db, SessionLocal
from backend.models.faculty import Faculty
from backend.models.student import Student
from backend.models.attendance import Attendance
from backend.models.alert import Alert
from backend.routers.auth import hash_password

# ── Constants ─────────────────────────────────────────────────────────────────
random.seed(42)

CLASSES = ["CS-A", "CS-B", "IT-A"]

STUDENT_NAMES = [
    "Aarav Sharma", "Ananya Patel", "Rohan Verma", "Priya Singh", "Karan Mehta",
    "Sneha Joshi", "Arjun Gupta", "Divya Nair", "Vivek Kumar", "Pooja Yadav",
    "Rahul Desai", "Meera Pillai", "Aditya Mishra", "Kavya Reddy", "Siddharth Jain",
    "Riya Srivastava", "Nikhil Bhat", "Tanvi Pandey", "Varun Tiwari", "Ishaan Chopra",
    "Shruti Saxena", "Mohit Dubey", "Nisha Agarwal", "Deepak Rao", "Anjali Khanna",
    "Pranav Malhotra", "Sunita Iyer", "Rajesh Nambiar", "Komal Shah", "Gaurav Tripathi",
    "Pallavi Dixit", "Harsh Bhatt", "Rekha Menon", "Sameer Ahuja", "Lakshmi Pillai",
]

FACULTY_DATA = [
    {"username": "admin",    "full_name": "Dr. Suresh Kumar",      "department": "Computer Science", "is_superadmin": True,  "password": "admin123"},
    {"username": "hod",      "full_name": "Prof. Anita Sharma",    "department": "Information Tech", "is_superadmin": True,  "password": "hod123"},
    {"username": "prof_cs",  "full_name": "Dr. Rajiv Menon",       "department": "Computer Science", "is_superadmin": False, "password": "prof123"},
    {"username": "prof_it",  "full_name": "Ms. Pritha Das",        "department": "Information Tech", "is_superadmin": False, "password": "prof123"},
    {"username": "exam",     "full_name": "Mr. Sanjay Kulkarni",   "department": "Examinations",     "is_superadmin": False, "password": "exam123"},
]

# Attendance patterns — each student gets a "base probability" of being present
# Ranges: 0.90+ (consistent), 0.70-0.89 (average), 0.50-0.69 (at-risk), 0.30-0.49 (ineligible)
PATTERNS = (
    [0.95] * 8 +      # 8 students always present
    [0.85] * 8 +      # 8 students good attendance
    [0.72] * 7 +      # 7 students average
    [0.58] * 7 +      # 7 students at-risk
    [0.40] * 5        # 5 students not eligible
)


def _make_sessions(weeks: int = 9) -> list[tuple[date, str, str]]:
    """Generate (date, session_id, session_label) tuples for the past N weeks."""
    sessions = []
    today = date.today()
    start = today - timedelta(weeks=weeks)
    current = start
    while current <= today:
        # Monday–Saturday (skip Sunday = weekday 6)
        if current.weekday() < 6:
            date_str = current.strftime("%Y-%m-%d")
            sessions.append((
                current,
                f"MORNING_{date_str}",
                f"Morning Session {date_str}",
            ))
            sessions.append((
                current,
                f"AFTERNOON_{date_str}",
                f"Afternoon Session {date_str}",
            ))
        current += timedelta(days=1)
    return sessions


def seed() -> None:
    print("[SEED] Seeding demo data ...")
    init_db()
    db = SessionLocal()

    try:
        # ── 1. Faculty ─────────────────────────────────────────────────────────
        for fd in FACULTY_DATA:
            if not db.query(Faculty).filter(Faculty.username == fd["username"]).first():
                f = Faculty(
                    username=fd["username"],
                    full_name=fd["full_name"],
                    department=fd["department"],
                    hashed_password=hash_password(fd["password"]),
                    is_superadmin=fd["is_superadmin"],
                    is_active=True,
                )
                db.add(f)
        db.flush()
        print(f"  [OK] {len(FACULTY_DATA)} faculty accounts ready.")

        # ── 2. Students ────────────────────────────────────────────────────────
        students = []
        existing_rolls = {s.roll_no for s in db.query(Student).all()}
        class_cycle = [CLASSES[i % len(CLASSES)] for i in range(len(STUDENT_NAMES))]
        roll_prefix = {"CS-A": "CSA", "CS-B": "CSB", "IT-A": "ITA"}
        roll_counters = {c: 1 for c in CLASSES}

        for i, (name, cls) in enumerate(zip(STUDENT_NAMES, class_cycle)):
            roll = f"{roll_prefix[cls]}{roll_counters[cls]:03d}"
            roll_counters[cls] += 1
            if roll in existing_rolls:
                s = db.query(Student).filter(Student.roll_no == roll).first()
            else:
                # Fake 512-d face embedding (unit vector)
                face_emb = [random.gauss(0, 1) for _ in range(512)]
                norm = sum(x**2 for x in face_emb) ** 0.5
                face_emb = [x / norm for x in face_emb]

                # Fake 256-d voice embedding
                voice_emb = [random.gauss(0, 1) for _ in range(256)]
                norm = sum(x**2 for x in voice_emb) ** 0.5
                voice_emb = [x / norm for x in voice_emb]

                s = Student(
                    name=name,
                    roll_no=roll,
                    class_name=cls,
                    parent_phone=f"9{random.randint(100000000, 999999999)}",
                    is_enrolled=True,
                    enrolled_at=datetime.now(timezone.utc) - timedelta(days=random.randint(60, 90)),
                )
                s.set_face_embedding(face_emb)
                s.set_voice_embedding(voice_emb)
                db.add(s)
                existing_rolls.add(roll)
            students.append((s, PATTERNS[i]))

        db.flush()
        print(f"  [OK] {len(STUDENT_NAMES)} students ready.")

        # ── 3. Attendance ──────────────────────────────────────────────────────
        sessions = _make_sessions(weeks=9)
        new_records = 0
        existing_sess = {
            (a.student_id, a.session_id)
            for a in db.query(Attendance.student_id, Attendance.session_id).all()
        }

        for att_date, session_id, session_label in sessions:
            for s_obj, prob in students:
                student = db.query(Student).filter(Student.roll_no == s_obj.roll_no).first()
                if not student:
                    continue
                key = (student.id, session_id)
                if key in existing_sess:
                    continue

                is_present = random.random() < prob
                face_score = round(random.uniform(0.55, 0.95) if is_present else random.uniform(0.10, 0.40), 4)
                voice_score = round(random.uniform(0.78, 0.98) if is_present else random.uniform(0.30, 0.65), 4)

                record = Attendance(
                    student_id=student.id,
                    session_id=session_id,
                    session_label=session_label,
                    face_score=face_score,
                    voice_score=voice_score,
                    is_present=is_present,
                    is_flagged=False,
                    attendance_date=att_date,
                    marked_at=datetime.combine(att_date, datetime.min.time()).replace(tzinfo=timezone.utc),
                )
                db.add(record)
                existing_sess.add(key)
                new_records += 1

        db.flush()
        print(f"  [OK] {new_records} attendance records created across {len(sessions)} sessions.")

        # ── 4. Alerts for at-risk students ────────────────────────────────────
        from backend.services.analytics_service import compute_attendance_stats
        stats = compute_attendance_stats(db)
        alert_count = 0
        for stat in stats:
            if stat.is_at_risk or not stat.is_eligible:
                student = db.query(Student).filter(Student.id == stat.student_id).first()
                if not student:
                    continue
                alert_type = "below_threshold" if not stat.is_eligible else "at_risk"
                msg = (
                    f"Dear Parent, your ward {student.name} ({student.roll_no}) "
                    f"has attendance of {stat.attendance_pct:.1f}%. "
                    f"{'Not eligible for MSE.' if not stat.is_eligible else 'At risk of becoming ineligible.'} "
                    f"Please contact the college."
                )
                alert = Alert(
                    student_id=student.id,
                    phone_number=student.parent_phone,
                    message=msg,
                    provider="mock",
                    status="sent",
                    provider_response='{"success": true, "provider": "mock"}',
                    alert_type=alert_type,
                    sent_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 7)),
                )
                db.add(alert)
                alert_count += 1

        db.commit()
        print(f"  [OK] {alert_count} demo alerts created.")
        print("\n[DONE] Seed complete! Dashboard is ready with 9 weeks of realistic data.")
        print("   Faculty logins:")
        for fd in FACULTY_DATA:
            role = "Superadmin" if fd["is_superadmin"] else "Faculty"
            print(f"     [{role}] username: {fd['username']:12s} password: {fd['password']}")

    except Exception as exc:
        db.rollback()
        print(f"[FAIL] Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
