# Second Opinion

AI tool that stress-tests hackathon and startup ideas instead of just validating them.

Built for **Hack Days Solan 2026** using the Google Gemini API.

## What it does

1. Extracts the core assumptions behind an idea
2. Identifies the single riskiest assumption
3. Generates the toughest question a skeptical judge would ask
4. Suggests 2–3 concrete ways to patch the weakness

## Setup

```powershell
cd C:\Users\User\Projects\second-opinion
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Set your API key (already configured if `GEMINI_API_KEY` is in your Windows environment):

```powershell
$env:GEMINI_API_KEY = "your-key-here"
```

## Run (CLI)

```powershell
python second_opinion.py
```

## Run (Web UI)

```powershell
python app.py
```

Open http://127.0.0.1:5000

## Project structure

- `second_opinion.py` — Gemini prompt, retry logic, response parsing
- `app.py` — Flask API + web server
- `templates/index.html` — frontend
- `static/style.css` — styling
