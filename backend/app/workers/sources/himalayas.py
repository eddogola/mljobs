import hashlib
import logging
from datetime import datetime

import httpx

from app.workers.utils import is_ml_role, infer_remote

logger = logging.getLogger(__name__)

BASE_URL = "https://himalayas.app/jobs/api"

ML_QUERIES = [
    "machine learning engineer",
    "AI engineer",
    "MLOps",
    "data scientist",
    "computer vision",
    "NLP engineer",
    "applied scientist",
]


def fetch_himalayas_jobs() -> list[dict]:
    jobs = []
    seen: set[str] = set()

    for query in ML_QUERIES:
        try:
            resp = httpx.get(
                BASE_URL,
                params={"q": query, "limit": 50},
                timeout=15,
                follow_redirects=True,
            )
            if resp.status_code != 200:
                logger.warning("Himalayas '%s' returned %s", query, resp.status_code)
                continue

            for j in resp.json().get("jobs", []):
                title = j.get("title", "")
                if not is_ml_role(title):
                    continue

                url = j.get("applicationLink") or j.get("guid", "")
                if not url or url in seen:
                    continue
                seen.add(url)

                company = j.get("companyName", "")
                location = ", ".join(j.get("locationRestrictions") or []) or "Remote"
                description = j.get("description", "")
                if not description:
                    continue

                posted_at = None
                raw_date = j.get("pubDate")
                if raw_date:
                    try:
                        posted_at = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
                    except Exception:
                        pass

                doc_id = hashlib.md5(url.encode()).hexdigest()
                jobs.append({
                    "id": doc_id,
                    "source": "himalayas",
                    "url": url,
                    "title": title,
                    "company": company,
                    "location": location,
                    "remote": "remote",  # Himalayas is remote-only
                    "description": description,
                    "posted_at": posted_at,
                })
        except Exception as e:
            logger.error("Himalayas query '%s' failed: %s", query, e)

    logger.info("Himalayas: fetched %d ML jobs", len(jobs))
    return jobs
