import logging
import os
import threading
from contextlib import asynccontextmanager
from alembic.config import Config as AlembicConfig
from alembic import command as alembic_command
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import SessionLocal
from app.routers.jobs import router as jobs_router
from app.workers.ingest import run_ingestion, run_parser

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


def run_migrations() -> None:
    cfg = AlembicConfig("alembic.ini")
    alembic_command.upgrade(cfg, "head")
    logger.info("Database migrations applied")


def scheduled_ingest():
    db = SessionLocal()
    try:
        logger.info("Scheduled ingestion starting...")
        run_ingestion(db)
        run_parser(db, limit=50)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()

    scheduler = BackgroundScheduler()
    scheduler.add_job(scheduled_ingest, "interval", hours=8, id="ingest")
    scheduler.start()
    logger.info("Scheduler started — ingestion every 8 hours")

    # Run initial ingestion in background so startup doesn't block the server
    threading.Thread(target=scheduled_ingest, daemon=True).start()

    yield

    scheduler.shutdown()


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
    return {"status": "ok"}
