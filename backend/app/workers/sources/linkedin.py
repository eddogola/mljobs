import hashlib
import logging
import re
import time
from datetime import datetime, timedelta, timezone

import httpx
from bs4 import BeautifulSoup

from app.workers.utils import is_ml_role, infer_remote

logger = logging.getLogger(__name__)

SEARCH_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
DETAIL_URL = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}"

# Role keywords to search — broad enough to catch all ML/AI adjacent titles
SEARCH_KEYWORDS = [
    "machine learning engineer",
    "AI engineer",
    "MLOps engineer",
    "applied scientist",
    "research engineer machine learning",
    "computer vision engineer",
    "NLP engineer",
    "ML platform engineer",
    "deep learning engineer",
    "data scientist machine learning",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

# 30 days in seconds
RECENCY_FILTER = "r2592000"


def _parse_relative_date(text: str) -> datetime | None:
    text = text.lower().strip()
    now = datetime.now(tz=timezone.utc)
    if "hour" in text or "minute" in text or "just now" in text:
        return now
    m = re.search(r"(\d+)\s*day", text)
    if m:
        return now - timedelta(days=int(m.group(1)))
    m = re.search(r"(\d+)\s*week", text)
    if m:
        return now - timedelta(weeks=int(m.group(1)))
    m = re.search(r"(\d+)\s*month", text)
    if m:
        return now - timedelta(days=int(m.group(1)) * 30)
    return None


def _fetch_description(job_id: str, client: httpx.Client) -> str:
    try:
        resp = client.get(DETAIL_URL.format(job_id=job_id), timeout=12)
        if resp.status_code != 200:
            return ""
        soup = BeautifulSoup(resp.text, "lxml")
        el = soup.find(class_="show-more-less-html__markup") or soup.find(class_="description__text")
        return el.get_text(separator="\n").strip() if el else ""
    except Exception as e:
        logger.debug("LinkedIn description fetch failed for %s: %s", job_id, e)
        return ""


def fetch_linkedin_jobs() -> list[dict]:
    jobs = []
    seen_ids: set[str] = set()

    with httpx.Client(headers=HEADERS, follow_redirects=True) as client:
        for keyword in SEARCH_KEYWORDS:
            for start in range(0, 75, 25):  # 3 pages × 25 = ~75 per keyword
                try:
                    resp = client.get(
                        SEARCH_URL,
                        params={"keywords": keyword, "location": "", "f_TPR": RECENCY_FILTER, "start": start},
                        timeout=12,
                    )
                    if resp.status_code == 429:
                        logger.warning("LinkedIn rate limited — backing off 30s")
                        time.sleep(30)
                        break  # skip remaining pages for this keyword
                    if resp.status_code != 200:
                        logger.warning("LinkedIn search returned %s for '%s' start=%s", resp.status_code, keyword, start)
                        break

                    soup = BeautifulSoup(resp.text, "lxml")
                    cards = soup.find_all("li")
                    if not cards:
                        break

                    for card in cards:
                        urn_el = card.find(attrs={"data-entity-urn": True})
                        if not urn_el:
                            continue
                        urn = urn_el["data-entity-urn"]
                        job_id = urn.split(":")[-1]
                        if job_id in seen_ids:
                            continue
                        seen_ids.add(job_id)

                        title_el = card.find(class_="base-search-card__title")
                        company_el = card.find(class_="base-search-card__subtitle")
                        location_el = card.find(class_="job-search-card__location")
                        date_el = card.find(class_="job-search-card__listdate") or card.find("time")

                        title = title_el.get_text(strip=True) if title_el else ""
                        company = company_el.get_text(strip=True) if company_el else ""
                        location = location_el.get_text(strip=True) if location_el else ""

                        if not title or not is_ml_role(title):
                            continue

                        posted_at = None
                        if date_el:
                            dt_attr = date_el.get("datetime")
                            if dt_attr:
                                try:
                                    posted_at = datetime.fromisoformat(dt_attr)
                                except Exception:
                                    pass
                            if not posted_at:
                                posted_at = _parse_relative_date(date_el.get_text(strip=True))

                        url = f"https://www.linkedin.com/jobs/view/{job_id}/"

                        # Fetch full description with a small delay to avoid rate limits
                        time.sleep(0.3)
                        description = _fetch_description(job_id, client)

                        if not description:
                            continue

                        doc_id = hashlib.md5(url.encode()).hexdigest()
                        jobs.append({
                            "id": doc_id,
                            "source": "linkedin",
                            "url": url,
                            "title": title,
                            "company": company,
                            "location": location,
                            "remote": infer_remote(title, location, description),
                            "description": description,
                            "posted_at": posted_at,
                        })

                    time.sleep(2.5)  # pause between pages

                except Exception as e:
                    logger.error("LinkedIn fetch failed for '%s' start=%s: %s", keyword, start, e)
                    break

    logger.info("LinkedIn: fetched %d ML jobs", len(jobs))
    return jobs
