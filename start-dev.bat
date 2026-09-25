@echo off
echo ===================================================
echo   CLINOVA AI - Instant Live Hot-Reload Dev Server
echo ===================================================
echo.
echo [1/2] Starting Database, Redis, and Backend in Docker...
docker compose up -d db redis backend
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to start Docker backend services. Make sure Docker Desktop is running.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Launching Next.js Frontend with Instant Fast Refresh...
echo Any changes you save in VS Code will update in your browser instantly!
echo App URL: http://localhost:3000
echo.
cd frontend
npm run dev
