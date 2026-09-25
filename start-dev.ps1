Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  CLINOVA AI - Instant Live Hot-Reload Dev Server" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/2] Starting Database, Redis, and Backend in Docker..." -ForegroundColor Yellow
docker compose up -d db redis backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start Docker services. Ensure Docker Desktop is running." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[2/2] Launching Next.js Frontend with Instant Fast Refresh..." -ForegroundColor Green
Write-Host "Any changes you save in VS Code will update in your browser instantly in < 1 second!" -ForegroundColor Cyan
Write-Host "App URL: http://localhost:3000" -ForegroundColor Green
Write-Host ""

Set-Location -Path "$PSScriptRoot\frontend"
npm run dev
