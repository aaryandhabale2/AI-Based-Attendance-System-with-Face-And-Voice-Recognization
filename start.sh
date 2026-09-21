#!/usr/bin/env bash
# AttendAI — Smart Attendance System Launcher (Linux / macOS)

set -e

echo "==============================================================================="
echo "           AttendAI: AI-Based Attendance System (Face + Voice 2FA)"
echo "                  College Major Project - Demo Launcher"
echo "==============================================================================="
echo ""

# 1. Check Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "[ERROR] Python 3 was not found in PATH."
    exit 1
fi
PYTHON_CMD=$(command -v python3 || command -v python)
echo "[OK] Python detected: $($PYTHON_CMD --version)"

# 2. Check Node & npm
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm was not found in PATH. Please install Node.js (v18+)."
    exit 1
fi
echo "[OK] Node detected: $(node --version)"
echo "[OK] npm detected:  $(npm --version)"

# 3. Check / create .env
if [ ! -f ".env" ]; then
    echo "[INFO] Creating .env from .env.example..."
    cp .env.example .env
fi

# 4. Check DB and Seed
if [ ! -f "attendance.db" ]; then
    echo "[INFO] Database not found. Initializing and seeding..."
    $PYTHON_CMD -m backend.seed
fi

# 5. Trap cleanup on exit
cleanup() {
    echo ""
    echo "[INFO] Shutting down servers..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 6. Start Backend
echo "[1/3] Starting FastAPI Backend on http://localhost:8000 ..."
$PYTHON_CMD -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 7. Start Frontend
echo "[2/3] Starting React Frontend on http://localhost:5173 ..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# 8. Wait and display credentials
sleep 3
echo ""
echo "==============================================================================="
echo "  System is UP AND RUNNING!"
echo "  - Frontend:  http://localhost:5173"
echo "  - Backend:   http://localhost:8000"
echo "  - Swagger:   http://localhost:8000/docs"
echo ""
echo "  Demo Credentials:"
echo "    Username:  admin"
echo "    Password:  admin123"
echo "==============================================================================="
echo ""
echo "Press Ctrl+C to terminate both servers."

# Open browser if possible
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173 &
elif command -v open &> /dev/null; then
    open http://localhost:5173 &
fi

wait
