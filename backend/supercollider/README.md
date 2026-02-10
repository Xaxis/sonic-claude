# SuperCollider Integration

This directory contains SuperCollider SynthDefs and initialization scripts for the Sonic Claude audio engine.

## Quick Start

### 1. Start SuperCollider

Open SuperCollider IDE and run the initialization script:

```supercollider
// In SuperCollider IDE, execute this line:
load("/path/to/sonic-claude/backend/supercollider/init.scd");
```

Or use the absolute path from your project:

```supercollider
load("/Users/wilneeley/Projects/sonic-claude/backend/supercollider/init.scd");
```

This will:
- Boot the SuperCollider server (if not already running)
- Load all SynthDefs (basic, bass, drums, leads, pads, monitoring)
- Configure audio settings (48kHz, stereo, low latency)
- Set up OSC communication with Python backend

### 2. Start the Python Backend

The Python backend will automatically:
- Connect to SuperCollider on port 57110 (OSC commands)
- Listen for audio data on port 57120 (audio analysis)
- Create an `audioMonitor` synth to tap the master output bus
- Stream real-time FFT/waveform data to the frontend

### 3. Verify Connection

In SuperCollider, you should see:
```
✅ Server booted successfully
📦 Loading SynthDefs...
✅ Monitoring SynthDefs loaded successfully
✅ All SynthDefs loaded successfully
🎵 Sonic Claude Audio Engine Ready!
```

In Python backend logs, you should see:
```
🎤 Starting audio analyzer (listening on port 57120)
✅ Created audioMonitor synth (ID: 1000) on master bus
✅ Audio analyzer started successfully (monitoring SC master bus)
```

## Architecture

### Audio Flow

```
SuperCollider Audio Engine
  ↓ (master output bus 0)
audioMonitor SynthDef
  ↓ (OSC /audio_monitor messages @ 60 Hz)
Python AudioAnalyzer (port 57120)
  ↓ (FFT analysis + waveform extraction)
WebSocket Service
  ↓ (real-time data stream)
Frontend AudioEngineContext
  ↓ (useAudioEngine() hook)
Loop Visualizer Panel (waveform + spectrum)
```

### OSC Communication

**Python → SuperCollider (port 57110)**:
- `/s_new` - Create synths
- `/n_set` - Set synth parameters
- `/n_free` - Free synths
- `/s_new audioMonitor ...` - Create monitoring synth

**SuperCollider → Python (port 57120)**:
- `/audio_monitor [node_id, reply_id, left_sample, right_sample]` - Audio samples @ 60 Hz
- `/peak_monitor [node_id, reply_id, peakL, peakR, rmsL, rmsR]` - Level meters @ 30 Hz

## SynthDefs

### Monitoring SynthDefs

**`\audioMonitor`** - Real-time audio analysis
- Taps the master output bus (non-destructive)
- Sends stereo audio samples to Python @ 60 Hz
- Used by Loop Visualizer for waveform/spectrum display

**`\peakMonitor`** - Level metering
- Calculates peak and RMS levels
- Sends level data to Python @ 30 Hz
- Used for metering panels

### Instrument SynthDefs

See individual files in `synthdefs/` directory:
- `basic.scd` - Sine, saw, square, triangle oscillators
- `bass.scd` - Sub bass, acid bass, FM bass, Reese bass
- `drums.scd` - Kick, snare, hi-hat, clap
- `leads.scd` - Pluck, arp, lead synths
- `pads.scd` - Warm pad, strings, choir

## Troubleshooting

### "audioMonitor SynthDef not found"

Make sure you've run `init.scd` to load all SynthDefs before starting the Python backend.

### "No audio data received"

1. Check that SuperCollider server is running: `s.serverRunning` should return `true`
2. Check that audioMonitor synth is created: `s.queryAllNodes` should show node 1000
3. Check that audio is playing through SuperCollider (not just system audio)

### "OSC port already in use"

If port 57120 is already in use, you can change it in:
- `backend/services/audio_analyzer.py` - Change `listen_port` parameter
- `backend/supercollider/synthdefs/monitoring.scd` - Update OSC target port

## Testing

### Test Audio Monitoring

In SuperCollider, play a test tone:

```supercollider
// Play a 440 Hz sine wave
x = Synth(\sine, [\freq, 440, \amp, 0.3]);

// You should see the waveform/spectrum in the Loop Visualizer Panel
// Stop the tone
x.free;
```

### Test with Music

Play any audio through SuperCollider and it will be visualized in real-time in the Loop Panel.


