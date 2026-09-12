import os
import re

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

from leaderboard import leaderboard_bp
from practice import practice_bp
from scoring import analyze_idea
from storage import init_db, save_submission

load_dotenv()

app = Flask(__name__)
app.register_blueprint(leaderboard_bp)
app.register_blueprint(practice_bp)
init_db()

MAX_IDEA_LENGTH = 5000


def idea_title(idea: str) -> str:
    first_line = idea.strip().splitlines()[0]
    first_line = re.sub(r"\s+", " ", first_line)
    if len(first_line) <= 80:
        return first_line
    return first_line[:77].rstrip() + "..."


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    payload = request.get_json(silent=True) or {}
    idea = (payload.get("idea") or "").strip()

    if not idea:
        return jsonify({"error": "Describe your idea first."}), 400

    if len(idea) > MAX_IDEA_LENGTH:
        return jsonify({"error": f"Keep it under {MAX_IDEA_LENGTH} characters."}), 400

    if not os.environ.get("GEMINI_API_KEY"):
        return jsonify({"error": "GEMINI_API_KEY is not set on the server."}), 500

    try:
        result = analyze_idea(idea)
        scores = result.get("scores") or {}
        save_submission(
            title=idea_title(idea),
            pitch_readiness=scores.get("pitch_readiness"),
            win_probability=scores.get("win_probability"),
        )
        return jsonify(result)
    except Exception:
        return jsonify(
            {"error": "Analysis failed. Gemini may be busy — try again in a minute."}
        ), 502

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1", host="0.0.0.0", port=port)
