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

# Check if SuperCollider is installed
echo "🎹 Checking SuperCollider..."
if command -v scsynth &> /dev/null && command -v sclang &> /dev/null; then
    echo "✅ SuperCollider found: $(scsynth -v 2>&1 | head -n 1)"
    SC_AVAILABLE=true
else
    echo "⚠️  SuperCollider not found - audio synthesis will be limited"
    echo "   Install SuperCollider from: https://supercollider.github.io/"
    echo "   The system will still work, but without real-time audio synthesis"
    SC_AVAILABLE=false
fi
echo ""

echo "🚀 Starting Backend and Frontend Servers..."
echo ""

# Kill any existing processes on ports 8000, 3000, 57120, and 57121
echo "🧹 Cleaning up any existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null && echo "   Killed existing backend on port 8000" || echo "   Port 8000 is free"
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "   Killed existing frontend on port 3000" || echo "   Port 3000 is free"
lsof -ti:57120 | xargs kill -9 2>/dev/null && echo "   Killed existing sclang on port 57120" || echo "   Port 57120 is free"
lsof -ti:57121 | xargs kill -9 2>/dev/null && echo "   Killed existing audio analyzer on port 57121" || echo "   Port 57121 is free"

# Kill any existing scsynth and sclang processes
pkill -9 scsynth 2>/dev/null && echo "   Killed existing scsynth" || echo "   No existing scsynth"
pkill -9 sclang 2>/dev/null && echo "   Killed existing sclang" || echo "   No existing sclang"
echo ""

# Now start SuperCollider AFTER cleanup
if [ "$SC_AVAILABLE" = true ]; then
    echo "🎵 Starting SuperCollider audio server..."

    # Start scsynth (SuperCollider audio server) in background
    # -u 57110: OSC command port (where Python sends commands)
    # -a 48000: Sample rate
    # -z 64: Block size
    scsynth -u 57110 -a 48000 -z 64 > /tmp/scsynth.log 2>&1 &
    SCSYNTH_PID=$!

    echo "✅ SuperCollider audio server started (PID: $SCSYNTH_PID)"
    echo "   Listening on port 57110 (OSC commands)"
    echo "   SynthDefs will be loaded by Python backend"
    echo ""

    # Wait for scsynth to boot (increased to 5 seconds to ensure it's fully ready)
    sleep 5

    # Start sclang OSC relay (forwards SendReply messages to Python)
    echo "🔗 Starting OSC relay (sclang)..."
    # Set XDG_CONFIG_HOME to use our empty startup.scd instead of user's
    # This prevents SuperDirt and other user configs from loading
    export XDG_CONFIG_HOME="$(pwd)/backend/supercollider"
    sclang backend/supercollider/osc_relay.scd > /tmp/sclang_relay.log 2>&1 &
    SCLANG_PID=$!
    unset XDG_CONFIG_HOME
    echo "✅ OSC relay started (PID: $SCLANG_PID)"
    echo "   Forwarding scsynth messages to Python on port 57121"
    echo ""

    # Wait for sclang to initialize
    sleep 2

    # Store the PIDs for cleanup
    SC_PID=$SCSYNTH_PID
    SCLANG_RELAY_PID=$SCLANG_PID
else
    SC_PID=""
    SCLANG_RELAY_PID=""
fi

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

    # Stop SuperCollider if it was started
    if [ -n "$SC_PID" ]; then
        echo "   Stopping SuperCollider audio server (PID: $SC_PID)..."
        kill $SC_PID 2>/dev/null
        # Give it a moment to shut down gracefully
        sleep 1
        # Force kill if still running
        kill -9 $SC_PID 2>/dev/null
    fi

    # Stop sclang OSC relay if it was started
    if [ -n "$SCLANG_RELAY_PID" ]; then
        echo "   Stopping OSC relay (PID: $SCLANG_RELAY_PID)..."
        kill $SCLANG_RELAY_PID 2>/dev/null
        sleep 1
        kill -9 $SCLANG_RELAY_PID 2>/dev/null
    fi

    # Stop backend and frontend
    echo "   Stopping backend and frontend servers..."
    kill $BACKEND_PID $FRONTEND_PID $BACKEND_LOGGER_PID $FRONTEND_LOGGER_PID 2>/dev/null

    # Clean up named pipes
    rm -f "$BACKEND_PIPE" "$FRONTEND_PIPE" 2>/dev/null

    # Clean up log files
    rm -f /tmp/scsynth.log /tmp/sclang_relay.log 2>/dev/null

    echo "✅ All servers stopped"
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
if [ -n "$SC_PID" ]; then
    echo "   SuperCollider PID: $SC_PID (audio engine)"
fi
echo "   Backend PID: $BACKEND_PID (auto-reload on code changes)"
echo "   Frontend PID: $FRONTEND_PID (HMR on code changes)"
echo ""
echo "🔄 Auto-reload enabled - watching for changes..."
echo "   - Backend: Changes to backend/ will auto-reload"
echo "   - Frontend: Changes to frontend/src/ will hot-reload in browser"
if [ -n "$SC_PID" ]; then
    echo "   - SuperCollider: Audio engine running with all SynthDefs loaded"
fi
echo ""
echo "========================================"
echo ""

# Wait for both processes
wait

