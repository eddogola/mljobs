from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import SavedJob, SavedSkill, SavedSectionOrder, SkillConfidenceEntry
from app.config import settings

router = APIRouter(prefix="/api/saved", tags=["saved"])


def _auth(x_personal_token: Optional[str] = Header(default=None)):
    """If PERSONAL_TOKEN is configured, require it on all saved endpoints."""
    if settings.personal_token and x_personal_token != settings.personal_token:
        raise HTTPException(status_code=401, detail="Invalid or missing token")


# ── Jobs ──────────────────────────────────────────────────────────────────────

class SaveJobIn(BaseModel):
    job_id: str
    title: str
    company: str
    url: str


@router.get("/jobs")
def list_saved_jobs(db: Session = Depends(get_db), _=Depends(_auth)):
    jobs = db.query(SavedJob).order_by(SavedJob.position, SavedJob.saved_at.desc()).all()
    return [
        {"job_id": j.job_id, "title": j.title, "company": j.company,
         "url": j.url, "saved_at": j.saved_at.isoformat()}
        for j in jobs
    ]


@router.post("/jobs", status_code=201)
def save_job(body: SaveJobIn, db: Session = Depends(get_db), _=Depends(_auth)):
    existing = db.get(SavedJob, body.job_id)
    if existing:
        return {"status": "already_saved"}
    max_pos = db.query(SavedJob).count()
    db.add(SavedJob(
        job_id=body.job_id, title=body.title, company=body.company,
        url=body.url, position=max_pos, saved_at=datetime.utcnow(),
    ))
    db.commit()
    return {"status": "saved"}


@router.delete("/jobs/{job_id}")
def unsave_job(job_id: str, db: Session = Depends(get_db), _=Depends(_auth)):
    job = db.get(SavedJob, job_id)
    if job:
        db.delete(job)
        db.commit()
    return {"status": "removed"}


# ── Skills ────────────────────────────────────────────────────────────────────

class SaveSkillIn(BaseModel):
    skill: str
    category: str


class ReorderSkillsIn(BaseModel):
    category: str
    skills: list[str]  # ordered list of skill names for that category


class ReorderSectionsIn(BaseModel):
    categories: list[str]  # ordered list of category names


@router.get("/skills")
def list_saved_skills(db: Session = Depends(get_db), _=Depends(_auth)):
    skills = db.query(SavedSkill).order_by(SavedSkill.category, SavedSkill.skill_position).all()
    section_order = {
        s.category: s.position
        for s in db.query(SavedSectionOrder).all()
    }
    return {
        "skills": [
            {"skill": s.skill, "category": s.category, "saved_at": s.saved_at.isoformat()}
            for s in skills
        ],
        "section_order": section_order,
    }


@router.post("/skills", status_code=201)
def save_skill(body: SaveSkillIn, db: Session = Depends(get_db), _=Depends(_auth)):
    existing = db.get(SavedSkill, body.skill)
    if existing:
        return {"status": "already_saved"}
    count_in_cat = db.query(SavedSkill).filter(SavedSkill.category == body.category).count()
    db.add(SavedSkill(
        skill=body.skill, category=body.category,
        skill_position=count_in_cat, saved_at=datetime.utcnow(),
    ))
    # Ensure section order row exists
    if not db.get(SavedSectionOrder, body.category):
        max_pos = db.query(SavedSectionOrder).count()
        db.add(SavedSectionOrder(category=body.category, position=max_pos))
    db.commit()
    return {"status": "saved"}


@router.delete("/skills/{skill}")
def unsave_skill(skill: str, db: Session = Depends(get_db), _=Depends(_auth)):
    s = db.get(SavedSkill, skill)
    if s:
        db.delete(s)
        db.commit()
    return {"status": "removed"}


@router.put("/skills/reorder")
def reorder_skills(body: ReorderSkillsIn, db: Session = Depends(get_db), _=Depends(_auth)):
    for i, skill_name in enumerate(body.skills):
        s = db.get(SavedSkill, skill_name)
        if s and s.category == body.category:
            s.skill_position = i
    db.commit()
    return {"status": "ok"}


class LogConfidenceIn(BaseModel):
    value: int  # 1-5


@router.get("/skills/confidence")
def list_confidence_history(db: Session = Depends(get_db), _=Depends(_auth)):
    """All confidence entries, grouped by skill, oldest to newest — for charting trends."""
    entries = db.query(SkillConfidenceEntry).order_by(SkillConfidenceEntry.recorded_at).all()
    history: dict[str, list[dict]] = {}
    for e in entries:
        history.setdefault(e.skill, []).append({"value": e.value, "recorded_at": e.recorded_at.isoformat()})
    return history


@router.post("/skills/{skill}/confidence", status_code=201)
def log_confidence(skill: str, body: LogConfidenceIn, db: Session = Depends(get_db), _=Depends(_auth)):
    if not db.get(SavedSkill, skill):
        raise HTTPException(status_code=404, detail="Skill not saved")
    if not 1 <= body.value <= 5:
        raise HTTPException(status_code=422, detail="value must be between 1 and 5")
    db.add(SkillConfidenceEntry(skill=skill, value=body.value, recorded_at=datetime.utcnow()))
    db.commit()
    return {"status": "logged"}


@router.get("/skills/{skill}/confidence")
def get_confidence_history(skill: str, db: Session = Depends(get_db), _=Depends(_auth)):
    entries = (
        db.query(SkillConfidenceEntry)
        .filter(SkillConfidenceEntry.skill == skill)
        .order_by(SkillConfidenceEntry.recorded_at)
        .all()
    )
    return [{"value": e.value, "recorded_at": e.recorded_at.isoformat()} for e in entries]


@router.put("/sections/reorder")
def reorder_sections(body: ReorderSectionsIn, db: Session = Depends(get_db), _=Depends(_auth)):
    for i, category in enumerate(body.categories):
        row = db.get(SavedSectionOrder, category)
        if row:
            row.position = i
        else:
            db.add(SavedSectionOrder(category=category, position=i))
    db.commit()
    return {"status": "ok"}
