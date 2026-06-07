import hashlib
import logging
from datetime import datetime
import httpx
from app.workers.sources.companies import ASHBY_COMPANIES
from app.workers.utils import is_ml_role, infer_remote

logger = logging.getLogger(__name__)
BASE = "https://api.ashbyhq.com/posting-api/job-board/{org}"


def fetch_ashby_jobs() -> list[dict]:
    jobs = []
    for company, org in ASHBY_COMPANIES:
        try:
            url = BASE.format(org=org)
            resp = httpx.get(url, timeout=15)
            if resp.status_code != 200:
                logger.warning("Ashby %s returned %s", org, resp.status_code)
                continue
            data = resp.json()
            for j in data.get("jobs", []):
                title = j.get("title", "")
                if not is_ml_role(title):
                    continue
                location = j.get("locationName") or j.get("location", "")
                description = j.get("descriptionHtml") or j.get("description") or ""
                job_url = j.get("jobUrl") or j.get("applyUrl", "")
                posted_raw = j.get("publishedAt") or j.get("createdAt")
                posted_at = None
                if posted_raw:
                    try:
                        posted_at = datetime.fromisoformat(posted_raw.replace("Z", "+00:00"))
                    except Exception:
                        pass
                if not job_url:
                    continue
                job_id = hashlib.md5(job_url.encode()).hexdigest()
                jobs.append({
                    "id": job_id,
                    "source": "ashby",
                    "url": job_url,
                    "title": title,
                    "company": company,
                    "location": location,
                    "remote": infer_remote(title, location, description),
                    "description": description,
                    "posted_at": posted_at,
                })
        except Exception as e:
            logger.error("Ashby %s failed: %s", org, e)
    return jobs
