@echo off
title AttendAI — Smart Attendance System Launcher
color 0A

echo ===============================================================================
echo            AttendAI: AI-Based Attendance System (Face + Voice 2FA)
echo                   College Major Project - Live Demo Launcher
echo ===============================================================================
echo.

:: 1. Check Python
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python was not found in your PATH!
    echo Please install Python 3.10+ and add it to your system PATH.
    pause
    exit /b 1
)
echo [OK] Python detected:
python --version

:: 2. Check Node.js and npm
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\nodejs" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    )
)
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARNING] npm was not found in standard PATH. Trying Node directly...
)

:: 3. Check / create .env if missing
if not exist ".env" (
    echo [INFO] Creating .env from .env.example...
    copy ".env.example" ".env" >nul
)

:: 4. Verify Database & Seed Data
if not exist "attendance.db" (
    echo [INFO] Database not found. Initializing database and generating seed data...
    python -m backend.seed
    if %ERRORLEVEL% neq 0 (
        echo [WARNING] Seeding returned an issue. Continuing with schema init...
    )
) else (
    echo [OK] Database found (attendance.db).
)

echo.
echo -------------------------------------------------------------------------------
echo [1/3] Starting FastAPI Backend on http://localhost:8000 ...
start "AttendAI - FastAPI Backend (Port 8000)" cmd /k "title AttendAI Backend && echo Starting backend server... && uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Starting React Vite Frontend on http://localhost:5173 ...
cd /d "%~dp0frontend"
start "AttendAI - Vite Frontend (Port 5173)" cmd /k "title AttendAI Frontend && echo Starting frontend server... && npm run dev"
cd /d "%~dp0"

echo [3/3] Waiting for servers to initialize...
timeout /t 4 /nobreak >nul

echo.
echo ===============================================================================
echo   System is UP AND RUNNING!
echo   - Frontend:  http://localhost:5173
echo   - Backend:   http://localhost:8000
echo   - Swagger:   http://localhost:8000/docs
echo.
echo   Demo Credentials:
echo     Username:  admin
echo     Password:  admin123
echo ===============================================================================
echo.

:: Open browser
start http://localhost:5173

echo Press any key to stop instructions (background windows will remain open until closed).
pause >nul
