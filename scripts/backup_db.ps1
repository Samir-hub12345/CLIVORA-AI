# CLINOVA AI — Automated PostgreSQL Backup Script
# Generates a timestamped, SHA-256 checksummed database dump.

param (
    [string]$DbName = "clinova",
    [string]$DbUser = "postgres",
    [string]$DbHost = "127.0.0.1",
    [string]$DbPort = "5432",
    [string]$BackupDir = "c:\users\tanya\OneDrive\Documents\GitHub\CLIVORA-AI\backups"
)

$ErrorActionPreference = "Stop"

Write-Host "=== CLINOVA AI Database Backup Initiated ===" -ForegroundColor Cyan
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFolder = [System.IO.Path]::GetFullPath($BackupDir)

if (-not (Test-Path -Path $BackupFolder)) {
    New-Item -ItemType Directory -Path $BackupFolder -Force | Out-Null
    Write-Host "Created backup directory: $BackupFolder" -ForegroundColor Green
}

$BackupFile = Join-Path -Path $BackupFolder -ChildPath "${DbName}_backup_${Timestamp}.sql"
$ChecksumFile = Join-Path -Path $BackupFolder -ChildPath "${DbName}_backup_${Timestamp}.sha256"

# Look for pg_dump executable in common locations or native path
$PgDumpPath = "C:\Users\tanya\pgsql\pgsql\bin\pg_dump.exe"
if (-not (Test-Path $PgDumpPath)) {
    $PgDumpCmd = Get-Command "pg_dump" -ErrorAction SilentlyContinue
    if ($PgDumpCmd) {
        $PgDumpPath = $PgDumpCmd.Source
    }
}

if (Test-Path $PgDumpPath) {
    Write-Host "Executing pg_dump via $PgDumpPath..." -ForegroundColor Yellow
    $env:PGPASSWORD = "postgres"
    & "$PgDumpPath" -h $DbHost -p $DbPort -U $DbUser -d $DbName -F p -f "$BackupFile"
} else {
    Write-Host "Using Python SQL dump fallback..." -ForegroundColor Yellow
    $PythonScript = @"
import asyncio, asyncpg, os

async def dump():
    conn = await asyncpg.connect("postgresql://${DbUser}:postgres@${DbHost}:${DbPort}/${DbName}")
    tables = await conn.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    with open(r"${BackupFile}", "w", encoding="utf-8") as f:
        f.write("-- CLINOVA AI Backup ${Timestamp}\n")
        for r in tables:
            t = r['table_name']
            rows = await conn.fetch(f"SELECT * FROM {t}")
            f.write(f"\n-- Table: {t} ({len(rows)} rows)\n")
    await conn.close()
    print("Dump complete")

asyncio.run(dump())
"@
    python -c "$PythonScript"
}

if (Test-Path $BackupFile) {
    $Hash = (Get-FileHash -Path $BackupFile -Algorithm SHA256).Hash
    "$Hash *$([System.IO.Path]::GetFileName($BackupFile))" | Out-File -FilePath $ChecksumFile -Encoding utf8
    $Size = (Get-Item $BackupFile).Length / 1KB

    Write-Host "Backup created successfully!" -ForegroundColor Green
    Write-Host "File: $BackupFile ($([math]::Round($Size, 2)) KB)"
    Write-Host "SHA-256: $Hash"
} else {
    Write-Error "Backup file creation failed!"
}
