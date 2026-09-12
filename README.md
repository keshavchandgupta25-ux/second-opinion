# Second Opinion

Stress-test a hackathon or startup idea with Gemini (`gemini-flash-lite-latest`).

## Run on Windows (easiest)

1. Open folder `C:\Users\User\Projects\second-opinion` in VS Code (**File → Open Folder**).
2. Copy `.env.example` to `.env` and put your real Gemini key in `.env`.
3. Double-click `run.bat` **or** in the VS Code terminal:

```powershell
cd C:\Users\User\Projects\second-opinion
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

4. Open **http://127.0.0.1:5000** (port **5000**, not 5500).
5. Leave that terminal open. Do **not** click VS Code **Go Live**.

If PowerShell blocks `Activate.ps1`, ignore activation. The commands above use `.venv\Scripts\python.exe` directly.

## Pages

- Critique: http://127.0.0.1:5000
- Leaderboard: http://127.0.0.1:5000/leaderboard
- Practice Pitch: http://127.0.0.1:5000/practice

Mic / webcam work best in Chrome or Edge.

## CLI

```powershell
.\.venv\Scripts\python.exe second_opinion.py
```
