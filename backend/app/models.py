from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, JSON, ForeignKey, Integer, Boolean, UniqueConstraint
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
    team_name = Column(String)
    hiring_manager = Column(String)
    domain_knowledge = Column(JSON)   # kept for backwards compat
    core_concepts = Column(JSON)       # replaces domain_knowledge going forward
    interview_topics = Column(JSON)
    experience_signals = Column(JSON)
    red_flags = Column(JSON)
    parsed_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="analysis")


class SavedJob(Base):
    __tablename__ = "saved_jobs"

    job_id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    url = Column(String, nullable=False)
    position = Column(Integer, default=0)   # lower = higher priority
    saved_at = Column(DateTime, default=datetime.utcnow)


class SavedSkill(Base):
    __tablename__ = "saved_skills"

    skill = Column(String, primary_key=True)
    category = Column(String, nullable=False)
    skill_position = Column(Integer, default=0)    # order within category
    saved_at = Column(DateTime, default=datetime.utcnow)


class SkillConfidenceEntry(Base):
    __tablename__ = "skill_confidence_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    skill = Column(String, ForeignKey("saved_skills.skill", ondelete="CASCADE"), nullable=False, index=True)
    value = Column(Integer, nullable=False)  # 1-5
    recorded_at = Column(DateTime, default=datetime.utcnow)


class PrepResource(Base):
    __tablename__ = "prep_resources"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    resource_type = Column(String)   # Article | Video | Course | Practice | Other
    notes = Column(Text)
    skills = Column(JSON)            # list[str] of skill tags
    completed = Column(Boolean, default=False)
    position = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class SavedSectionOrder(Base):
    __tablename__ = "saved_section_order"

    category = Column(String, primary_key=True)
    position = Column(Integer, default=0)


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String, primary_key=True)
    filename = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Recruiter(Base):
    __tablename__ = "recruiters"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    company = Column(String)
    email = Column(String)
    linkedin_url = Column(String)
    notes = Column(Text)
    tags = Column(JSON, default=list)
    last_contacted = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
