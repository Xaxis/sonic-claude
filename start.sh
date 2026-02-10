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
cd frontend && npm run dev -- --host 0.0.0.0 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "   PID: $FRONTEND_PID"
echo ""

echo "✅ All services started!"
echo ""
echo "📊 Logs:"
echo "   scsynth:  tail -f /tmp/scsynth.log"
echo "   sclang:   tail -f /tmp/sclang_relay.log"
echo "   backend:  tail -f /tmp/backend.log"
echo "   frontend: tail -f /tmp/frontend.log"
echo ""
echo "🌐 URLs:"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $SCSYNTH_PID $SCLANG_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    sleep 1
    pkill -9 scsynth 2>/dev/null || true
    pkill -9 sclang 2>/dev/null || true
    echo "✅ All services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait
wait

