# Second Opinion

AI tool that stress-tests hackathon and startup ideas instead of just validating them.

Built for **Hack Days Solan 2026** using the Google Gemini API (`gemini-flash-lite-latest`).

## What's Really Doing

1. Extracts the core assumptions behind an idea
2. Identifies the single riskiest assumption
3. Generates the toughest question a skeptical judge would ask
4. Suggests 2–3 concrete ways to patch the weakness
5. Adds Pitch Readiness and Win Probability as **AI-generated heuristic estimates, not scientific predictions**
6. Optional voice input/output in the browser
7. Local leaderboard of past critiques
8. Isolated Practice Pitch page (webcam self-view + transcript feedback)

## Setup

```powershell
cd C:\Users\User\Projects\second-opinion
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Put your real key in `.env` as `GEMINI_API_KEY=...` (never commit `.env`).

## Run (CLI)

```powershell
python second_opinion.py
```

## Run (Web UI)

```powershell
python app.py
```

Open http://127.0.0.1:5000

- Leaderboard: http://127.0.0.1:5000/leaderboard
- Practice Pitch: http://127.0.0.1:5000/practice

Voice and webcam features work best in Chrome or Edge, and the browser must be allowed mic/camera access.

## Project structure

- `second_opinion.py` — Gemini prompt, retry logic, response parsing
- `scoring.py` — extra score fields on the same critique flow
- `app.py` — Flask server
- `storage.py` — local SQLite leaderboard
- `leaderboard.py` — `/leaderboard` route
- `practice.py` — isolated `/practice` route
- `templates/` and `static/` — frontend
