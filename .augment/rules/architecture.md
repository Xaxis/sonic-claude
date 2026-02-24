---
type: always
---

# System Architecture

## Data Flow
```
SuperCollider (scsynth)
  ↓ OSC messages
Python Realtime Analyzer
  ↓ WebSocket (60Hz)
Frontend useAudioData hook
  ↓ Updates
Zustand Store
  ↓ Selectors
React Components
```

## Backend Structure

### API Organization
```
backend/api/
├── compositions/          # Main entity - composition (project)
│   ├── __init__.py       # Router aggregator - CRITICAL ORDER
│   ├── crud.py           # POST /, GET /, GET /{id}, PUT /{id}, DELETE /{id}
│   ├── history.py        # GET /{id}/history, POST /{id}/restore
│   ├── tracks.py         # POST /{id}/tracks, GET /{id}/tracks, PUT /{id}/tracks/{track_id}
│   ├── clips.py          # POST /{id}/clips, GET /{id}/clips, PUT /{id}/clips/{clip_id}
│   ├── mixers.py         # GET /mixers/master, PUT /mixers/master/{id}
│   ├── effects.py        # GET /effects/definitions, POST /effects/track/{track_id}
│   └── clip_launcher.py  # POST /{id}/clip-slots, GET /{id}/scenes
├── samples/              # Sample library management
├── playback/             # Transport control (play, stop, seek)
├── audio/                # Audio synthesis, metronome
└── assistant/            # AI assistant chat and actions
```

### Router Registration Pattern
**CRITICAL**: In `backend/api/compositions/__init__.py`, register routes in this EXACT order:
```python
# 1. SPECIFIC routes with prefixes FIRST (to prevent path conflicts)
router.include_router(clip_launcher.router, tags=["compositions-clip-launcher"])
router.include_router(mixers.router, tags=["compositions-mixers"])
router.include_router(effects.router, tags=["compositions-effects"])
router.include_router(tracks.router, tags=["compositions-tracks"])
router.include_router(clips.router, tags=["compositions-clips"])

# 2. GENERIC routes with path params LAST
router.include_router(startup.router, tags=["compositions"])
router.include_router(history.router, tags=["compositions"])
router.include_router(crud.router, tags=["compositions"])
```
**Why**: FastAPI matches routes in registration order. If `crud.router` with `/{composition_id}` comes first, it will catch "mixers", "effects", etc. as composition IDs.

### Endpoint Patterns

**Nested Resources** (tracks, clips belong to composition):
```python
POST   /api/compositions/{composition_id}/tracks
GET    /api/compositions/{composition_id}/tracks
PUT    /api/compositions/{composition_id}/tracks/{track_id}
DELETE /api/compositions/{composition_id}/tracks/{track_id}
```

**Prefixed Resources** (to avoid path conflicts):
```python
GET    /api/compositions/effects/definitions
POST   /api/compositions/effects/track/{track_id}
GET    /api/compositions/mixers/master
PUT    /api/compositions/mixers/master/{composition_id}
```

### Service Layer Pattern
```python
backend/services/
├── daw/
│   ├── composition_service.py        # Persistence (save, load, delete)
│   ├── composition_state_service.py  # In-memory state + undo/redo
│   ├── mixer_service.py              # Mixer state management
│   └── effects_service.py            # Effect chains management
└── supercollider/
    ├── sc_manager.py                 # SuperCollider lifecycle
    └── osc_client.py                 # OSC communication
```

**Dependency Injection Pattern**:
```python
from backend.core.dependencies import (
    get_composition_state_service,
    get_composition_service,
    get_mixer_service,
    get_track_effects_service
)

@router.post("/{composition_id}/tracks")
async def create_track(
    composition_id: str,
    request: CreateTrackRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    # Use services...
```

## Frontend Structure

