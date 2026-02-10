# Sonic Claude - AI-Powered Music Synthesis System

An AI-powered DJ/music production application that allows you to:
- Listen to multiple audio sources (Spotify, YouTube, system audio, microphone)
- Select and capture those sources in real-time
- Break down, analyze, and remix audio
- Compose new music with synthesis, effects, and sequencing
- Use an AI agent for suggestions and automation

## Architecture

- **Backend**: FastAPI (Python) + SuperCollider audio engine
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Audio Engine**: SuperCollider (scsynth) for real-time audio synthesis
- **Communication**: REST API + WebSockets + OSC protocol

## Prerequisites

### Required
- **Node.js** (v18+) and npm
- **Python** (3.10+)
- **SuperCollider** (for audio synthesis)

### Installing SuperCollider

**macOS:**
```bash
brew install supercollider
```

**Linux:**
```bash
sudo apt-get install supercollider
```

**Windows:**
Download from https://supercollider.github.io/downloads

## Setup

1. **Clone the repository**
```bash
git clone <repo-url>
cd sonic-claude
```

2. **Install dependencies**
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

3. **Start SuperCollider server**
```bash
# In a separate terminal
scsynth -u 57110
```

4. **Start the application**
```bash
# From project root
./start.sh
```

This will start:
- Backend API server on http://localhost:8000
- Frontend dev server on http://localhost:3000

## Current Status

### ✅ Working Features
- **Backend OSC Integration**: All services (Synthesis, Effects, Mixer, Sequencer) send OSC messages to SuperCollider
- **Synthesis Panel**: Create synths, adjust parameters, play test notes (C4, E4, G4)
- **Transport Panel**: Auto-creates test sequence, playback controls
- **Toast Notifications**: Real-time feedback for all actions
- **State Management**: Global AudioEngineContext with BroadcastChannel sync

### 🚧 In Progress
- Audio input capture (microphone, system audio)
- WebSocket real-time data (spectrum, meters, waveform)
- Sequencer UI for creating/editing sequences
- Effects and Mixer panels

## Usage

1. **Start the app** with `./start.sh`
2. **Synthesis Panel**:
   - Click "Add Synth" to create a synth
   - Click "Play C4/E4/G4" to hear the synth
   - Adjust parameters with knobs
3. **Transport Panel**:
   - Click "Play" to start the test sequence
   - Adjust tempo, see playback position

## Development

- Backend logs: Check terminal running `start.sh`
- Frontend HMR: Vite hot module replacement enabled
- API docs: http://localhost:8000/docs (FastAPI Swagger UI)

## Troubleshooting

**"SuperCollider server failed to start"**
- Make sure `scsynth` is running on port 57110
- Check if SuperCollider is installed: `which scsynth`

**"No sequences available to play"**
- The app auto-creates a test sequence on load
- Check browser console for errors

**Toast notifications not showing**
- Check that `sonner` is installed: `cd frontend && npm list sonner`