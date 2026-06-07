import re

ML_ROLE_PATTERNS = [
    r"\bml\b",
    r"\bmachine\s+learning\b",
    r"\bai\b",
    r"\bartificial\s+intelligence\b",
    r"\bdeep\s+learning\b",
    r"\bmlops\b",
    r"\bllm\b",
    r"\blarge\s+language\b",
    r"\bapplied\s+scientist\b",
    r"\bresearch\s+engineer\b",
    r"\bcomputer\s+vision\b",
    r"\bnlp\b",
    r"\bnatural\s+language\b",
    r"\breinforcement\s+learning\b",
    r"\bdata\s+scientist\b",
    r"\bml\s+engineer\b",
    r"\bai\s+engineer\b",
    r"\bml\s+platform\b",
    r"\bai\s+platform\b",
    r"\bai\s+infrastructure\b",
    r"\bml\s+infrastructure\b",
    r"\bmodel\s+engineer\b",
    r"\bgenai\b",
    r"\bgenerative\s+ai\b",
    r"\bmultimodal\b",
]

_PATTERN = re.compile("|".join(ML_ROLE_PATTERNS), re.IGNORECASE)


def is_ml_role(title: str) -> bool:
    return bool(_PATTERN.search(title))


def infer_remote(title: str, location: str, description: str) -> str:
    combined = f"{title} {location} {description}".lower()
    if "remote" in combined and "no remote" not in combined and "not remote" not in combined:
        if "hybrid" in combined:
            return "hybrid"
        return "remote"
    if "hybrid" in combined:
        return "hybrid"
    if location and any(x in location.lower() for x in ["remote", "anywhere"]):
        return "remote"
    return "onsite"
