from flask import Blueprint, jsonify, render_template, request

import re

from second_opinion import generate_with_retry

practice_bp = Blueprint("practice", __name__)

PRACTICE_PROMPT = """You are a concise pitch coach for hackathon teams.
A founder just rehearsed a spoken pitch.

Elapsed time: {seconds} seconds
Transcript:
\"\"\"{transcript}\"\"\"

Give feedback in these labeled sections:

1. CLARITY: How clear was the idea? What was confusing?
2. PACING: Comment on speaking speed relative to the {seconds} seconds used. Was it rushed, slow, or about right?
3. FILLER WORDS: Call out filler words or rambling, with a concrete suggestion.
4. DELIVERY SCORE: Give an integer score from 0 to 10 for overall delivery quality
   (clarity + pacing + confidence combined). Be honest, not falsely encouraging.
   Use this exact format on its own line: DELIVERY SCORE: N/10
   Then one line starting with REASON: explaining the score in one sentence.

Be direct, specific, and kind. Keep it short."""


def _parse_delivery_score(text: str) -> dict:
    score = None
    reason = ""

    match = re.search(r"DELIVERY SCORE\s*:?\s*(\d+)\s*/\s*10", text, re.IGNORECASE)
    if match:
        try:
            score = max(0, min(10, int(match.group(1))))
        except ValueError:
            score = None

    reason_match = re.search(
        r"DELIVERY SCORE\s*:?\s*[^\n]*\n\s*REASON\s*:?\s*(.+)",
        text,
        re.IGNORECASE,
    )
    if reason_match:
        reason = reason_match.group(1).strip().split("\n")[0]

    return {"delivery_score": score, "delivery_reason": reason}


@practice_bp.route("/practice")
def practice_page():
    return render_template("practice.html")


@practice_bp.route("/api/practice", methods=["POST"])
def practice_feedback():
    payload = request.get_json(silent=True) or {}
    transcript = (payload.get("transcript") or "").strip()
    seconds = payload.get("seconds")

    if not transcript:
        return jsonify({"error": "No speech was captured. Try again closer to the mic."}), 400

    try:
        seconds_value = int(seconds)
    except (TypeError, ValueError):
        seconds_value = 0

    seconds_value = max(1, min(180, seconds_value))

    try:
        prompt = PRACTICE_PROMPT.replace("{seconds}", str(seconds_value)).replace(
            "{transcript}", transcript
        )
        feedback = generate_with_retry(prompt)
        score_info = _parse_delivery_score(feedback)
        return jsonify(
            {
                "feedback": feedback,
                "seconds": seconds_value,
                "delivery_score": score_info["delivery_score"],
                "delivery_reason": score_info["delivery_reason"],
            }
        )
    except Exception:
        return jsonify(
            {"error": "Could not get pitch feedback right now. Try again in a minute."}
        ), 502