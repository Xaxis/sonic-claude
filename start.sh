#!/bin/bash

# Sonic Claude - Startup Script
# Clean, simple startup for the complete pipeline

set -e  # Exit on error

echo "🎵 Sonic Claude - Starting..."
echo ""

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -9 scsynth 2>/dev/null || true
pkill -9 sclang 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:57110 | xargs kill -9 2>/dev/null || true
lsof -ti:57120 | xargs kill -9 2>/dev/null || true
lsof -ti:57121 | xargs kill -9 2>/dev/null || true
sleep 1
echo ""

# Start scsynth (SuperCollider audio server)
echo "🎹 Starting scsynth (port 57110)..."
scsynth -u 57110 -a 48000 -z 64 > /tmp/scsynth.log 2>&1 &
SCSYNTH_PID=$!
echo "   PID: $SCSYNTH_PID"
sleep 3
echo ""

# Start sclang OSC relay
echo "🔗 Starting sclang OSC relay (port 57120 → 57121)..."
export XDG_CONFIG_HOME="$(pwd)/backend/supercollider"
sclang backend/supercollider/osc_relay.scd > /tmp/sclang_relay.log 2>&1 &
SCLANG_PID=$!
unset XDG_CONFIG_HOME
echo "   PID: $SCLANG_PID"
sleep 2
echo ""

# Start backend
echo "🐍 Starting Python backend (port 8000)..."
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "   PID: $BACKEND_PID"
sleep 3
echo ""

# Start frontend
echo "⚛️  Starting React frontend (port 3000)..."
cd frontend
npm run dev -- --host 0.0.0.0 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "   PID: $FRONTEND_PID"
echo ""

echo "✅ All services started!"
echo ""
echo "🌐 URLs:"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo ""
echo "📊 Showing combined logs (backend + frontend)..."
echo "   Press Ctrl+C to stop all services"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."

    # Kill the tail process first
    kill $TAIL_PID 2>/dev/null || true

    # Kill all child processes by finding them
    pkill -P $SCSYNTH_PID 2>/dev/null || true
    pkill -P $SCLANG_PID 2>/dev/null || true
    pkill -P $BACKEND_PID 2>/dev/null || true
    pkill -P $FRONTEND_PID 2>/dev/null || true

    # Kill the parent processes
    kill $SCSYNTH_PID 2>/dev/null || true
    kill $SCLANG_PID 2>/dev/null || true
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true

    sleep 2

    # Force kill anything still running by name
    pkill -9 scsynth 2>/dev/null || true
    pkill -9 sclang 2>/dev/null || true
    pkill -9 -f "uvicorn backend.main" 2>/dev/null || true
    pkill -9 -f "vite --host" 2>/dev/null || true

    # Force kill by port
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:57110 | xargs kill -9 2>/dev/null || true
    lsof -ti:57120 | xargs kill -9 2>/dev/null || true
    lsof -ti:57121 | xargs kill -9 2>/dev/null || true

    echo "✅ All services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Show combined logs from backend and frontend
tail -f /tmp/backend.log /tmp/frontend.log 2>/dev/null &
TAIL_PID=$!

# Wait for any process to exit
wait

