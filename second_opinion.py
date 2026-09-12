import os
import re
import time

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

from google import genai
from google.genai.errors import ClientError

PROMPT_TEMPLATE = """You are a sharp, skeptical startup mentor and hackathon judge.
Someone has pitched you this idea:

"{idea}"

Do the following, clearly labeled with headers:

1. ASSUMPTIONS: List the 3-4 core assumptions this idea depends on to succeed.
2. RISKIEST ASSUMPTION: Pick the single weakest/riskiest one and explain why in 1-2 sentences.
3. TOUGH QUESTION: Write the single toughest question a skeptical investor or judge would ask about this idea, based on that risky assumption.
4. HOW TO PATCH IT: Give 2-3 concrete suggestions for how the team could strengthen the idea or answer that question well.

Be direct and honest, not falsely encouraging. Keep it concise."""

MODEL_NAME = "gemini-flash-lite-latest"
AUTH_HELP = (
    "Gemini rejected this API key. Get a Google AI Studio key at "
    "https://aistudio.google.com/apikey then put it in GEMINI_API_KEY "
    "or a .env file in this folder, and restart the app."
)
_client = None


def _api_key() -> str:
    key = (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()
    if not key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Copy .env.example to .env, add your key, and restart."
        )
    return key


def get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=_api_key(), vertexai=False)
    return _client


def generate_with_retry(prompt: str, max_retries: int = 4) -> str:
    """Call Gemini. Retry 503s. Do not retry a bad API key."""
    global _client
    api_key = _api_key()
    last_error = None

    for vertexai in (False, True):
        client = genai.Client(api_key=api_key, vertexai=vertexai)
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model=MODEL_NAME,
                    contents=prompt,
                )
                text = (response.text or "").strip()
                if not text:
                    raise RuntimeError("Gemini returned an empty reply. Try a shorter idea.")
                _client = client
                return text
            except ClientError as exc:
                last_error = exc
                print("[Gemini error]", exc.code, exc.status, exc.message)
                if exc.code in (401, 403):
                    break
                if exc.code in (429, 500, 503) and attempt < max_retries - 1:
                    time.sleep(10)
                    continue
                raise
            except Exception as exc:
                last_error = exc
                print("[Gemini error]", type(exc).__name__, exc)
                if attempt == max_retries - 1:
                    raise
                time.sleep(10)

    raise RuntimeError(AUTH_HELP) from last_error


def get_second_opinion(idea: str, max_retries: int = 4) -> str:
    prompt = PROMPT_TEMPLATE.replace("{idea}", idea)
    return generate_with_retry(prompt, max_retries=max_retries)


SECTION_PATTERNS = [
    ("assumptions", r"(?:\d+\.\s*)?ASSUMPTIONS?\s*:?\s*"),
    ("riskiest", r"(?:\d+\.\s*)?RISKIEST ASSUMPTION\s*:?\s*"),
    ("question", r"(?:\d+\.\s*)?TOUGH QUESTION\s*:?\s*"),
    ("patch", r"(?:\d+\.\s*)?HOW TO PATCH IT\s*:?\s*"),
    ("_pitch", r"(?:\d+\.\s*)?PITCH READINESS\s*:?\s*"),
    ("_win", r"(?:\d+\.\s*)?WIN PROBABILITY\s*:?\s*"),
]


def parse_sections(text: str) -> dict:
    """Split Gemini output into labeled sections for the UI."""
    display_keys = ("assumptions", "riskiest", "question", "patch")
    sections = {key: "" for key in display_keys}
    matches = []

    for key, pattern in SECTION_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            matches.append((match.start(), key, match.end()))

    matches.sort(key=lambda item: item[0])

    for index, (_, key, start) in enumerate(matches):
        if key.startswith("_"):
            continue
        end = matches[index + 1][0] if index + 1 < len(matches) else len(text)
        sections[key] = text[start:end].strip()

    if not any(sections.values()):
        sections["raw"] = text.strip()

    return sections


if __name__ == "__main__":
    print("=== Second Opinion ===\n")
    idea = input("Describe your idea: ")
    print("\nAnalyzing...\n")
    result = get_second_opinion(idea)
    print(result)
