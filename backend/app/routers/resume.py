import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Resume, Job, JobAnalysis
from app.services.resume import tailor_resume

router = APIRouter(prefix="/api/resume", tags=["resume"])


class ResumeIn(BaseModel):
    filename: str
    content: str  # plain text or markdown


class TailorRequest(BaseModel):
    focus: str | None = None  # optional extra instruction


@router.get("")
def get_resume(db: Session = Depends(get_db)):
    resume = db.query(Resume).order_by(Resume.created_at.desc()).first()
    if not resume:
        raise HTTPException(status_code=404, detail="No resume uploaded yet")
    return {"id": resume.id, "filename": resume.filename, "content": resume.content, "created_at": resume.created_at}


@router.post("")
def upload_resume(body: ResumeIn, db: Session = Depends(get_db)):
    resume = Resume(id=str(uuid.uuid4()), filename=body.filename, content=body.content)
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return {"id": resume.id, "filename": resume.filename, "created_at": resume.created_at}


@router.post("/tailor/{job_id}")
def tailor_for_job(job_id: str, body: TailorRequest, db: Session = Depends(get_db)):
    resume = db.query(Resume).order_by(Resume.created_at.desc()).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Upload a resume first")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    analysis = db.query(JobAnalysis).filter(JobAnalysis.job_id == job_id).first()

    tailored = tailor_resume(
        resume_text=resume.content,
        job_title=job.title,
        company=job.company,
        job_description=job.description,
        analysis=analysis,
        focus=body.focus,
    )
    return {"tailored": tailored}
