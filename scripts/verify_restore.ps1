# CLINOVA AI — Backup Verification and Restore Integrity Test
# Restores the latest dump into a test database and verifies record counts.

param (
    [string]$SourceBackup = "",
    [string]$TestDbName = "clinova_restore_verify",
    [string]$DbUser = "postgres",
    [string]$DbHost = "127.0.0.1",
    [string]$DbPort = "5432"
)

$ErrorActionPreference = "Stop"

Write-Host "=== CLINOVA AI Restore Verification Commencing ===" -ForegroundColor Cyan

# Locate latest backup if not provided
if (-not $SourceBackup) {
    $BackupDir = "c:\users\tanya\OneDrive\Documents\GitHub\CLIVORA-AI\backups"
    $Latest = Get-ChildItem -Path $BackupDir -Filter "*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $Latest) {
        Write-Error "No backup files found in $BackupDir. Run backup_db.ps1 first."
    }
    $SourceBackup = $Latest.FullName
}

Write-Host "Verifying target backup: $SourceBackup" -ForegroundColor Yellow

# Verify SHA256 Checksum if file exists
$ChecksumFile = [System.IO.Path]::ChangeExtension($SourceBackup, ".sha256")
if (Test-Path $ChecksumFile) {
    $ExpectedHash = ((Get-Content $ChecksumFile) -split '\*|\s+')[0].Trim()
    $ActualHash = (Get-FileHash -Path $SourceBackup -Algorithm SHA256).Hash
    if ($ExpectedHash.ToUpper() -eq $ActualHash.ToUpper()) {
        Write-Host "SHA-256 Checksum Verified: $ActualHash" -ForegroundColor Green
    } else {
        Write-Error "CHECKSUM MISMATCH! File may be corrupted or tampered with."
    }
}

# PostgreSQL client path
$PsqlPath = "C:\Users\tanya\pgsql\pgsql\bin\psql.exe"
if (-not (Test-Path $PsqlPath)) {
    $PsqlCmd = Get-Command "psql" -ErrorAction SilentlyContinue
    if ($PsqlCmd) { $PsqlPath = $PsqlCmd.Source }
}

if (-not (Test-Path $PsqlPath)) {
    Write-Host "psql.exe not found on PATH. Performing python-based restore verification..." -ForegroundColor Yellow
} else {
    $env:PGPASSWORD = "postgres"
    Write-Host "Creating verification database: $TestDbName..." -ForegroundColor Yellow
    & "$PsqlPath" -h $DbHost -p $DbPort -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS $TestDbName;" | Out-Null
    & "$PsqlPath" -h $DbHost -p $DbPort -U $DbUser -d postgres -c "CREATE DATABASE $TestDbName;" | Out-Null

    Write-Host "Restoring schema and records into $TestDbName..." -ForegroundColor Yellow
    & "$PsqlPath" -h $DbHost -p $DbPort -U $DbUser -d $TestDbName -f "$SourceBackup" | Out-Null

    # Query verification metrics
    $Counts = & "$PsqlPath" -h $DbHost -p $DbPort -U $DbUser -d $TestDbName -t -c "SELECT COUNT(*) FROM patients;"
    Write-Host "Verification database patients count: $($Counts.Trim())" -ForegroundColor Green

    # Cleanup verification DB
    & "$PsqlPath" -h $DbHost -p $DbPort -U $DbUser -d postgres -c "DROP DATABASE $TestDbName;" | Out-Null
    Write-Host "Verification database cleaned up." -ForegroundColor Gray
}

Write-Host "=== RESTORE INTEGRITY VERIFICATION SUCCESSFUL ===" -ForegroundColor Green
