#!/usr/bin/env python
"""Bulk parse all unparsed jobs using parallel Claude API calls."""
import time
import logging
from app.database import SessionLocal
from app.models import Job
from app.workers.ingest import run_parser

logging.basicConfig(level=logging.WARNING)

BATCH = 100  # 10 workers × 10 jobs each in parallel

total_parsed = 0
total_failed = 0
iteration = 0

# Reset any stuck "parsing" jobs from previous interrupted runs
db = SessionLocal()
stuck = db.query(Job).filter(Job.parse_status == "parsing").update({"parse_status": "unparsed"})
if stuck:
    print(f"Reset {stuck} stuck 'parsing' jobs")
db.commit()
db.close()

while True:
    db = SessionLocal()
    try:
        remaining = db.query(Job).filter(Job.parse_status == "unparsed").count()
        if remaining == 0:
            break
        iteration += 1
        batch = min(BATCH, remaining)
        print(f"[{iteration}] {remaining} remaining — parsing {batch} in parallel...", flush=True)
        result = run_parser(db, limit=batch)
        total_parsed += result["parsed"]
        total_failed += result["failed"]
        print(f"      +{result['parsed']} parsed, +{result['failed']} failed", flush=True)
    finally:
        db.close()

print(f"\nDone. Total parsed: {total_parsed}, total failed: {total_failed}")
