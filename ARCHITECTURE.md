# Sonic Claude Backend Architecture

## Overview
Sonic Claude is an AI-integrated DAW with a Python/FastAPI backend, SuperCollider audio engine, and React/TypeScript frontend.

## Core Principles

### 1. **Separation of Concerns**
- **Services** handle business logic (in-memory state)
- **CompositionService** handles ALL persistence
- **API Routes** handle HTTP/WebSocket communication
- **Models** define data structures

### 2. **Dependency Injection**
All services are initialized in `backend/core/dependencies.py` and injected via FastAPI's dependency system.

### 3. **Unified Storage**
ONE composition storage system (`CompositionService`) replaces fragmented storage.

## Directory Structure

```
backend/
├── api/                    # REST API routes
│   ├── ai/                 # AI chat endpoints
│   ├── audio/              # Audio engine control
│   ├── effects/            # Effect management
│   ├── mixer/              # Mixer control
│   ├── sequencer/          # Sequencer CRUD
│   ├── ai_routes.py        # AI endpoints
│   ├── composition_routes.py  # Composition save/load
│   ├── sample_routes.py    # Sample management
│   └── websocket_routes.py # Real-time updates
│
├── core/                   # Core infrastructure
│   ├── config.py           # Configuration management
│   ├── dependencies.py     # Dependency injection
│   ├── engine_manager.py   # SuperCollider OSC communication
│   └── exceptions.py       # Custom exceptions
│
├── models/                 # Data models (Pydantic)
│   ├── ai_actions.py       # AI action definitions
│   ├── composition_snapshot.py  # Complete composition state
│   ├── daw_state.py        # DAW state for AI
│   ├── effects.py          # Effect definitions
│   ├── mixer.py            # Mixer state
│   ├── sample_analysis.py  # Sample analysis results
│   ├── sequence.py         # Sequence/clip/track models
│   └── types.py            # Shared types
│
├── services/               # Business logic services
│   ├── ai_agent_service.py      # AI agent (Claude integration)
│   ├── audio_analyzer.py        # Real-time audio analysis
│   ├── audio_bus_manager.py     # Audio bus allocation
│   ├── audio_feature_extractor.py  # Audio feature extraction
│   ├── audio_input_service.py   # Microphone input
│   ├── buffer_manager.py        # SuperCollider buffer management
│   ├── composition_service.py   # UNIFIED composition storage
│   ├── daw_action_service.py    # Execute AI actions
│   ├── daw_state_service.py     # Build DAW state for AI
│   ├── effect_definitions.py    # Effect registry
│   ├── mixer_channel_service.py # Per-track metering
│   ├── mixer_service.py         # Mixer state (in-memory)
│   ├── musical_context_analyzer.py  # Musical analysis
│   ├── sample_analyzer.py       # Sample audio analysis
│   ├── sequencer_service.py     # Sequencer state (in-memory)
│   ├── synthdef_loader.py       # SynthDef loading
│   ├── synthesis_service.py     # Synthesis control
│   ├── track_effects_service.py # Track effects (in-memory)
│   ├── track_meter_service.py   # Track metering
│   └── websocket_manager.py     # WebSocket broadcasting
│
├── supercollider/          # SuperCollider integration
│   ├── synthdefs/          # SynthDef definitions
│   ├── osc_handlers.scd    # OSC message handlers
│   └── osc_relay.scd       # OSC relay (sclang → Python)
│
└── main.py                 # FastAPI application entry point
```

## Service Architecture

### State Management Services (In-Memory Only)

#### SequencerService
- **Purpose:** Manage sequences, clips, tracks, playback
- **State:** `self.sequences: Dict[str, Sequence]`
- **Persistence:** None (handled by CompositionService)

#### MixerService
- **Purpose:** Manage mixer channels, routing
- **State:** `self.state: MixerState`
- **Persistence:** None (handled by CompositionService)

#### TrackEffectsService
- **Purpose:** Manage per-track effect chains
- **State:** `self.track_effects: Dict[str, TrackEffectChain]`
- **Persistence:** None (handled by CompositionService)

### Persistence Services

#### CompositionService
- **Purpose:** ONLY service that persists composition data
- **Stores:** Complete snapshots (sequence + mixer + effects)
- **Location:** `data/compositions/<id>/`
- **Features:**
  - Manual saves
  - AI iterations
  - Autosave
  - Version history
  - Atomic writes

#### SampleAnalyzer
- **Purpose:** Cache audio analysis results
- **Stores:** Sample analysis cache
- **Location:** `data/samples/cache/`

### AI Services

#### AIAgentService
- **Purpose:** Claude LLM integration for music production
- **Features:**
  - ONE-SHOT requests (no conversation history)
  - Function calling (tool use)
  - Dynamic system prompt with instrument/effect lists
  - Musical context understanding

#### DAWStateService
- **Purpose:** Build complete DAW state snapshot for AI
- **Includes:**
  - All sequences, clips, tracks
  - Mixer state
  - Effect chains
  - Sample analysis
  - Musical context

#### DAWActionService
- **Purpose:** Execute AI actions on DAW
- **Actions:**
  - create_track, create_midi_clip, modify_clip
  - add_effect, set_track_parameter
  - set_tempo, play_sequence, stop_playback

## Data Flow

### User Creates Track
```
Frontend → POST /api/audio-engine/audio/sequencer/tracks
         → SequencerService.create_track()
         → In-memory state updated
         → WebSocket broadcast to frontend
```

### User Saves Composition
```
Frontend → POST /api/compositions/save
         → CompositionService.save_composition()
         → Build snapshot from services
         → Write to data/compositions/<id>/
```

### AI Modifies Composition
```
Frontend → POST /api/ai/chat
         → AIAgentService.send_message()
         → DAWStateService.get_current_state()
         → Claude LLM with function calling
         → DAWActionService.execute_action()
         → Services updated (in-memory)
         → Frontend reloads UI
```

## Configuration

See `backend/core/config.py` for all configuration options.

Environment variables use `__` for nesting:
- `AI__ANTHROPIC_API_KEY` → `settings.ai.anthropic_api_key`
- `SERVER__PORT` → `settings.server.port`

## Storage

See `backend/STORAGE_ARCHITECTURE.md` for detailed storage patterns.

## Testing

Run tests with:
```bash
pytest tests/
```

Test fixtures in `tests/conftest.py` provide isolated test environments.

