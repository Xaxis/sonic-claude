# Sonic Claude - Architecture Analysis

**Date:** 2026-02-09  
**Purpose:** Deep analysis of current architecture to establish clean, consistent patterns

---

## 📊 CURRENT STATE OVERVIEW

### Backend Structure
```
backend/
├── audio_engine/          # SuperCollider audio engine (48 routes)
│   ├── routes/           # API endpoints (engine, synthesis, effects, mixer, sequencer)
│   ├── services/         # Business logic (synthesis, effects, mixer, sequencer)
│   ├── models/           # Data models (synth, effect, track, sequence)
│   └── core/             # Engine manager, bus manager, group manager
├── routes/               # Top-level routes (AI, samples, transcription, timeline, websocket)
├── services/             # Top-level services (AI agent, sample recorder, spectral analyzer)
└── models/               # Top-level models (AI, audio, musical, sample, timeline)
```

### Frontend Structure
```
frontend/src/
├── components/
│   ├── features/         # 26 panel components (sequencer, mixer, synthesis, etc.)
│   ├── layout/           # Layout system (PanelGrid, Header, TabBar)
│   └── ui/               # Reusable UI components (Panel, Button, etc.)
├── contexts/             # React contexts (AudioEngineContext, LayoutContext)
├── services/
│   ├── api/              # API client (audio-engine.service.ts, base.ts)
│   ├── AudioEngine.ts    # Legacy service (needs cleanup)
│   └── WindowManager.ts  # Multi-window management
├── hooks/                # Custom hooks (useSpectrumWebsocket)
├── config/               # Configuration (layout.config.ts)
└── types/                # TypeScript types (common.ts, grid-layout.ts, index.ts)
```

---

## 🔍 PATTERN ANALYSIS

### ✅ GOOD PATTERNS (Keep & Extend)

#### 1. **Backend: Service Injection Pattern**
```python
# Routes receive services via dependency injection
_synthesis_service: Optional[SynthesisService] = None

def set_synthesis_service(service: SynthesisService):
    global _synthesis_service
    _synthesis_service = service
```
**Pros:** Testable, decoupled, clear dependencies  
**Status:** ✅ Used consistently across audio_engine routes

#### 2. **Backend: Modular Route Organization**
```python
# Each module has its own router
router = APIRouter(prefix="/audio/synthesis", tags=["Audio Engine - Synthesis"])
```
**Pros:** Clear separation, easy to navigate  
**Status:** ✅ Used in audio_engine, needs extension to top-level routes

#### 3. **Frontend: Unified API Client**
```typescript
// Single API client with namespaced services
export const api = new APIClient();
await api.audioEngine.getSynthDefs();
```
**Pros:** Type-safe, organized, easy to use  
**Status:** ✅ Implemented for audio engine, needs extension

#### 4. **Frontend: Feature-Based Component Organization**
```
features/
├── sequencer/
│   ├── SequencerPanel.tsx
│   ├── types.ts
│   └── index.ts
```
**Pros:** Scalable, clear ownership  
**Status:** ✅ Established pattern for all 26 panels

---

### ⚠️ INCONSISTENCIES (Need Cleanup)

#### 1. **Backend: Mixed Route Prefixes**
```python
# INCONSISTENT:
router = APIRouter(prefix="/audio-engine", ...)      # engine.py
router = APIRouter(prefix="/audio/synthesis", ...)   # synthesis.py
router = APIRouter(prefix="/audio/effects", ...)     # effects.py
router = APIRouter(prefix="/ws", ...)                # websocket.py
router = APIRouter(prefix="/ai", ...)                # ai.py
router = APIRouter(prefix="/samples", ...)           # samples.py
```
**Problem:** No consistent naming convention
**Solution:** Standardize to `/api/{module}` pattern

#### 2. **Backend: Service Initialization Scattered**
```python
# main.py has global variables and manual injection
audio_engine = None
audio_analyzer = None
unified_agent = None
# ... 7 more globals

# Then manually injected into each route module
set_ai_services(unified_agent)
set_websocket_services(audio_analyzer, unified_agent)
set_sample_services(sample_recorder, spectral_analyzer, synthesis_agent)
```
**Problem:** Hard to test, hard to track dependencies
**Solution:** Dependency injection container or FastAPI Depends()