### Module Organization
```
frontend/src/modules/
├── sequencer/                    # Timeline + piano roll + sample editor
│   ├── SequencerPanel.tsx       # Main panel (MUST use root div pattern)
│   ├── components/
│   │   ├── Toolbars/            # SequencerTransportToolbar, SequencerActionToolbar
│   │   ├── Layouts/             # SequencerSplitLayout
│   │   ├── Timeline/            # SequencerTimelineSection
│   │   ├── PianoRoll/           # SequencerPianoRoll
│   │   ├── SampleEditor/        # SequencerSampleEditor
│   │   └── States/              # SequencerEmptyState
│   ├── hooks/                   # useSequencer, useAutoScroll
│   ├── index.ts                 # Barrel export
│   └── types.ts                 # Sequence, SequencerTrack, SequencerClip
├── mixer/                       # Mixing console
│   ├── MixerPanel.tsx
│   ├── components/
│   │   ├── Toolbars/            # MixerToolbar
│   │   ├── Channel/             # MixerChannelStrip, MixerChannelList
│   │   └── Master/              # MixerMasterSection
│   ├── index.ts
│   └── types.ts
├── effects/                     # Effects chains
├── inputs/                      # Audio/MIDI input + sample library
├── visualizer/                  # Waveform + spectrum visualization
└── assistant/                   # AI assistant chat
```

### Naming Conventions
- **Panel component**: `{Feature}Panel.tsx` (e.g., `SequencerPanel.tsx`, `MixerPanel.tsx`)
- **Sub-components**: `{Feature}{Component}.tsx` (e.g., `SequencerTransportToolbar.tsx`, `MixerChannelStrip.tsx`)
- **Hooks**: `use{Feature}.ts` (e.g., `useSequencer.ts`, `useMixer.ts`)
- **Types file**: `types.ts` (exports all module types)
- **Barrel export**: `index.ts` (exports panel + types)

### API Client Organization
```
frontend/src/services/api/
├── providers/
│   ├── compositions.provider.ts   # Composition CRUD + tracks + clips + scenes
│   ├── playback.provider.ts       # Transport control
│   ├── samples.provider.ts        # Sample library
│   ├── effects.provider.ts        # Effect definitions + chains
│   ├── assistant.provider.ts      # AI assistant
│   └── index.ts                   # Re-exports all providers + types
└── client.ts                      # Axios instance with base config
```

**Provider Pattern**:
```typescript
// compositions.provider.ts
export const compositionsProvider = {
    // CRUD
    create: (request: CreateCompositionRequest) =>
        client.post<CompositionCreatedResponse>('/compositions', request),

    get: (id: string) =>
        client.get<Composition>(`/compositions/${id}`),

    // Nested resources
    createTrack: (compositionId: string, request: CreateTrackRequest) =>
        client.post<Track>(`/compositions/${compositionId}/tracks`, request),

    // Export types
};

export type { CreateCompositionRequest, Composition, Track };
```

### Zustand Store Structure
```typescript
// frontend/src/stores/dawStore.ts
interface DAWStore {
    // STATE
    activeComposition: Composition | null;
    compositions: Composition[];

    // ACTIONS (grouped by feature)
    // Composition actions
    loadComposition: (id: string) => Promise<void>;
    createComposition: (request: CreateCompositionRequest) => Promise<void>;

    // Track actions
    createTrack: (request: CreateTrackRequest) => Promise<void>;
    updateTrackVolume: (trackId: string, volume: number) => Promise<void>;

    // Clip actions
    createClip: (request: AddClipRequest) => Promise<void>;
    updateClip: (clipId: string, request: UpdateClipRequest) => Promise<void>;
}
```

## Key Files
- `backend/models/composition.py` - Main data model (Composition, Track, Clip, Scene)
- `backend/api/compositions/__init__.py` - Router registration (ORDER MATTERS!)
- `backend/core/dependencies.py` - Dependency injection setup
- `frontend/src/stores/dawStore.ts` - Global state + actions
- `frontend/src/services/api/providers/compositions.provider.ts` - API client
- `frontend/src/config/layout.config.ts` - Panel registration

