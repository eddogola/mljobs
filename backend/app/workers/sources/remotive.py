import hashlib
import logging
from datetime import datetime

import httpx

from app.workers.utils import is_ml_role, infer_remote

logger = logging.getLogger(__name__)

# Remotive's free public API - returns remote jobs with full descriptions
BASE_URL = "https://remotive.com/api/remote-jobs"

# Categories that contain ML/AI roles
ML_CATEGORIES = ["data", "software-dev"]


def fetch_remotive_jobs() -> list[dict]:
    jobs = []

    for category in ML_CATEGORIES:
        try:
            resp = httpx.get(BASE_URL, params={"category": category, "limit": 100}, timeout=15)
            if resp.status_code != 200:
                logger.warning("Remotive category '%s' returned %s", category, resp.status_code)
                continue

            for j in resp.json().get("jobs", []):
                title = j.get("title", "")
                if not is_ml_role(title):
                    continue

                company = j.get("company_name", "")
                location = j.get("candidate_required_location", "") or "Remote"
                description = j.get("description", "")
                url = j.get("url", "")
                if not url or not description:
                    continue

                posted_at = None
                raw_date = j.get("publication_date")
                if raw_date:
                    try:
                        posted_at = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
                    except Exception:
                        pass

                doc_id = hashlib.md5(url.encode()).hexdigest()
                jobs.append({
                    "id": doc_id,
                    "source": "remotive",
                    "url": url,
                    "title": title,
                    "company": company,
                    "location": location,
                    "remote": infer_remote(title, location, description),
                    "description": description,
                    "posted_at": posted_at,
                })
        except Exception as e:
            logger.error("Remotive category '%s' failed: %s", category, e)

    logger.info("Remotive: fetched %d ML jobs", len(jobs))
    return jobs
