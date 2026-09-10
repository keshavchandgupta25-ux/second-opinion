import os

from flask import Flask, jsonify, render_template, request

from second_opinion import get_second_opinion, parse_sections

app = Flask(__name__)

MAX_IDEA_LENGTH = 5000


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
        return (
            jsonify({"error": f"Keep it under {MAX_IDEA_LENGTH} characters."}),
            400,
        )

    if not os.environ.get("GEMINI_API_KEY"):
        return jsonify({"error": "GEMINI_API_KEY is not set on the server."}), 500

    try:
        raw = get_second_opinion(idea)
        sections = parse_sections(raw)
        return jsonify({"raw": raw, "sections": sections})
    except Exception as exc:
        return jsonify({"error": f"Analysis failed: {exc}"}), 502


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
