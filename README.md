# Sonic Claude - AI-Powered DJ & Music Synthesis System

A full-stack web application for real-time AI-controlled music synthesis and DJing using Sonic Pi.

## 🎵 Architecture

```
Web Interface (Browser) ←→ FastAPI Backend ←→ Sonic Pi (OSC)
     ↓                           ↓                    ↓
  Controls                  OSC Bridge          Live Synthesis
  Visualizer               Sample Catalog       Real-time Audio
  AI Chat                  WebSocket
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Sonic Pi OSC

1. Open **Sonic Pi**
2. Go to **Preferences** → **IO** → **Network**
3. Note the **OSC Server Port** (default: 4560)
4. Note the **OSC Server Host** (default: 127.0.0.1)
5. OSC reception is **enabled by default** - no checkbox needed!

### 3. Start the Backend Server

```bash
uvicorn backend.api_server:app --reload
```

Server will start at: `http://localhost:8000`

### 4. Open the Web Interface

Navigate to: **http://localhost:8000**

The WebSocket status indicator should turn green when connected.

### 5. Load the Composition in Sonic Pi

1. Open `web_reactive_masterpiece.rb` in Sonic Pi
2. Press **Run** (Cmd+R)
3. The composition "Resonance" will start playing

### 6. Control the Music!

Use the web interface to control:
- **BPM** (60-180)
- **Intensity** (0-10)
- **Filter Cutoff** (40-130)
- **Reverb Mix** (0-1)
- **Echo Mix** (0-1)
- **Key** (C, C#, D, etc.)
- **Scale** (major, minor, minor_pentatonic, etc.)

## 📁 Project Structure

```
sonic-claude/
├── backend/
│   └── api_server.py          # FastAPI server with OSC bridge
├── frontend/
│   ├── index.html             # Web interface
│   ├── styles.css             # Professional DJ styling
│   └── app.js                 # WebSocket & controls logic
├── web_reactive_masterpiece.rb # OSC-reactive composition
├── requirements.txt           # Python dependencies
└── README.md                  # This file
```

## 🎛️ API Endpoints

- `GET /` - Server status
- `GET /samples` - Complete catalog of Sonic Pi samples and synths
- `POST /osc/send` - Send OSC messages to Sonic Pi
- `WebSocket /ws` - Real-time bidirectional communication

## 🎹 Features

### Web Interface
- **DJ Controls**: Real-time parameter adjustment
- **Waveform Visualizer**: Live audio visualization
- **AI Chat**: Interact with the AI assistant
- **Sample Browser**: Browse all Sonic Pi samples and synths
- **Presets**: Quick-load presets (Melodic House, Ambient, Techno, DnB, Downtempo)

### Composition: "Resonance"
- **Evolution Engine**: Automatic progression through musical phases
- **Intelligent Kick**: Four-on-the-floor with dynamic filtering
- **TB-303 Bassline**: Acid-style bass with web-controlled parameters
- **Prophet Chords**: Lush chord progressions
- **Melodic Lead**: Catchy hook melody
- **Blade Arpeggios**: Shimmering high-frequency textures
- **Dynamic Hi-Hats**: Velocity-varied percussion

All elements respond to web controls in real-time!

## 🔧 Troubleshooting

### WebSocket won't connect
- Ensure backend server is running: `uvicorn backend.api_server:app --reload`
- Check console for errors (F12 in browser)
- Verify server is at `http://localhost:8000`

### Sonic Pi not responding to controls
- Verify Sonic Pi OSC settings (Preferences → IO → Network)
- Ensure `web_reactive_masterpiece.rb` is running in Sonic Pi
- Check OSC port matches (default: 4560)
- Restart Sonic Pi if needed

### No audio from Sonic Pi
- Check Sonic Pi volume and system audio settings
- Verify the composition is running (should see live_loops in Sonic Pi)
- Check for errors in Sonic Pi's log panel

### Python dependencies won't install
- Ensure you have Python 3.8+ installed
- Try: `pip install --upgrade pip`
- Use a virtual environment: `python -m venv venv && source venv/bin/activate`

## 🎼 Sample Catalog

The system includes access to **all Sonic Pi samples**:
- **Drums**: bd_*, sn_*, drum_*
- **Bass**: bass_*
- **Electronic**: elec_*
- **Percussion**: perc_*
- **Ambient**: ambi_*, ambient_*
- **Guitar**: guit_*
- **Tabla**: tabla_*
- **Vinyl**: vinyl_*
- **Glitch**: glitch_*
- **Loops**: loop_*

Plus **30+ synths**: beep, blade, prophet, tb303, hollow, dark_ambience, and more!

## 🎨 Tech Stack

- **Backend**: FastAPI, python-osc, uvicorn, WebSockets
- **Frontend**: Vanilla JS, Canvas API, WebSocket API
- **Music Engine**: Sonic Pi (Ruby-based live coding platform)
- **Protocol**: OSC (Open Sound Control)

## 📝 License

MIT

---

**Created with ❤️ by Sonic Claude**