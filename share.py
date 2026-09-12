from flask import Blueprint, jsonify, render_template, request, url_for

from share_store import create_share, get_share

share_bp = Blueprint("share", __name__)

MAX_FIELD_LENGTH = 4000
MAX_REASON_LENGTH = 500
MAX_TITLE_LENGTH = 120

ALLOWED_SECTION_KEYS = {"assumptions", "riskiest", "question", "patch", "raw"}


def _clean(value, limit=MAX_FIELD_LENGTH) -> str:
    if not isinstance(value, str):
        return ""
    return value.strip()[:limit]


def _clean_score(value):
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return value
    return None


@share_bp.route("/api/share", methods=["POST"])
def create_share_link():
    payload = request.get_json(silent=True) or {}

    idea_title = _clean(payload.get("title"), MAX_TITLE_LENGTH) or "Untitled idea"
    raw_sections = payload.get("sections")
    raw_scores = payload.get("scores")

    if not isinstance(raw_sections, dict) or not isinstance(raw_scores, dict):
        return jsonify({"error": "Nothing to share yet — analyze an idea first."}), 400

    sections = {
        key: _clean(raw_sections.get(key))
        for key in ALLOWED_SECTION_KEYS
        if raw_sections.get(key)
    }

    if not sections:
        return jsonify({"error": "Nothing to share yet — analyze an idea first."}), 400

    scores = {
        "pitch_readiness": _clean_score(raw_scores.get("pitch_readiness")),
        "pitch_reason": _clean(raw_scores.get("pitch_reason"), MAX_REASON_LENGTH),
        "win_probability": _clean_score(raw_scores.get("win_probability")),
        "win_reason": _clean(raw_scores.get("win_reason"), MAX_REASON_LENGTH),
    }

    record = {
        "title": idea_title,
        "sections": sections,
        "scores": scores,
        "raw": _clean(payload.get("raw")),
    }

    try:
        share_id = create_share(idea_title, record)
    except Exception:
        return jsonify(
            {"error": "Could not create a share link right now. Try again in a minute."}
        ), 502

    return jsonify(
        {
            "id": share_id,
            "url": url_for("share.share_page", share_id=share_id, _external=True),
        }
    )


@share_bp.route("/share/<share_id>")
def share_page(share_id):
    try:
        record = get_share(share_id)
    except Exception:
        record = None

    if not record:
        return render_template("share.html", not_found=True), 404

    return render_template("share.html", not_found=False, share=record)
