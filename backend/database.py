"""
database.py — SQLAlchemy async-compatible engine, session factory, and Base.
All models import Base from here; all routes use get_db() as a dependency.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from backend.config import get_settings

settings = get_settings()

# SQLite: enforce foreign keys (disabled by default in SQLite)
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=settings.app_env == "development",
)


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


def get_db():
    """FastAPI dependency: yields a database session and ensures it is closed."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables on startup (idempotent)."""
    # Import models so SQLAlchemy registers them before create_all
    from backend.models import student, attendance, alert, faculty, subject, session  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Lightweight migration for existing SQLite DB: add password_hash column if missing
    with engine.connect() as conn:
        try:
            result = conn.exec_driver_sql("PRAGMA table_info(students)").fetchall()
            col_names = [r[1] for r in result]
            if "password_hash" not in col_names:
                conn.exec_driver_sql("ALTER TABLE students ADD COLUMN password_hash VARCHAR(128)")
                conn.commit()
        except Exception:
            pass
