import logging
import os
import threading
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from alembic.config import Config as AlembicConfig
from alembic import command as alembic_command
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import SessionLocal, engine, Base
from app.models import Job, JobAnalysis  # noqa: F401 — register models with Base
from app.routers.jobs import router as jobs_router
from app.workers.ingest import run_ingestion, run_parser

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


def run_migrations() -> None:
    logger.info("[startup 1/4] Running database migrations...")
    try:
        cfg = AlembicConfig("alembic.ini")
        alembic_command.upgrade(cfg, "head")
        logger.info("[startup 1/4] Alembic migrations complete")
    except Exception:
        logger.exception("[startup 1/4] Alembic migration failed — falling back to create_all")

    logger.info("[startup 1/4] Ensuring all tables exist via create_all...")
    Base.metadata.create_all(bind=engine)
    logger.info("[startup 1/4] Tables ready")


def scheduled_ingest():
    db = SessionLocal()
    try:
        logger.info("Scheduled ingestion starting...")
        run_ingestion(db)
        run_parser(db, limit=50)
    except Exception:
        logger.exception("Ingestion failed")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[startup] === JobLens starting ===")

    run_migrations()

    logger.info("[startup 2/4] Starting background scheduler...")
    scheduler = BackgroundScheduler()
    scheduler.add_job(scheduled_ingest, "interval", hours=8, id="ingest")
    scheduler.start()
    logger.info("[startup 2/4] Scheduler running — ingestion every 8 hours")

    logger.info("[startup 3/4] Launching initial ingestion thread...")
    threading.Thread(target=scheduled_ingest, daemon=True).start()
    logger.info("[startup 3/4] Ingestion thread launched (runs in background)")

    logger.info("[startup 4/4] === JobLens ready — accepting requests ===")
    yield

    logger.info("[shutdown] Stopping scheduler...")
    scheduler.shutdown()
    logger.info("[shutdown] Done")


app = FastAPI(title="JobLens API", lifespan=lifespan)

_cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs_router)


@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}
