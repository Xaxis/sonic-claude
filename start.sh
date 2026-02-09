#!/bin/bash

# Sonic Claude - Startup Script
# This script starts the AI-powered DJ & Music Synthesis System

echo "🎵 Sonic Claude - AI-Powered DJ System"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"
echo ""

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ Error: pip3 is not installed"
    echo "Please install pip3"
    exit 1
fi

echo "✅ pip3 found"
echo ""

# Check if requirements are installed
echo "📦 Checking Python dependencies..."
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "⚠️  Dependencies not installed. Installing now..."
    pip3 install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🚀 Starting Backend and Frontend Servers..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "📋 Next Steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Use the web interface to interact with the AI DJ!"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "========================================"
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID $BACKEND_LOGGER_PID $FRONTEND_LOGGER_PID 2>/dev/null
    rm -f "$BACKEND_PIPE" "$FRONTEND_PIPE" 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Create named pipes for log streaming
BACKEND_PIPE="/tmp/sonic-claude-backend-pipe-$$"
FRONTEND_PIPE="/tmp/sonic-claude-frontend-pipe-$$"
mkfifo "$BACKEND_PIPE" "$FRONTEND_PIPE"

# Function to prefix and colorize logs
stream_backend_logs() {
    while IFS= read -r line; do
        echo -e "\033[1;34m[BACKEND]\033[0m $line"
    done < "$BACKEND_PIPE"
}

stream_frontend_logs() {
    while IFS= read -r line; do
        echo -e "\033[1;32m[FRONTEND]\033[0m $line"
    done < "$FRONTEND_PIPE"
}

# Start log streaming in background
stream_backend_logs &
BACKEND_LOGGER_PID=$!
stream_frontend_logs &
FRONTEND_LOGGER_PID=$!

# Start the FastAPI backend server with auto-reload
echo "Starting backend server (auto-reload enabled)..."
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir backend > "$BACKEND_PIPE" 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start the frontend dev server with HMR (Hot Module Replacement)
echo "Starting frontend server (HMR enabled)..."
cd frontend && npm run dev -- --host 0.0.0.0 > "$FRONTEND_PIPE" 2>&1 &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Servers started!"
echo "   Backend PID: $BACKEND_PID (auto-reload on code changes)"
echo "   Frontend PID: $FRONTEND_PID (HMR on code changes)"
echo ""
echo "🔄 Auto-reload enabled - watching for changes..."
echo "   - Backend: Changes to backend/ will auto-reload"
echo "   - Frontend: Changes to frontend/src/ will hot-reload in browser"
echo ""
echo "========================================"
echo ""

# Wait for both processes
wait

