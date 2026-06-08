import html
import re
from anthropic import Anthropic
from app.config import settings

client = Anthropic(api_key=settings.anthropic_api_key)


def _strip_html(text: str) -> str:
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"[ \t]+", " ", text).strip()


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

    skills_hint = f"\nKey requirements extracted from JD: {', '.join(must_haves[:20])}" if must_haves else ""
    focus_hint = f"\nExtra instruction from user: {focus}" if focus else ""

    prompt = f"""You are an expert resume writer specialising in ML/AI engineering roles.

Tailor the resume below for the following role. Preserve every factual claim — do not invent experience, metrics, or skills the candidate doesn't have. Only reorder, reword, and emphasise what's already there to best match the job requirements.

Target role: {job_title} at {company}{skills_hint}{focus_hint}

Job description (first 6000 chars):
{clean_jd}

---
RESUME:
{resume_text}
---

Return the tailored resume in clean markdown. Use ## for section headers. Keep it to one page of content (roughly 500-700 words). Do not add any commentary — only the resume."""

    return _build_prompt(job_title, company, clean_jd, skills_hint, focus_hint, resume_text)


def _build_prompt(job_title, company, clean_jd, skills_hint, focus_hint, resume_text) -> str:
    return f"""You are an expert resume writer specialising in ML/AI engineering roles.

Tailor the resume below for the following role. Preserve every factual claim — do not invent experience, metrics, or skills the candidate doesn't have. Only reorder, reword, and emphasise what's already there to best match the job requirements.

Target role: {job_title} at {company}{skills_hint}{focus_hint}

Job description (first 6000 chars):
{clean_jd}

---
RESUME:
{resume_text}
---

Return the tailored resume in clean markdown. Use ## for section headers. Keep it to one page of content (roughly 500-700 words). Do not add any commentary — only the resume."""


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
    skills_hint = f"\nKey requirements extracted from JD: {', '.join(must_haves[:20])}" if must_haves else ""
    focus_hint = f"\nExtra instruction from user: {focus}" if focus else ""
    prompt = _build_prompt(job_title, company, clean_jd, skills_hint, focus_hint, resume_text)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text.strip()


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
    skills_hint = f"\nKey requirements extracted from JD: {', '.join(must_haves[:20])}" if must_haves else ""
    focus_hint = f"\nExtra instruction from user: {focus}" if focus else ""
    prompt = _build_prompt(job_title, company, clean_jd, skills_hint, focus_hint, resume_text)
    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            yield text
