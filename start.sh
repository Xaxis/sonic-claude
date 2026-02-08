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
echo "2. Open Sonic Pi and load a composition"
echo "3. Press Run in Sonic Pi (Cmd+R)"
echo "4. Use the web interface to control the music!"
echo ""
echo "🔧 Sonic Pi OSC Configuration:"
echo "   - Go to Preferences → IO → Network"
echo "   - Verify OSC Server Port: 4560"
echo "   - Verify OSC Server Host: 127.0.0.1"
echo "   - OSC reception is enabled by default!"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "========================================"
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start the FastAPI backend server
echo "Starting backend server..."
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/sonic-claude-backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start the frontend dev server with proper environment
echo "Starting frontend server..."
cd frontend && npm run dev -- --host 0.0.0.0 > /tmp/sonic-claude-frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Servers started!"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "📊 View logs:"
echo "   Backend:  tail -f /tmp/sonic-claude-backend.log"
echo "   Frontend: tail -f /tmp/sonic-claude-frontend.log"
echo ""

# Wait for both processes
wait

