@echo off
REM MediSight AI - Quick Start Setup Script for Windows
REM This script automates the setup of all three services

setlocal enabledelayedexpansion

echo.
echo ============================================
echo MediSight AI - Local Development Setup
echo ============================================
echo.

REM Check prerequisites
echo [1/5] Checking prerequisites...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Please install Node.js 18+ from https://nodejs.org
    exit /b 1
)

python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python 3.10+ is not installed. Please install from https://www.python.org
    exit /b 1
)

supabase --version >nul 2>&1
if errorlevel 1 (
    echo WARNING: Supabase CLI not found. Installing...
    call npm install -g supabase
)

echo OK: Prerequisites found
echo.

REM Change to project directory
cd /d %~dp0

REM Step 1: Start Supabase
echo [2/5] Starting Supabase local services...
echo This may take a minute on first run...
call supabase start
if errorlevel 1 (
    echo ERROR: Failed to start Supabase. Check if Docker is running.
    exit /b 1
)
echo OK: Supabase started
echo.

REM Step 2: Setup ML Service
echo [3/5] Setting up ML Service...
cd ml-service

if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
echo Installing Python dependencies...
pip install -r requirements.txt >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to install Python dependencies
    exit /b 1
)
echo OK: ML Service dependencies installed
echo.

echo Starting ML Service on port 8000...
echo [Starting] uvicorn app.main:app --reload --port 8000
start cmd /k "cd /d %~dp0ml-service && venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"
timeout /t 2 >nul

cd ..

REM Step 3: Setup Frontend
echo [4/5] Setting up Frontend...
cd frontend

if not exist node_modules (
    echo Installing Node dependencies...
    call npm install >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Failed to install Node dependencies
        exit /b 1
    )
)

REM Create .env.local if it doesn't exist
if not exist .env.local (
    echo Creating .env.local...
    (
        echo NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
        echo NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6aXRlY2giLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyMzExMTAxMiwiZXhwIjoxODgwODc3MDEyfQ.1234567890
    ) > .env.local
)

echo OK: Frontend dependencies installed
echo.

echo Starting Frontend on port 3000...
echo [Starting] npm run dev
start cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 2 >nul

cd ..

REM Step 4: Display access information
echo [5/5] Setup Complete!
echo.
echo ============================================
echo Services Running
echo ============================================
echo.
echo Frontend:      http://localhost:3000
echo Supabase API:  http://localhost:54321
echo Supabase Studio: http://localhost:54323
echo ML Service:    http://localhost:8000
echo.
echo ============================================
echo Next Steps
echo ============================================
echo.
echo 1. Open http://localhost:3000 in your browser
echo 2. Login with your credentials
echo 3. Start exploring the dashboard!
echo.
echo To stop services:
echo - Close the ML Service and Frontend command windows
echo - Run: supabase stop
echo.
echo For troubleshooting, see LOCAL_SETUP.md
echo.

pause
