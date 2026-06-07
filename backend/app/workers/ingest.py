import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.models import Job, JobAnalysis
from app.database import engine, SessionLocal
from app.workers.sources.greenhouse import fetch_greenhouse_jobs
from app.workers.sources.lever import fetch_lever_jobs
from app.workers.sources.ashby import fetch_ashby_jobs
from app.workers.sources.linkedin import fetch_linkedin_jobs
from app.workers.sources.remotive import fetch_remotive_jobs
from app.workers.sources.himalayas import fetch_himalayas_jobs
from app.services.parser import parse_job_description

logger = logging.getLogger(__name__)

BATCH_SIZE = 200


def run_ingestion(db: Session) -> dict:
    all_jobs = []
    for fetcher in [
        fetch_linkedin_jobs,
        fetch_remotive_jobs,
        fetch_himalayas_jobs,
        fetch_greenhouse_jobs,
        fetch_lever_jobs,
        fetch_ashby_jobs,
    ]:
        try:
            jobs = fetcher()
            all_jobs.extend(jobs)
            logger.info("%s returned %d ML jobs", fetcher.__name__, len(jobs))
        except Exception as e:
            logger.error("%s failed: %s", fetcher.__name__, e)

    # Skip jobs with no description — they can't be parsed and aren't useful
    all_jobs = [j for j in all_jobs if j.get("description", "").strip()]

    # Deduplicate within the fetched batch by id
    seen = {}
    for j in all_jobs:
        seen[j["id"]] = j
    unique_jobs = list(seen.values())

    inserted = 0
    for i in range(0, len(unique_jobs), BATCH_SIZE):
        batch = unique_jobs[i : i + BATCH_SIZE]
        stmt = (
            pg_insert(Job)
            .values(batch)
            .on_conflict_do_nothing(index_elements=["id"])
        )
        result = db.execute(stmt)
        db.commit()
        inserted += result.rowcount

    logger.info(
        "Ingestion complete: %d inserted (of %d with descriptions, %d total fetched)",
        inserted, len(unique_jobs), len(all_jobs),
    )
    return {"fetched": len(all_jobs), "with_description": len(unique_jobs), "inserted": inserted}


PARSE_WORKERS = 5  # stay comfortably under 50 req/min rate limit


def _build_analysis_data(job_id: str, result: dict) -> dict:
    from datetime import datetime
    return {
        "job_id": job_id,
        "role_summary": result.get("role_summary"),
        "seniority": result.get("seniority"),
        "ml_domain": result.get("ml_domain"),
        "must_have_technical": result.get("must_have_technical", []),
        "must_have_non_technical": result.get("must_have_non_technical", []),
        "nice_to_have_technical": result.get("nice_to_have_technical", []),
        "tech_stack": result.get("tech_stack", {}),
        "domain_knowledge": result.get("core_concepts", []),
        "core_concepts": result.get("core_concepts", []),
        "interview_topics": result.get("interview_topics", []),
        "experience_signals": result.get("experience_signals", []),
        "red_flags": result.get("red_flags", []),
        "parsed_at": datetime.utcnow(),
    }


def _parse_one(job_id: str, title: str, company: str, description: str) -> tuple[str, dict | Exception]:
    """Call Claude for a single job. Returns (job_id, result_or_exception). Thread-safe."""
    try:
        result = parse_job_description(title, company, description)
        return job_id, result
    except Exception as e:
        return job_id, e


def run_parser(db: Session, limit: int = 50) -> dict:
    unparsed = (
        db.query(Job)
        .filter(Job.parse_status == "unparsed", Job.description != "")
        .limit(limit)
        .all()
    )

    if not unparsed:
        return {"parsed": 0, "failed": 0}

    # Mark all as in-flight so concurrent runs don't double-process
    ids = [j.id for j in unparsed]
    db.query(Job).filter(Job.id.in_(ids)).update({"parse_status": "parsing"}, synchronize_session=False)
    db.commit()

    # Fan out Claude calls in parallel
    job_map = {j.id: j for j in unparsed}
    futures = {}
    with ThreadPoolExecutor(max_workers=PARSE_WORKERS) as pool:
        for job in unparsed:
            f = pool.submit(_parse_one, job.id, job.title, job.company, job.description)
            futures[f] = job.id

    # Collect results and write to DB — use fresh sessions per write to avoid conflicts
    parsed = 0
    failed = 0
    for future in as_completed(futures):
        job_id = futures[future]
        job = job_map[job_id]
        job_id_result, result = future.result()

        write_db = SessionLocal()
        try:
            if isinstance(result, Exception):
                write_db.query(Job).filter(Job.id == job_id).update({"parse_status": "failed"})
                write_db.commit()
                failed += 1
                logger.error("Parse failed for %s: %s", job_id, result)
                continue

            analysis_data = _build_analysis_data(job_id, result)
            stmt = (
                pg_insert(JobAnalysis)
                .values(analysis_data)
                .on_conflict_do_update(
                    index_elements=["job_id"],
                    set_={k: v for k, v in analysis_data.items() if k != "job_id"},
                )
            )
            write_db.execute(stmt)
            write_db.query(Job).filter(Job.id == job_id).update({"parse_status": "parsed"})
            write_db.commit()
            parsed += 1
            logger.info("Parsed: %s @ %s", job.title, job.company)
        except Exception as e:
            write_db.rollback()
            write_db.query(Job).filter(Job.id == job_id).update({"parse_status": "failed"})
            write_db.commit()
            failed += 1
            logger.error("DB write failed for %s: %s", job_id, e)
        finally:
            write_db.close()

    return {"parsed": parsed, "failed": failed}
