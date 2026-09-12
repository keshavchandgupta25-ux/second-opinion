import os
import re
import time

from google import genai

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
_client = None


def get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set.")
        _client = genai.Client(api_key=api_key)
    return _client


def generate_with_retry(prompt: str, max_retries: int = 4) -> str:
    """Call Gemini with retries for transient errors such as 503."""
    for attempt in range(max_retries):
        try:
            response = get_client().models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
            )
            return response.text
        except Exception:
            if attempt == max_retries - 1:
                raise
            time.sleep(10)

    return "Sorry, Gemini's servers are too busy right now. Try again in a few minutes."


def get_second_opinion(idea: str, max_retries: int = 4) -> str:
    prompt = PROMPT_TEMPLATE.replace("{idea}", idea)
    return generate_with_retry(prompt, max_retries=max_retries)


SECTION_PATTERNS = [
    ("assumptions", r"(?:\d+\.\s*)?ASSUMPTIONS?\s*:?\s*"),
    ("riskiest", r"(?:\d+\.\s*)?RISKIEST ASSUMPTION\s*:?\s*"),
    ("question", r"(?:\d+\.\s*)?TOUGH QUESTION\s*:?\s*"),
    ("patch", r"(?:\d+\.\s*)?HOW TO PATCH IT\s*:?\s*"),
]


def parse_sections(text: str) -> dict[str, str]:
    """Split Gemini output into labeled sections for the UI."""
    sections = {key: "" for key, _ in SECTION_PATTERNS}
    matches = []

    for key, pattern in SECTION_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            matches.append((match.start(), key, match.end()))

    matches.sort(key=lambda item: item[0])

    for index, (_, key, start) in enumerate(matches):
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

