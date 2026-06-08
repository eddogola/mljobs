import html
import json
import logging
import re
from anthropic import Anthropic
from app.config import settings

logger = logging.getLogger(__name__)
client = Anthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = """You are an expert ML/AI job description analyzer helping engineers prepare for technical interviews and plan their study.

Extract structured information precisely. For all list fields, use concise 1-5 word skill/concept names — never full sentences. Capture everything technical, including niche research concepts.

Respond only with valid JSON."""

PARSE_PROMPT = """Analyze this ML/AI job description and return a JSON object matching this exact schema.

IMPORTANT: All list items must be short concept/skill names (1-5 words). Never full sentences.

{
  "role_summary": "2-3 sentence plain-English summary of what this role does day-to-day",
  "seniority": "Entry | Mid | Senior | Staff | Principal | Research",
  "ml_domain": "LLMs | Computer Vision | RL | MLOps | Data Platform | General ML | AI Infrastructure | NLP | Multimodal | AI Safety",
  "must_have_technical": ["short skill names, e.g. PyTorch, distributed training, CUDA"],
  "must_have_non_technical": ["e.g. Cross-team collaboration, Technical writing"],
  "nice_to_have_technical": ["e.g. vLLM, Triton kernels, JAX"],
  "tech_stack": {
    "frameworks": ["e.g. PyTorch, JAX, TensorFlow, HuggingFace Transformers"],
    "infra": ["e.g. Kubernetes, AWS, Ray, Spark, Airflow"],
    "languages": ["e.g. Python, C++, CUDA, Rust"],
    "tools": ["e.g. MLflow, W&B, Grafana, dbt"]
  },
  "core_concepts": [
    "Key ML/AI concepts the candidate must know deeply.",
    "Include ALL of: model architectures (Transformer, Diffusion, CNN, SSM, MoE),",
    "training methods (pretraining, SFT, RLHF, DPO, PPO, contrastive),",
    "optimization (quantization, pruning, distillation, LoRA, PEFT, flash attention),",
    "inference (KV cache, speculative decoding, continuous batching, tensor parallelism),",
    "safety/interpretability (mechanistic interpretability, circuits, superposition,",
    "  sparse autoencoders, activation patching, probing, red teaming, constitutional AI,",
    "  scalable oversight, debate, amplification, anomaly detection),",
    "math (information theory, Bayesian inference, measure theory, optimization theory),",
    "evaluation (MMLU, HumanEval, scaling laws, benchmark construction, evals).",
    "Use short names: 'Mechanistic interpretability', 'Sparse autoencoders', 'KV cache', 'LoRA'"
  ],
  "team_name": "name of the specific team or org hiring (e.g. 'Frontier Safety', 'ML Platform', 'Core Research') — null if not clear",
  "hiring_manager": "full name of the hiring manager if explicitly mentioned in the JD — null if not mentioned",
  "experience_signals": ["phrases from the JD that signal seniority level"],
  "red_flags": ["anything concerning: visa restrictions, unclear scope, 24/7 on-call, etc."]
}

Job Description:
{description}

Return only the JSON object, no markdown fences, no explanation."""


def _strip_html(text: str) -> str:
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def parse_job_description(title: str, company: str, description: str) -> dict:
    clean = _strip_html(description)
    prompt = PARSE_PROMPT.replace("{description}", f"Title: {title}\nCompany: {company}\n\n{clean}")

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    return json.loads(raw)
