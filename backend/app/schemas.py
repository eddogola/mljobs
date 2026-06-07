from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TechStack(BaseModel):
    frameworks: list[str] = []
    infra: list[str] = []
    languages: list[str] = []
    tools: list[str] = []


class JobAnalysisSchema(BaseModel):
    job_id: str
    role_summary: Optional[str]
    seniority: Optional[str]
    ml_domain: Optional[str]
    must_have_technical: list[str] = []
    must_have_non_technical: list[str] = []
    nice_to_have_technical: list[str] = []
    tech_stack: Optional[TechStack]
    domain_knowledge: list[str] = []
    interview_topics: list[str] = []
    experience_signals: list[str] = []
    red_flags: list[str] = []
    parsed_at: Optional[datetime]

    class Config:
        from_attributes = True


class JobSchema(BaseModel):
    id: str
    source: str
    url: str
    title: str
    company: str
    location: Optional[str]
    remote: Optional[str]
    posted_at: Optional[datetime]
    ingested_at: datetime
    parse_status: str
    description: str
    analysis: Optional[JobAnalysisSchema]

    class Config:
        from_attributes = True


class JobListItem(BaseModel):
    id: str
    source: str
    url: str
    title: str
    company: str
    location: Optional[str]
    remote: Optional[str]
    posted_at: Optional[datetime]
    parse_status: str
    seniority: Optional[str] = None
    ml_domain: Optional[str] = None

    class Config:
        from_attributes = True


class JobFilters(BaseModel):
    seniority: Optional[str] = None
    ml_domain: Optional[str] = None
    remote: Optional[str] = None
    source: Optional[str] = None
    days_ago: Optional[int] = None
    search: Optional[str] = None
