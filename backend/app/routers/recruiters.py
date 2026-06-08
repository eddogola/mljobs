import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Recruiter

router = APIRouter(prefix="/api/recruiters", tags=["recruiters"])


class RecruiterIn(BaseModel):
    name: str
    company: Optional[str] = None
    email: Optional[str] = None
    linkedin_url: Optional[str] = None
    notes: Optional[str] = None
    tags: list[str] = []


class RecruiterPatch(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    linkedin_url: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[list[str]] = None
    last_contacted: Optional[datetime] = None


@router.get("")
def list_recruiters(db: Session = Depends(get_db)):
    return db.query(Recruiter).order_by(Recruiter.created_at.desc()).all()


@router.post("")
def create_recruiter(body: RecruiterIn, db: Session = Depends(get_db)):
    r = Recruiter(id=str(uuid.uuid4()), **body.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.patch("/{recruiter_id}")
def update_recruiter(recruiter_id: str, body: RecruiterPatch, db: Session = Depends(get_db)):
    r = db.query(Recruiter).filter(Recruiter.id == recruiter_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recruiter not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(r, field, value)
    db.commit()
    db.refresh(r)
    return r


@router.delete("/{recruiter_id}")
def delete_recruiter(recruiter_id: str, db: Session = Depends(get_db)):
    r = db.query(Recruiter).filter(Recruiter.id == recruiter_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recruiter not found")
    db.delete(r)
    db.commit()
    return {"deleted": recruiter_id}