#### 3. **Frontend: Duplicate Service Patterns**
```typescript
// OLD PATTERN (AudioEngine.ts):
export class AudioEngine {
    private baseUrl = "http://localhost:8000";
    async startEngine() { ... }
}

// NEW PATTERN (api/audio-engine.service.ts):
export class AudioEngineService extends BaseAPIClient {
    async startEngine() { ... }
}
```
**Problem:** Two different implementations of same functionality
**Status:** AudioEngine.ts is legacy, needs removal

#### 4. **Frontend: WebSocket Management**
```typescript
// Currently: Each hook manages its own WebSocket
export function useSpectrumWebSocket() {
    const wsRef = useRef<WebSocket | null>(null);
    // Manual connection, reconnection, cleanup
}
```
**Problem:** No centralized WebSocket management, duplicate logic
**Solution:** WebSocket manager service with connection pooling

#### 5. **Frontend: State Management Gaps**
```typescript
// AudioEngineContext exists but is minimal
// No centralized state for:
// - Synths, effects, tracks (mixer state)
// - Sequences, clips (sequencer state)
// - Samples (library state)
// - Real-time audio data (spectrum, meters)
```
**Problem:** Each panel will need to manage its own state
**Solution:** Feature-specific contexts with WebSocket integration

---

## 🎯 PROPOSED ARCHITECTURE PATTERNS

### Backend Pattern: Clean Service Layer

```
backend/
├── api/                  # All API routes
│   ├── v1/              # Versioned API
│   │   ├── audio_engine/
│   │   ├── samples/
│   │   ├── ai/
│   │   └── websocket/
│   └── dependencies.py  # FastAPI dependency injection
├── services/            # Business logic (stateless where possible)
├── models/              # Pydantic models
└── core/                # Shared utilities (config, logging, etc.)
```

**Key Principles:**
1. **Consistent route prefixes:** `/api/v1/{module}`
2. **FastAPI Depends():** Use built-in DI instead of globals
3. **Service layer:** Pure business logic, no HTTP concerns
4. **Models:** Single source of truth for data structures

### Frontend Pattern: Feature-Based Architecture

```
frontend/src/
├── features/
│   ├── sequencer/
│   │   ├── components/      # SequencerPanel, Timeline, PianoRoll
│   │   ├── hooks/           # useSequencer, useSequencerWebSocket
│   │   ├── context/         # SequencerContext
│   │   ├── services/        # sequencer.service.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── mixer/
│   ├── synthesis/
│   └── ...
├── shared/
│   ├── components/ui/       # Reusable UI (Knob, Fader, Meter)
│   ├── hooks/               # useWebSocket, useAudioEngine
│   ├── services/
│   │   ├── api/             # API client
│   │   └── websocket/       # WebSocket manager
│   └── types/
└── core/
    ├── contexts/            # Global contexts (AudioEngine, Layout)
    └── config/
```

**Key Principles:**
1. **Feature isolation:** Each feature is self-contained
2. **Shared UI components:** Reusable across features
3. **WebSocket manager:** Centralized connection management
4. **Context per feature:** Local state management
5. **Type safety:** End-to-end TypeScript types

---

## 🔌 WEBSOCKET ARCHITECTURE

### Current State
- ✅ `/ws/spectrum` - Real-time frequency spectrum (60 FPS)
- ✅ `/ws/status` - AI status updates (2 Hz)

### Proposed Expansion
```
/ws/spectrum        # Frequency spectrum (60 FPS)
/ws/meters          # VU meters, peak levels (30 FPS)
/ws/sequencer       # Playback position, clip triggers (60 FPS)
/ws/mixer           # Track levels, mute/solo changes (30 FPS)
/ws/synthesis       # Synth parameter changes (30 FPS)
/ws/ai              # AI decisions, reasoning (event-driven)
```

