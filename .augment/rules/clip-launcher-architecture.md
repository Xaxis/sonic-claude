# Clip Launcher Architecture

## Overview
The clip launcher is a **performance mode** feature that allows triggering clips independently from the timeline sequencer. Clips loop continuously until stopped, similar to Ableton Live's Session View.

## Core Concepts

### 1. Clip Slots Grid
- **Structure**: 2D grid `clip_slots[track_index][slot_index]`
- **Storage**: Part of `Composition` model (persisted with composition)
- **Values**: `clip_id` (string) or `null` (empty slot)
- **Default**: 8 slots per track (scenes)

### 2. Scenes
- **Definition**: Horizontal rows in the clip launcher grid
- **Purpose**: Trigger all clips in a row simultaneously
- **Properties**: `id`, `name`, `color`, `tempo` (optional override)
- **Default**: 8 scenes created with each composition

### 3. Launch Quantization
- **Options**: `'none'`, `'1/4'`, `'1/2'`, `'1'`, `'2'`, `'4'`
- **Behavior**: Clips wait for next beat/bar boundary before launching
- **Storage**: `composition.launch_quantization`

### 4. Clip Launch States
- **Real-time Sync**: Via WebSocket (60Hz updates from backend)
- **States**: `'playing'`, `'triggered'` (scheduled), `'stopped'`
- **Storage**: Frontend only (`clipLaunchStates` in Zustand store)
- **Source**: `playback_engine_service.active_synths` and `triggered_clips`

## Backend Architecture

### API Endpoints (`backend/api/compositions/clip_launcher.py`)

**Clip Slot Operations:**
- `PUT /{composition_id}/clip-launcher/slots/{track_index}/{slot_index}` - Assign clip to slot
- `GET /{composition_id}/clip-launcher/slots` - Get all clip slots

**Scene Operations:**
- `POST /{composition_id}/clip-launcher/scenes` - Create scene
- `PUT /{composition_id}/clip-launcher/scenes/{scene_id}` - Update scene
- `DELETE /{composition_id}/clip-launcher/scenes/{scene_id}` - Delete scene

**Settings:**
- `PUT /{composition_id}/clip-launcher/quantization` - Set launch quantization

**Playback (Performance Mode):**
- `POST /{composition_id}/clip-launcher/clips/{clip_id}/launch` - Launch clip
- `POST /{composition_id}/clip-launcher/clips/{clip_id}/stop` - Stop clip
- `POST /{composition_id}/clip-launcher/scenes/{scene_id}/launch` - Launch scene
- `POST /{composition_id}/clip-launcher/clips/stop-all` - Stop all clips
- `POST /{composition_id}/clip-launcher/tracks/{track_id}/stop-all` - Stop track clips

### Services

**PlaybackEngineService** (`backend/services/daw/playback_engine_service.py`):
- `launch_clip(composition_id, clip_id)` - Launch clip with quantization
- `stop_clip(clip_id)` - Stop playing clip
- `stop_all_clips()` - Stop all clips
- `_clip_launcher_loop()` - 60Hz loop for quantization and WebSocket updates
- `active_synths: Dict[clip_id, node_id]` - Currently playing clips
- `triggered_clips: Dict[clip_id, launch_time]` - Scheduled clips

**CompositionStateService**:
- Stores `clip_slots` and `scenes` as part of `Composition`
- No special clip launcher state (all in composition)

## Frontend Architecture

### Module Structure (`frontend/src/modules/clip-launcher/`)
```
clip-launcher/
├── ClipLauncherPanel.tsx          # Main panel (root div pattern)
├── components/
│   ├── Toolbars/
│   │   └── ClipLauncherToolbar.tsx
│   ├── Grid/
│   │   └── ClipLauncherGrid.tsx
│   ├── Clips/
│   │   └── ClipLauncherSlot.tsx   # Individual clip slot (pad view)
│   └── Scenes/
│       └── ClipLauncherScene.tsx  # Scene trigger button
├── types.ts
└── index.ts
```

