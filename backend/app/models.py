from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, JSON, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True)  # hash of url+title+company
    source = Column(String, nullable=False)  # greenhouse | lever | ashby | simplify
    url = Column(String, nullable=False, unique=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String)
    remote = Column(String)  # remote | hybrid | onsite | unknown
    description = Column(Text, nullable=False)
    posted_at = Column(DateTime)
    ingested_at = Column(DateTime, default=datetime.utcnow)
    parse_status = Column(String, default="unparsed")  # unparsed | parsed | failed

    analysis = relationship("JobAnalysis", back_populates="job", uselist=False)


class JobAnalysis(Base):
    __tablename__ = "job_analysis"

    job_id = Column(String, ForeignKey("jobs.id"), primary_key=True)
    role_summary = Column(Text)
    seniority = Column(String)       # Entry | Mid | Senior | Staff | Principal | Research
    ml_domain = Column(String)       # LLMs | CV | RL | MLOps | Data Platform | General ML
    must_have_technical = Column(JSON)
    must_have_non_technical = Column(JSON)
    nice_to_have_technical = Column(JSON)
    tech_stack = Column(JSON)        # {frameworks, infra, languages, tools}
    domain_knowledge = Column(JSON)   # kept for backwards compat
    core_concepts = Column(JSON)       # replaces domain_knowledge going forward
    interview_topics = Column(JSON)
    experience_signals = Column(JSON)
    red_flags = Column(JSON)
    parsed_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="analysis")
