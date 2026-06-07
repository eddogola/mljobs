import hashlib
import logging
from datetime import datetime, timezone
import httpx
from app.workers.sources.companies import LEVER_COMPANIES
from app.workers.utils import is_ml_role, infer_remote

logger = logging.getLogger(__name__)
BASE = "https://api.lever.co/v0/postings/{company}?mode=json"


def fetch_lever_jobs() -> list[dict]:
    jobs = []
    for company, board in LEVER_COMPANIES:
        try:
            url = BASE.format(company=board)
            resp = httpx.get(url, timeout=15)
            if resp.status_code != 200:
                logger.warning("Lever %s returned %s", board, resp.status_code)
                continue
            for j in resp.json():
                title = j.get("text", "")
                if not is_ml_role(title):
                    continue
                categories = j.get("categories", {})
                location = categories.get("location", "") or categories.get("allLocations", [""])[0]
                description_parts = []
                for section in j.get("descriptionBody", {}).get("content", []) or []:
                    for item in section.get("content", []):
                        if item.get("type") == "text":
                            description_parts.append(item.get("text", ""))
                description = j.get("descriptionPlain") or " ".join(description_parts)
                job_url = j.get("hostedUrl", "")
                posted_ms = j.get("createdAt")
                posted_at = datetime.fromtimestamp(posted_ms / 1000, tz=timezone.utc) if posted_ms else None
                job_id = hashlib.md5(job_url.encode()).hexdigest()
                jobs.append({
                    "id": job_id,
                    "source": "lever",
                    "url": job_url,
                    "title": title,
                    "company": company,
                    "location": location,
                    "remote": infer_remote(title, location, description),
                    "description": description,
                    "posted_at": posted_at,
                })
        except Exception as e:
            logger.error("Lever %s failed: %s", board, e)
    return jobs
