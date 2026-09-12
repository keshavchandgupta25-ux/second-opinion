from flask import Blueprint, jsonify, render_template, request

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

Be direct, specific, and kind. Keep it short."""


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
        seconds_value = 1

    seconds_value = max(1, min(60, seconds_value))

    try:
        prompt = PRACTICE_PROMPT.replace("{seconds}", str(seconds_value)).replace(
            "{transcript}", transcript
        )
        feedback = generate_with_retry(prompt)
        return jsonify({"feedback": feedback, "seconds": seconds_value})
    except Exception as exc:
        print("[practice error]", type(exc).__name__, exc)
        return jsonify(
            {"error": "Could not get pitch feedback right now. Try again in a minute."}
        ), 502
