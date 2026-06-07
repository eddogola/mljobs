import hashlib
import logging
from datetime import datetime
import httpx
from app.workers.utils import is_ml_role, infer_remote

logger = logging.getLogger(__name__)

# Simplify exposes a public JSON feed for their job board
SIMPLIFY_URL = "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json"
SIMPLIFY_INTERN_URL = "https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/.github/scripts/listings.json"


def fetch_simplify_jobs() -> list[dict]:
    jobs = []
    for feed_url in [SIMPLIFY_URL, SIMPLIFY_INTERN_URL]:
        try:
            resp = httpx.get(feed_url, timeout=30)
            if resp.status_code != 200:
                logger.warning("Simplify feed %s returned %s", feed_url, resp.status_code)
                continue
            listings = resp.json()
            for j in listings:
                title = j.get("title") or j.get("role") or ""
                if not is_ml_role(title):
                    continue
                company = j.get("company_name") or j.get("company") or ""
                locations = j.get("locations") or j.get("location") or []
                location = locations[0] if isinstance(locations, list) and locations else str(locations)
                url = j.get("url") or ""
                if not url:
                    continue
                description = j.get("description") or ""
                posted_ms = j.get("date_posted") or j.get("date_updated")
                posted_at = None
                if posted_ms and isinstance(posted_ms, (int, float)):
                    try:
                        posted_at = datetime.utcfromtimestamp(posted_ms)
                    except Exception:
                        pass
                job_id = hashlib.md5(url.encode()).hexdigest()
                jobs.append({
                    "id": job_id,
                    "source": "simplify",
                    "url": url,
                    "title": title,
                    "company": company,
                    "location": location,
                    "remote": infer_remote(title, location, description),
                    "description": description,
                    "posted_at": posted_at,
                })
        except Exception as e:
            logger.error("Simplify feed failed: %s", e)
    return jobs
