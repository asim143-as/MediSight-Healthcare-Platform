#!/usr/bin/env pwsh
# MediSight AI - Quick Start Setup Script (PowerShell)
# Usage: .\quickstart.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "MediSight AI - Local Development Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if command exists
function Test-CommandExists {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Check prerequisites
Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-CommandExists "node")) {
    Write-Host "ERROR: Node.js is not installed. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

if (-not (Test-CommandExists "python")) {
    Write-Host "ERROR: Python 3.10+ is not installed. Install from https://www.python.org" -ForegroundColor Red
    exit 1
}

if (-not (Test-CommandExists "supabase")) {
    Write-Host "WARNING: Supabase CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g supabase
}

Write-Host "OK: Prerequisites found" -ForegroundColor Green
Write-Host ""

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Step 1: Start Supabase
Write-Host "[2/5] Starting Supabase local services..." -ForegroundColor Yellow
Write-Host "This may take a minute on first run..."
try {
    supabase start 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK: Supabase started" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Supabase may not have started. Ensure Docker is running." -ForegroundColor Yellow
    }
} catch {
    Write-Host "WARNING: Could not start Supabase. Make sure Docker Desktop is installed and running." -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Setup ML Service
Write-Host "[3/5] Setting up ML Service..." -ForegroundColor Yellow
Set-Location "ml-service"

if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..."
    python -m venv venv
    if (-not (Test-Path "venv")) {
        Write-Host "ERROR: Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
}

# Activate venv using different method (more reliable)
$venvPython = ".\venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "ERROR: Virtual environment not properly created" -ForegroundColor Red
    exit 1
}

Write-Host "Installing Python dependencies..."
& $venvPython -m pip install -r requirements.txt

Write-Host "OK: ML Service dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "Starting ML Service on port 8000..." -ForegroundColor Cyan
Write-Host "[Starting] uvicorn app.main:app --reload --port 8000"
$mlCmd = "cd $ScriptDir\ml-service && .\venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
Start-Process cmd -ArgumentList "/K", $mlCmd
Start-Sleep -Seconds 3

Set-Location $ScriptDir

# Step 3: Setup Frontend
Write-Host "[4/5] Setting up Frontend..." -ForegroundColor Yellow
Set-Location "frontend"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Node dependencies..."
    npm install
}

# Create .env.local if it doesn't exist
if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local..."
    @"
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6aXRlY2giLCJyb2xlIjoiYW9uIiwiaWF0IjoxNzIzMTExMDEyLCJleHAiOjE4ODA4NzcwMTJ9.1234567890
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
}

Write-Host "OK: Frontend dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "Starting Frontend on port 3000..." -ForegroundColor Cyan
Write-Host "[Starting] npm run dev"
Start-Process cmd -ArgumentList "/K", "cd $ScriptDir\frontend && npm run dev"
Start-Sleep -Seconds 2

Set-Location $ScriptDir

# Step 4: Display access information
Write-Host "[5/5] Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Services Running" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend:           http://localhost:3000" -ForegroundColor Green
Write-Host "Supabase API:       http://localhost:54321" -ForegroundColor Green
Write-Host "Supabase Studio:    http://localhost:54323" -ForegroundColor Green
Write-Host "ML Service:         http://localhost:8000" -ForegroundColor Green
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open http://localhost:3000 in your browser"
Write-Host "2. Login with your credentials"
Write-Host "3. Start exploring the dashboard!"
Write-Host ""
Write-Host "To stop services:"
Write-Host "- Close the ML Service and Frontend windows"
Write-Host "- Run: supabase stop"
Write-Host ""
Write-Host "For troubleshooting, see LOCAL_SETUP.md" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to continue"
