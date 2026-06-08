import asyncio
import io
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Resume, Job, JobAnalysis
from app.services.resume import tailor_resume, stream_tailor_resume

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


@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    data = await file.read()

    def extract(raw: bytes) -> str:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(raw))
        return "\n\n".join(page.extract_text() or "" for page in reader.pages).strip()

    try:
        # Run in thread pool so it doesn't block the async event loop
        text = await asyncio.get_event_loop().run_in_executor(None, extract, data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse PDF: {e}")

    if not text:
        raise HTTPException(status_code=422, detail="PDF has no extractable text — use a text-based PDF, not a scan")

    resume = Resume(id=str(uuid.uuid4()), filename=file.filename, content=text)
    db.add(resume)
    db.commit()
    db.refresh(resume)
    # Return full content so the frontend doesn't need a second round-trip
    return {"id": resume.id, "filename": resume.filename, "content": text, "created_at": resume.created_at}


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

    return StreamingResponse(
        stream_tailor_resume(
            resume_text=resume.content,
            job_title=job.title,
            company=job.company,
            job_description=job.description,
            analysis=analysis,
            focus=body.focus,
        ),
        media_type="text/plain; charset=utf-8",
    )
