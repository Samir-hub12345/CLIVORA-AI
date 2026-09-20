@echo off
setlocal
cd /d "%~dp0backend"
echo Starting the local Clinova AI demo backend...
if not exist ".venv\Scripts\python.exe" (
  py -3 -m venv .venv
  if errorlevel 1 goto fail
)
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto fail
set DATABASE_URL=sqlite+aiosqlite:///./clinova-demo.db
set DEBUG=false
set DEMO_MODE=true
set OFFLINE_DEMO=true
set ENVIRONMENT=development
set LLM_PROVIDER=mock
set GEMINI_API_KEY=
".venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
goto end
:fail
echo Setup failed. Read the error above and check that Python is installed.
:end
pause
endlocal