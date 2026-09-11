from flask import Blueprint, render_template

from storage import list_submissions

leaderboard_bp = Blueprint("leaderboard", __name__)


@leaderboard_bp.route("/leaderboard")
def leaderboard_page():
    submissions = list_submissions()
    return render_template("leaderboard.html", submissions=submissions)
