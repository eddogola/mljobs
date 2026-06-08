import html
import re
from anthropic import Anthropic
from app.config import settings

client = Anthropic(api_key=settings.anthropic_api_key)


def _strip_html(text: str) -> str:
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"[ \t]+", " ", text).strip()


def _build_prompt(job_title: str, company: str, clean_jd: str, must_haves: list[str], focus: str | None, resume_text: str) -> str:
    must_have_str = ", ".join(must_haves[:25]) if must_haves else "see JD below"
    focus_hint = f"\n\nExtra instruction: {focus}" if focus else ""

    return f"""You are an aggressive, results-driven resume writer specialising in ML/AI engineering roles. Your job is to maximise interview callback rate by making the resume speak the exact language of the job description.

TARGET ROLE: {job_title} at {company}
MUST-HAVE KEYWORDS FROM JD: {must_have_str}{focus_hint}

RULES:
1. KEYWORDS FIRST — Weave the JD's exact keywords, phrases, and terminology into every bullet point where they truthfully apply. If the JD says "distributed training at scale", use that phrase if the candidate has done it. Mirror the JD's language throughout.
2. REWRITE BULLETS — Transform generic bullets into achievement-focused, keyword-rich statements. Lead with strong action verbs. Quantify wherever possible. Every bullet should signal relevance to this role.
3. SKILLS SECTION — Create a dedicated Technical Skills section listing all JD keywords the candidate genuinely has, grouped by category (Languages, Frameworks, Infrastructure, etc.).
4. REORDER — Put the most relevant experience and projects first. Cut or minimise anything irrelevant to this role.
5. NO SUMMARY — Do not include a professional summary or objective statement.
6. TRUTH — Do not fabricate experience, metrics, or skills. Only use what's in the resume. Reframe and reword aggressively, but never invent.

JOB DESCRIPTION:
{clean_jd}

---
ORIGINAL RESUME:
{resume_text}
---

Return ONLY the tailored resume in clean markdown. Use ## for section headers. No commentary, no explanation, no preamble."""


def stream_tailor_resume(
    resume_text: str,
    job_title: str,
    company: str,
    job_description: str,
    analysis=None,
    focus: str | None = None,
):
    clean_jd = _strip_html(job_description)[:6000]
    must_haves = []
    if analysis:
        must_haves = (analysis.must_have_technical or []) + (analysis.must_have_non_technical or [])
    prompt = _build_prompt(job_title, company, clean_jd, must_haves, focus, resume_text)
    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            yield text


def tailor_resume(
    resume_text: str,
    job_title: str,
    company: str,
    job_description: str,
    analysis=None,
    focus: str | None = None,
) -> str:
    clean_jd = _strip_html(job_description)[:6000]
    must_haves = []
    if analysis:
        must_haves = (analysis.must_have_technical or []) + (analysis.must_have_non_technical or [])
    prompt = _build_prompt(job_title, company, clean_jd, must_haves, focus, resume_text)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text.strip()
