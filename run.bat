@echo off
cd /d "%~dp0"
echo.
echo Starting Second Opinion...
echo Do NOT use Live Server. Open http://127.0.0.1:5000 after this starts.
echo.

if not exist ".venv\Scripts\python.exe" (
  python -m venv .venv
)

".venv\Scripts\python.exe" -m pip install -r requirements.txt
if not exist ".env" (
  echo.
  echo Create a .env file in this folder with:
  echo GEMINI_API_KEY=your_real_key
  echo.
)

".venv\Scripts\python.exe" app.py
pause