### Zustand Store Actions (`frontend/src/stores/dawStore.ts`)

**Mutation Actions (reload composition after):**
- `assignClipToSlot(trackIndex, slotIndex, clipId)` ✅ Reloads
- `createScene(name, color, tempo)` ✅ Reloads
- `updateScene(sceneId, name, color, tempo)` ✅ Reloads
- `deleteScene(sceneId)` ✅ Reloads
- `setLaunchQuantization(quantization)` ✅ Reloads

**Playback Actions (WebSocket syncs state):**
- `launchClip(clipId)` - No reload (WebSocket handles state)
- `launchScene(sceneId)` - No reload (WebSocket handles state)
- `stopClip(clipId)` - No reload (WebSocket handles state)
- `stopAllClips()` - No reload (WebSocket handles state)
- `stopTrackClips(trackId)` - No reload (WebSocket handles state)

**State Management:**
- `clipLaunchStates: Record<clipId, ClipLaunchState>` - Real-time from WebSocket
- `setClipLaunchStatesFromWebSocket(playingClips, triggeredClips)` - Called by WebSocket hook

### API Provider (`frontend/src/services/api/providers/compositions.provider.ts`)

All clip launcher endpoints follow REST conventions:
- Mutation endpoints return success/error
- GET endpoints return data
- All use composition_id in URL path

## Critical Patterns

### 1. Mutation Pattern (Backend)
```python
# 1. Push undo BEFORE mutation
composition_state_service.push_undo(composition_id)

# 2. Perform mutation
composition.clip_slots[track_index][slot_index] = clip_id

# 3. Auto-persist AFTER mutation
composition_service.auto_persist_composition(
    composition_id=composition_id,
    composition_state_service=composition_state_service,
    mixer_service=mixer_service,
    effects_service=effects_service
)
```

### 2. Frontend Mutation Pattern
```typescript
// Mutation actions MUST reload composition
await api.compositions.assignClipToSlot({...});
await get().loadComposition(activeComposition.id);
await get().refreshUndoRedoStatus(); // Optional but recommended
```

### 3. Frontend Playback Pattern
```typescript
// Playback actions do NOT reload (WebSocket syncs state)
await api.compositions.launchClip(compositionId, clipId);
// WebSocket will update clipLaunchStates automatically
```

## WebSocket Integration

### Backend Broadcast
```python
# In _clip_launcher_loop() (60Hz)
await websocket_manager.broadcast_transport_state({
    "playing_clips": list(self.active_synths.keys()),
    "triggered_clips": list(self.triggered_clips.keys()),
    # ... other state
})
```

### Frontend Reception
```typescript
// In useTransportWebSocket hook
const handleMessage = (data: TransportState) => {
    dawStore.setClipLaunchStatesFromWebSocket(
        data.playing_clips || [],
        data.triggered_clips || []
    );
};
```

## Key Differences from Sequencer

| Feature | Sequencer (Timeline) | Clip Launcher (Performance) |
|---------|---------------------|----------------------------|
| Playback | Linear timeline | Independent looping clips |
| Triggering | Play button | Individual clip/scene triggers |
| Quantization | None (immediate) | Configurable (1/4, 1/2, 1, 2, 4 bars) |
| State Sync | Composition reload | WebSocket (60Hz) |
| Exclusive Playback | N/A | One clip per track at a time |

## Common Pitfalls

❌ **DON'T** reload composition after playback actions (launch/stop)
✅ **DO** reload composition after mutation actions (assign/create/update/delete)

❌ **DON'T** manually update `clipLaunchStates` in playback actions
✅ **DO** let WebSocket handle real-time state updates

❌ **DON'T** forget to push undo before mutations (backend)
✅ **DO** follow the undo → mutate → persist pattern

❌ **DON'T** create separate clip launcher state service
✅ **DO** store everything in `Composition` model

