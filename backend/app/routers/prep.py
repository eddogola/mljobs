import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import PrepResource
from app.config import settings

router = APIRouter(prefix="/api/prep", tags=["prep"])


def _auth(x_personal_token: Optional[str] = Header(default=None)):
    """If PERSONAL_TOKEN is configured, require it on all prep endpoints."""
    if settings.personal_token and x_personal_token != settings.personal_token:
        raise HTTPException(status_code=401, detail="Invalid or missing token")


class PrepResourceIn(BaseModel):
    title: str
    url: str
    resource_type: Optional[str] = None
    notes: Optional[str] = None
    skills: list[str] = []


class PrepResourcePatch(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    resource_type: Optional[str] = None
    notes: Optional[str] = None
    skills: Optional[list[str]] = None
    completed: Optional[bool] = None


class ReorderResourcesIn(BaseModel):
    ids: list[str]  # ordered list of resource ids


def _serialize(r: PrepResource) -> dict:
    return {
        "id": r.id,
        "title": r.title,
        "url": r.url,
        "resource_type": r.resource_type,
        "notes": r.notes,
        "skills": r.skills or [],
        "completed": r.completed,
        "created_at": r.created_at.isoformat(),
    }


@router.get("/resources")
def list_resources(db: Session = Depends(get_db), _=Depends(_auth)):
    resources = db.query(PrepResource).order_by(PrepResource.position, PrepResource.created_at.desc()).all()
    return [_serialize(r) for r in resources]


@router.post("/resources", status_code=201)
def add_resource(body: PrepResourceIn, db: Session = Depends(get_db), _=Depends(_auth)):
    max_pos = db.query(PrepResource).count()
    resource = PrepResource(
        id=uuid.uuid4().hex,
        title=body.title,
        url=body.url,
        resource_type=body.resource_type,
        notes=body.notes,
        skills=body.skills,
        completed=False,
        position=max_pos,
        created_at=datetime.utcnow(),
    )
    db.add(resource)
    db.commit()
    return _serialize(resource)


@router.patch("/resources/{resource_id}")
def update_resource(resource_id: str, body: PrepResourcePatch, db: Session = Depends(get_db), _=Depends(_auth)):
    resource = db.get(PrepResource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(resource, field, value)
    db.commit()
    return _serialize(resource)


@router.delete("/resources/{resource_id}")
def delete_resource(resource_id: str, db: Session = Depends(get_db), _=Depends(_auth)):
    resource = db.get(PrepResource, resource_id)
    if resource:
        db.delete(resource)
        db.commit()
    return {"status": "removed"}


@router.put("/resources/reorder")
def reorder_resources(body: ReorderResourcesIn, db: Session = Depends(get_db), _=Depends(_auth)):
    for i, rid in enumerate(body.ids):
        r = db.get(PrepResource, rid)
        if r:
            r.position = i
    db.commit()
    return {"status": "ok"}
