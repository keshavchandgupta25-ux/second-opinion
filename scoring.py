import re
from typing import Optional

from second_opinion import generate_with_retry, parse_sections

SCORED_PROMPT_TEMPLATE = """You are a sharp, skeptical startup mentor and hackathon judge.
Someone has pitched you this idea:

"{idea}"

Do the following, clearly labeled with headers:

1. ASSUMPTIONS: List the 3-4 core assumptions this idea depends on to succeed.
2. RISKIEST ASSUMPTION: Pick the single weakest/riskiest one and explain why in 1-2 sentences.
3. TOUGH QUESTION: Write the single toughest question a skeptical investor or judge would ask about this idea, based on that risky assumption.
4. HOW TO PATCH IT: Give 2-3 concrete suggestions for how the team could strengthen the idea or answer that question well.
5. PITCH READINESS: Give an integer score from 0 to 10 for how ready this idea is to pitch. Be harsh but fair.
   Use this exact format on the first line: PITCH READINESS: N/10
   Then one line starting with REASON: explaining the score.
6. WIN PROBABILITY: Give a rough percent chance this idea wins a typical 1-2 day hackathon if executed well. Be skeptical.
   Use this exact format on the first line: WIN PROBABILITY: N%
   Then one line starting with REASON: explaining the estimate.
   These scores are heuristic estimates, not scientific predictions.

Be direct and honest, not falsely encouraging. Keep it concise."""


def get_scored_opinion(idea: str) -> str:
    prompt = SCORED_PROMPT_TEMPLATE.replace("{idea}", idea)
    return generate_with_retry(prompt)


def _first_int(pattern: str, text: str) -> Optional[int]:
    match = re.search(pattern, text, re.IGNORECASE)
    if not match:
        return None
    try:
        return int(match.group(1))
    except ValueError:
        return None


def parse_scores(text: str) -> dict:
    pitch = _first_int(r"PITCH READINESS\s*:?\s*(\d+)\s*/\s*10", text)
    win = _first_int(r"WIN PROBABILITY\s*:?\s*(\d+)\s*%", text)

    pitch_reason = ""
    win_reason = ""

    pitch_block = re.search(
        r"PITCH READINESS\s*:?\s*[^\n]*\n\s*REASON\s*:?\s*(.+)",
        text,
        re.IGNORECASE,
    )
    if pitch_block:
        pitch_reason = pitch_block.group(1).strip()

    win_block = re.search(
        r"WIN PROBABILITY\s*:?\s*[^\n]*\n\s*REASON\s*:?\s*(.+)",
        text,
        re.IGNORECASE,
    )
    if win_block:
        win_reason = win_block.group(1).strip()

    if pitch is not None:
        pitch = max(0, min(10, pitch))
    if win is not None:
        win = max(0, min(100, win))

    return {
        "pitch_readiness": pitch,
        "pitch_reason": pitch_reason,
        "win_probability": win,
        "win_reason": win_reason,
    }


def analyze_idea(idea: str) -> dict:
    raw = get_scored_opinion(idea)
    return {"raw": raw, "sections": parse_sections(raw), "scores": parse_scores(raw)}
