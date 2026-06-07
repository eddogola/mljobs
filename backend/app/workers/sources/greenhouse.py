import hashlib
import logging
from datetime import datetime
import httpx
from app.workers.sources.companies import GREENHOUSE_COMPANIES
from app.workers.utils import is_ml_role, infer_remote

logger = logging.getLogger(__name__)
BASE = "https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true"


def fetch_greenhouse_jobs() -> list[dict]:
    jobs = []
    for company, board in GREENHOUSE_COMPANIES:
        try:
            url = BASE.format(board=board)
            resp = httpx.get(url, timeout=15)
            if resp.status_code != 200:
                logger.warning("Greenhouse %s returned %s", board, resp.status_code)
                continue
            data = resp.json()
            for j in data.get("jobs", []):
                title = j.get("title", "")
                if not is_ml_role(title):
                    continue
                description = j.get("content", "") or ""
                location = j.get("location", {}).get("name", "")
                job_url = j.get("absolute_url", "")
                posted_raw = j.get("updated_at") or j.get("created_at")
                posted_at = None
                if posted_raw:
                    try:
                        posted_at = datetime.fromisoformat(posted_raw.replace("Z", "+00:00"))
                    except Exception:
                        pass
                job_id = hashlib.md5(job_url.encode()).hexdigest()
                jobs.append({
                    "id": job_id,
                    "source": "greenhouse",
                    "url": job_url,
                    "title": title,
                    "company": company,
                    "location": location,
                    "remote": infer_remote(title, location, description),
                    "description": description,
                    "posted_at": posted_at,
                })
        except Exception as e:
            logger.error("Greenhouse %s failed: %s", board, e)
    return jobs