### WebSocket Manager Pattern
```typescript
class WebSocketManager {
    private connections: Map<string, WebSocket>;
    private subscribers: Map<string, Set<Callback>>;

    subscribe(channel: string, callback: Callback): Unsubscribe;
    unsubscribe(channel: string, callback: Callback): void;
    send(channel: string, data: any): void;
}

// Usage in hooks
function useSequencerWebSocket() {
    const [position, setPosition] = useState(0);

    useEffect(() => {
        return wsManager.subscribe('sequencer', (data) => {
            setPosition(data.position);
        });
    }, []);
}
```

---

## 🎨 UI COMPONENT PATTERNS

### Research: Professional DAW UI Components

**Ableton Live:**
- Knobs: Circular, value display on hover
- Faders: Vertical/horizontal, dB scale
- Meters: Peak + RMS, color-coded levels
- Waveforms: Zoomable, selection ranges

**Logic Pro:**
- Channel strips: Vertical layout, consistent spacing
- Plugin UI: Skeuomorphic knobs and switches
- Piano roll: Grid-based, velocity lanes

**FL Studio:**
- Step sequencer: Grid with velocity/pan per step
- Mixer: Color-coded tracks, routing matrix
- Browser: Tree view with preview

### Proposed Component Library
```
shared/components/ui/
├── controls/
│   ├── Knob.tsx           # Rotary knob (frequency, resonance, etc.)
│   ├── Fader.tsx          # Linear fader (volume, pan)
│   ├── Button.tsx         # Momentary/toggle buttons
│   ├── Encoder.tsx        # Endless encoder
│   └── XYPad.tsx          # 2D control surface
├── display/
│   ├── Meter.tsx          # VU/peak meter
│   ├── Waveform.tsx       # Audio waveform display
│   ├── Spectrum.tsx       # Frequency spectrum
│   └── Grid.tsx           # Step sequencer grid
├── layout/
│   ├── ChannelStrip.tsx   # Mixer channel
│   ├── EffectRack.tsx     # Effect chain
│   └── Keyboard.tsx       # Piano keyboard
└── input/
    ├── NumericInput.tsx   # Precise value entry
    ├── Dropdown.tsx       # Preset/option selection
    └── Slider.tsx         # Alternative to fader
```

---

## 📋 NEXT STEPS

### Phase 1: Backend Cleanup ✅
1. [ ] Standardize route prefixes to `/api/v1/{module}`
2. [ ] Implement FastAPI dependency injection
3. [ ] Remove global service variables
4. [ ] Add WebSocket endpoints for mixer, sequencer, synthesis

### Phase 2: Frontend Service Layer ✅
1. [ ] Remove legacy AudioEngine.ts
2. [ ] Implement WebSocket manager
3. [ ] Extend API client for all backend routes
4. [ ] Create feature-specific services

### Phase 3: UI Component Library ✅
1. [ ] Research DAW UI patterns (Ableton, Logic, FL Studio)
2. [ ] Build core controls (Knob, Fader, Meter)
3. [ ] Build display components (Waveform, Spectrum)
4. [ ] Document component API and usage

### Phase 4: Feature Implementation ✅
1. [ ] Choose first feature (Mixer recommended)
2. [ ] Implement end-to-end with established patterns
3. [ ] Create feature context + WebSocket integration
4. [ ] Build panel UI with component library
5. [ ] Test and refine patterns

---

## 🎯 SUCCESS CRITERIA

**Clean Architecture:**
- ✅ Consistent naming conventions across backend/frontend
- ✅ Clear separation of concerns (routes, services, models)
- ✅ Type-safe API client with full coverage
- ✅ Centralized WebSocket management

**Developer Experience:**
- ✅ Easy to add new features following established patterns
- ✅ Clear documentation of patterns and conventions
- ✅ Minimal boilerplate for common tasks
- ✅ Type safety catches errors at compile time

**Performance:**
- ✅ Efficient WebSocket usage (no duplicate connections)
- ✅ Optimized re-renders (proper React memoization)
- ✅ Smooth 60 FPS for real-time visualizations
- ✅ Low latency for audio parameter changes

**Maintainability:**
- ✅ Self-documenting code structure
- ✅ Easy to test (dependency injection)
- ✅ Easy to refactor (clear boundaries)
- ✅ Easy to onboard new developers


