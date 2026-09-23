# backend/models/__init__.py
from backend.models.student import Student
from backend.models.attendance import Attendance
from backend.models.faculty import Faculty
from backend.models.alert import Alert
from backend.models.subject import Subject, ClassSchedule

__all__ = ["Student", "Attendance", "Faculty", "Alert", "Subject", "ClassSchedule"]
