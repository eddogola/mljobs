from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, cast, Text
from app.database import get_db
from app.models import Job, JobAnalysis
from app.schemas import JobSchema, JobListItem
from app.workers.ingest import run_ingestion, run_parser

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

SENIORITY_OPTIONS = ["Entry", "Mid", "Senior", "Staff", "Principal", "Research"]
ML_DOMAIN_OPTIONS = [
    "LLMs", "Computer Vision", "RL", "MLOps", "Data Platform",
    "General ML", "AI Infrastructure", "NLP", "Multimodal",
]


@router.get("/")
def list_jobs(
    seniority: Optional[str] = Query(None),
    ml_domain: Optional[str] = Query(None),
    remote: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    days_ago: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    skill: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Job).outerjoin(JobAnalysis)

    if seniority:
        q = q.filter(JobAnalysis.seniority == seniority)
    if ml_domain:
        q = q.filter(JobAnalysis.ml_domain == ml_domain)
    if remote:
        q = q.filter(Job.remote == remote)
    if source:
        q = q.filter(Job.source == source)
    if days_ago:
        cutoff = datetime.utcnow() - timedelta(days=days_ago)
        q = q.filter(Job.posted_at >= cutoff)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(Job.title.ilike(term), Job.company.ilike(term)))
    if skill:
        term = f"%{skill}%"
        q = q.filter(
            or_(
                cast(JobAnalysis.core_concepts, Text).ilike(term),
                cast(JobAnalysis.domain_knowledge, Text).ilike(term),
                cast(JobAnalysis.must_have_technical, Text).ilike(term),
                cast(JobAnalysis.nice_to_have_technical, Text).ilike(term),
                cast(JobAnalysis.tech_stack, Text).ilike(term),
            )
        )
    if city:
        q = q.filter(Job.location.ilike(f"%{city}%"))

    total = q.count()
    jobs = q.order_by(Job.posted_at.desc().nullslast()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for job in jobs:
        item = {
            "id": job.id,
            "source": job.source,
            "url": job.url,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "remote": job.remote,
            "posted_at": job.posted_at,
            "parse_status": job.parse_status,
            "seniority": job.analysis.seniority if job.analysis else None,
            "ml_domain": job.analysis.ml_domain if job.analysis else None,
        }
        items.append(item)

    return {"total": total, "page": page, "page_size": page_size, "jobs": items}


@router.get("/cities")
def get_cities(db: Session = Depends(get_db)):
    from sqlalchemy import func
    import re

    SKIP = {
        "united states", "usa", "us", "remote", "remote in usa", "anywhere",
        "worldwide", "global", "uk", "canada", "europe", "india", "germany",
        "france", "australia", "netherlands", "sweden", "israel",
    }

    NORMALIZE = {
        "nyc": "New York",
        "new york city": "New York",
        "sf": "San Francisco",
        "san francisco bay area": "San Francisco",
        "bay area": "San Francisco",
        "washington dc": "Washington DC",
        "washington, dc": "Washington DC",
        "greater new york": "New York",
    }

    rows = (
        db.query(Job.location, func.count(Job.id).label("n"))
        .filter(Job.location.isnot(None), Job.location != "")
        .filter(~Job.location.ilike("%remote%"))
        .group_by(Job.location)
        .all()
    )

    city_counts: Counter = Counter()
    for location, count in rows:
        # Split multi-city strings on ; | /
        parts = re.split(r"[;|/]", location)
        for part in parts:
            # Strip trailing parenthetical e.g. "(HQ)"
            part = re.sub(r"\s*\(.*?\)", "", part).strip()
            # Take city = text before first comma
            city = part.split(",")[0].strip()
            # Normalise state suffixes like "California" → drop
            city = re.sub(r"\s+(CA|NY|TX|WA|MA|IL|CO|VA|GA|FL|DC|OR|NC|OH|PA|AZ|NJ|MN|MI|IN|UT|MD|CT|TN)\b", "", city, flags=re.I).strip()
            city_lower = city.lower()
            if not city or city_lower in SKIP or len(city) < 3:
                continue
            city = NORMALIZE.get(city_lower, city)
            city_counts[city] += count

    return [
        {"city": city, "count": count}
        for city, count in city_counts.most_common(60)
        if count >= 2
    ]


@router.get("/filters")
def get_filter_options():
    return {
        "seniority": SENIORITY_OPTIONS,
        "ml_domain": ML_DOMAIN_OPTIONS,
        "remote": ["remote", "hybrid", "onsite"],
        "source": ["linkedin", "greenhouse", "ashby", "lever", "remotive", "himalayas"],
    }


def _categorise_concept(item: str, groups: dict) -> None:
    """Route a concept string into the right landscape group."""
    s = item.strip()
    if not s or len(s) > 80:
        return
    low = s.lower()

    # AI Safety & Interpretability — check first, most specific
    if any(k in low for k in [
        "mechanistic interp", "interpretab", "circuits", "superposition",
        "sparse autoencoder", "activation patch", "probing", "feature visual",
        "representation", "red team", "red-team", "jailbreak", "adversarial",
        "constitutional", "scalable oversight", "debate", "amplification",
        "anomaly detect", "robustness", "safety", "alignment eval",
    ]):
        groups["AI Safety & Interpretability"][s] += 1

    # Alignment & Training objectives
    elif any(k in low for k in [
        "rlhf", "rlaif", "dpo", "ppo", "grpo", "reward model", "preference",
        "reinforcement learning from", "sft", "supervised fine-tun",
        "instruction tun", "constitutional ai",
    ]):
        groups["Alignment & Training"][s] += 1

    # Architectures
    elif any(k in low for k in [
        "transformer", "diffusion", "cnn", "convolution", "rnn", "lstm", "gru",
        "attention", "self-attention", "moe", "mixture of expert", "ssm",
        "mamba", "state space", "bert", "gpt", "vit", "resnet", "gan",
        "vae", "flow matching", "encoder", "decoder", "unet",
    ]):
        groups["Architectures"][s] += 1

    # Optimization & Fine-tuning
    elif any(k in low for k in [
        "quantization", "pruning", "distillation", "lora", "peft", "qlora",
        "fine-tun", "finetuning", "adapter", "prefix tun", "flash attention",
        "gradient checkpoint", "mixed precision", "fp16", "bf16", "int8",
    ]):
        groups["Optimization & Fine-tuning"][s] += 1

    # Inference & Serving
    elif any(k in low for k in [
        "kv cache", "speculative decod", "continuous batch", "tensor parallel",
        "pipeline parallel", "vllm", "triton", "tensorrt", "onnx",
        "inference optim", "latency", "throughput", "serving", "deployment",
        "model compress",
    ]):
        groups["Inference & Serving"][s] += 1

    # Scaling & Research Methods
    elif any(k in low for k in [
        "scaling law", "chinchilla", "pretraining", "pre-training",
        "data curation", "synthetic data", "curriculum", "ablation",
        "benchmark", "evaluation", "evals", "mmlu", "humaneval",
        "emergent", "capability", "elicitation",
    ]):
        groups["Scaling & Evals"][s] += 1

    # Distributed & Systems
    elif any(k in low for k in [
        "distributed train", "data parallel", "model parallel",
        "fsdp", "deepspeed", "megatron", "gpu cluster", "cuda", "triton kernel",
        "hpc", "slurm", "multi-node", "interconnect", "nvlink",
    ]):
        groups["Distributed Systems"][s] += 1

    # Math & Theory
    elif any(k in low for k in [
        "information theory", "bayesian", "probability", "statistics",
        "linear algebra", "optimization theory", "measure theory",
        "stochastic", "variational", "entropy", "kl divergence",
    ]):
        groups["Math & Theory"][s] += 1

    # Everything else
    else:
        groups["Other Concepts"][s] += 1


@router.get("/skills")
def get_skills_landscape(db: Session = Depends(get_db)):
    analyses = db.query(JobAnalysis).all()

    groups: dict[str, Counter] = defaultdict(Counter)

    for a in analyses:
        stack = a.tech_stack or {}

        for item in stack.get("frameworks", []):
            s = item.strip()
            if s:
                groups["ML Frameworks"][s] += 1

        for item in stack.get("infra", []):
            s = item.strip()
            if not s:
                continue
            low = s.lower()
            if any(k in low for k in ["vllm", "triton", "tensorrt", "onnx", "torchserve", "bentoml"]):
                groups["Inference & Serving"][s] += 1
            elif any(k in low for k in ["kubernetes", "docker", "airflow", "spark", "kafka",
                                         "dbt", "databricks", "snowflake", "bigquery", "redshift", "flink"]):
                groups["Data & Pipeline"][s] += 1
            else:
                groups["Infrastructure & MLOps"][s] += 1

        for item in stack.get("languages", []):
            s = item.strip()
            if s:
                groups["Languages"][s] += 1

        for item in stack.get("tools", []):
            s = item.strip()
            if s:
                groups["Experiment & Tooling"][s] += 1

        # core_concepts is the new field; fall back to domain_knowledge for old rows
        concepts = a.core_concepts or a.domain_knowledge or []
        for item in concepts:
            _categorise_concept(item, groups)

    # Serialize: top 20 per group, sorted by count
    result = {}
    for group, counter in groups.items():
        top = [{"skill": skill, "count": count} for skill, count in counter.most_common(20)]
        if top:
            result[group] = top

    return {"total_parsed": len(analyses), "groups": result}


@router.get("/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).outerjoin(JobAnalysis).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobSchema.model_validate(job)


@router.post("/admin/reparse")
def reset_parse_status(db: Session = Depends(get_db)):
    count = db.query(Job).update({"parse_status": "unparsed"}, synchronize_session=False)
    db.query(JobAnalysis).delete(synchronize_session=False)
    db.commit()
    return {"reset": count}


@router.post("/admin/ingest")
def trigger_ingestion(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    def _run():
        result = run_ingestion(db)
        run_parser(db)
        return result
    background_tasks.add_task(_run)
    return {"status": "ingestion started"}


@router.post("/admin/parse")
def trigger_parse(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    result = run_parser(db, limit=limit)
    return result
