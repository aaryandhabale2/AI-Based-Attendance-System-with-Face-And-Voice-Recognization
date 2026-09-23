"""
main.py — FastAPI application entry point.

Startup sequence:
  1. init_db()     → create all tables
  2. seed_faculty  → ensure at least one superadmin exists
  3. start scheduler for weekly analytics job

Run with:
  uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.config import get_settings
from backend.database import init_db, SessionLocal
from backend.routers import auth, enrollment, attendance, dashboard, alerts, home

logger = logging.getLogger(__name__)
settings = get_settings()


def _seed_superadmin() -> None:
    """Create a default superadmin if no faculty exists in the DB."""
    from backend.models.faculty import Faculty
    from backend.routers.auth import hash_password

    db = SessionLocal()
    try:
        if db.query(Faculty).count() == 0:
            admin = Faculty(
                username="admin",
                full_name="System Administrator",
                hashed_password=hash_password("admin123"),
                is_superadmin=True,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            logger.info("Default superadmin created — username: admin, password: admin123")
            logger.warning("CHANGE THE DEFAULT PASSWORD IMMEDIATELY IN PRODUCTION!")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: setup on startup, cleanup on shutdown."""
    # ── Startup ────────────────────────────────────────────────────────────────
    logging.basicConfig(level=logging.INFO)
    logger.info("Initialising database …")
    init_db()
    _seed_superadmin()

    # Start background scheduler (imported lazily to avoid heavy import on test)
    try:
        from backend.scheduler import start_scheduler, stop_scheduler
        start_scheduler()
        logger.info("APScheduler started.")
    except Exception as exc:
        logger.warning(f"Scheduler could not start: {exc}")

    yield

    # ── Shutdown ───────────────────────────────────────────────────────────────
    try:
        from backend.scheduler import stop_scheduler
        stop_scheduler()
    except Exception:
        pass


# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Attendance System",
    description=(
        "Two-factor attendance system using Face (InsightFace/ArcFace) "
        "and Voice (Resemblyzer) recognition."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(enrollment.router)
app.include_router(attendance.router)
app.include_router(dashboard.router)
app.include_router(alerts.router)
app.include_router(home.router)


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
def health_check():
    """Liveness probe — returns OK if the server is running."""
    return {"status": "ok", "version": app.version, "env": settings.app_env}


@app.get("/", tags=["system"])
def root():
    return {"message": "AI Attendance System API", "docs": "/docs"}
