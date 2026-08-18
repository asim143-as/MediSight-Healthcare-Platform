@echo off
REM MediSight AI - Quick Start (Simple Version)
REM Run from: C:\Users\toshiba\Desktop\MediSight-Healthcare-Platform

cls
echo.
echo ============================================
echo MediSight AI - Local Development Setup
echo ============================================
echo.

REM Check if we're in the right directory
if not exist "frontend" (
    echo ERROR: Please run this from the project root directory
    echo Expected: C:\Users\toshiba\Desktop\MediSight-Healthcare-Platform
    pause
    exit /b 1
)

echo [1/4] Checking prerequisites...
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)
echo OK: Node.js found

where python >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install from https://www.python.org
    pause
    exit /b 1
)
echo OK: Python found
echo.

echo [2/4] Starting Supabase...
call supabase start
if errorlevel 1 (
    echo WARNING: Supabase failed. Make sure Docker Desktop is installed and running.
)
echo OK: Supabase started (check if running at http://localhost:54323)
echo.

echo [3/4] Starting ML Service...
start "ML Service" cmd /k "cd ml-service && python -m venv venv && call venv\Scripts\activate.bat && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000"
timeout /t 3 /nobreak
echo OK: ML Service window opened
echo.

echo [4/4] Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm install && npm run dev"
timeout /t 3 /nobreak
echo OK: Frontend window opened
echo.

echo ============================================
echo Setup Complete!
echo ============================================
echo.
echo Services Starting:
echo   Frontend:      http://localhost:3000
echo   ML Service:    http://localhost:8000
echo   Supabase API:  http://localhost:54321
echo   Supabase UI:   http://localhost:54323
echo.
echo Wait 30-60 seconds for services to fully start.
echo.
pause
