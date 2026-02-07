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
echo "🚀 Starting Backend Server..."
echo "Server will be available at: http://localhost:8000"
echo ""
echo "📋 Next Steps:"
echo "1. Open http://localhost:8000 in your browser"
echo "2. Open Sonic Pi and load web_reactive_masterpiece.rb"
echo "3. Press Run in Sonic Pi (Cmd+R)"
echo "4. Use the web interface to control the music!"
echo ""
echo "🔧 Sonic Pi OSC Configuration:"
echo "   - Go to Preferences → IO → Network"
echo "   - Verify OSC Server Port: 4560"
echo "   - Verify OSC Server Host: 127.0.0.1"
echo "   - OSC reception is enabled by default!"
echo ""
echo "Press Ctrl+C to stop the server"
echo "========================================"
echo ""

# Start the FastAPI server on localhost
uvicorn backend.api_server:app --reload --host 127.0.0.1 --port 8000

