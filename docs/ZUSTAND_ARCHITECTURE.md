# Complete Zustand State Architecture

## Overview

This document defines the COMPLETE state management architecture using Zustand to handle:
1. **WebSocket Real-Time Streams** (30-60Hz): transport, meters, spectrum, waveform, analytics
2. **HTTP CRUD Operations**: sequences, tracks, clips, channels, effects, samples, compositions
3. **UI State**: modals, selection, zoom, grid settings

## Why Zustand?

- **Fine-Grained Subscriptions**: Components subscribe ONLY to state slices they need
- **No Provider Hell**: Direct imports, no nested providers
- **Performance**: Selector-based subscriptions prevent unnecessary re-renders
- **Proven**: Used by professional DAWs and real-time audio applications
- **Middleware Support**: DevTools, persistence, immer for immutable updates

## State Architecture

### Two-Layer Design

**Layer 1: Audio Engine State (Real-Time)**
- Source: WebSocket streams (30-60Hz)
- Data: `transport`, `meters`, `spectrum`, `waveform`, `analytics`
- Updates: Pushed from backend via WebSocket hooks
- Consumers: Transport controls, meters, visualizers

**Layer 2: Application State (CRUD)**
- Source: HTTP API endpoints
- Data: `sequences`, `tracks`, `clips`, `channels`, `effects`, `samples`, `compositions`
- Updates: Pulled from backend on user actions (create/update/delete)
- Consumers: Sequencer timeline, mixer, effect racks, sample browser

**Layer 3: UI State (Local)**
- Source: User interactions
- Data: `zoom`, `snap`, `grid`, `modals`, `selection`
- Updates: Local only (not synced to backend)
- Consumers: UI components

## Store Structure

```typescript
// frontend/src/stores/dawStore.ts

interface DAWStore {
  // ============================================================================
  // AUDIO ENGINE STATE (WebSocket Real-Time)
  // ============================================================================
  transport: TransportState | null;
  meters: Record<string, MeterData>;
  spectrum: SpectrumData | null;
  waveform: WaveformData | null;
  analytics: AnalyticsData | null;

  // ============================================================================
  // APPLICATION STATE (HTTP CRUD)
  // ============================================================================
  
  // Sequencer
  sequences: Sequence[];
  activeSequenceId: string | null;
  tracks: SequencerTrack[];
  clips: SequencerClip[];
  synthDefs: SynthDefInfo[];
  
  // Mixer
  channels: MixerChannel[];
  master: MasterChannel | null;
  
  // Effects
  effectDefinitions: EffectDefinition[];
  effectChains: Record<string, TrackEffectChain>; // trackId -> chain
  
  // Samples
  samples: SampleMetadata[];
  sampleAssignments: Record<string, string>; // trackId -> sampleId
  
  // Synthesis
  activeSynths: Record<number, ActiveSynth>; // synthId -> synth
  
  // Compositions
  compositions: CompositionMetadata[];
  currentCompositionId: string | null;
  hasUnsavedChanges: boolean;

  // ============================================================================
  // UI STATE (Local)
  // ============================================================================
  
  // Sequencer UI
  zoom: number;
  snapEnabled: boolean;
  gridSize: number;
  isLooping: boolean;
  loopStart: number;
  loopEnd: number;
  selectedClipId: string | null;
  
  // Modals
  showSampleBrowser: boolean;
  showSequenceManager: boolean;
  showPianoRoll: boolean;
  pianoRollClipId: string | null;
  
  // Mixer UI
  showMeters: boolean;
  meterMode: "peak" | "rms" | "both";
  selectedChannelId: string | null;
  
  // Effects UI
  selectedEffectId: string | null;
  showEffectBrowser: boolean;

  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  // Audio Engine Actions (WebSocket updates)
  setTransport: (transport: TransportState) => void;
  setMeters: (meters: Record<string, MeterData>) => void;
  setSpectrum: (spectrum: SpectrumData) => void;
  setWaveform: (waveform: WaveformData) => void;
  setAnalytics: (analytics: AnalyticsData) => void;
  
  // Sequencer Actions (HTTP + local state)
  loadSequences: () => Promise<void>;
  createSequence: (name: string, tempo?: number) => Promise<void>;
  deleteSequence: (id: string) => Promise<void>;
  loadSequence: (id: string) => Promise<void>;
  
  // ... (all other CRUD actions)
}
```

## Implementation Plan

### Phase 1: Install Zustand & Create Store
- `cd frontend && npm install zustand`
- Create `frontend/src/stores/dawStore.ts` with complete store definition
- Create slices for each domain (sequencer, mixer, effects, etc.)

### Phase 2: Wire WebSocket Streams to Zustand
- Create `frontend/src/components/WebSocketSync.tsx`
- Use existing WebSocket hooks (`useTransportWebSocket`, `useMeterWebSocket`, etc.)
- Call Zustand actions to update store when WebSocket data arrives
- Mount `<WebSocketSync />` at app root

### Phase 3: Wire HTTP CRUD to Zustand
- Update all CRUD actions to call API then update Zustand store
- Example: `createSequence` → `api.sequencer.createSequence()` → `set((state) => ({ sequences: [...state.sequences, newSeq] }))`
- Ensure all mutations update Zustand store

### Phase 4: Remove State from React Contexts
- SequencerContext: Remove ALL state, keep ONLY actions (or remove entirely)
- MixerContext: Remove ALL state, keep ONLY actions (or remove entirely)
- EffectsContext: Remove ALL state, keep ONLY actions (or remove entirely)
- Option: Remove contexts entirely, use Zustand actions directly

### Phase 5: Update Components to Use Zustand Selectors
- Replace `useSequencer()` with `useDAWStore(selectIsPlaying)`
- Replace `useMixer().meters` with `useDAWStore(selectMeters)`
- Use fine-grained selectors to prevent unnecessary re-renders

### Phase 6: Fix Provider Hierarchy
- Move CompositionProvider OUTSIDE all domain contexts
- Set up `setCompositionChangeCallback(markChanged)`
- Add `notifyCompositionChanged()` calls to all CRUD operations

### Phase 7: Performance Testing
- Verify no re-renders on sequencer ticks (use React DevTools Profiler)
- Test with multiple visualizers running simultaneously
- Measure frame rate and CPU usage

## Detailed Implementation

### WebSocket → Zustand Flow

```typescript
// frontend/src/components/WebSocketSync.tsx
export function WebSocketSync() {
  const { transport } = useTransportWebSocket();
  const { meters } = useMeterWebSocket();
  const { spectrum } = useSpectrumWebSocket();
  const { waveform } = useWaveformWebSocket();
  const { analytics } = useAnalyticsWebSocket();

  const setTransport = useDAWStore((state) => state.setTransport);
  const setMeters = useDAWStore((state) => state.setMeters);
  const setSpectrum = useDAWStore((state) => state.setSpectrum);
  const setWaveform = useDAWStore((state) => state.setWaveform);
  const setAnalytics = useDAWStore((state) => state.setAnalytics);

  useEffect(() => { if (transport) setTransport(transport); }, [transport, setTransport]);
  useEffect(() => { if (meters) setMeters(meters); }, [meters, setMeters]);
  useEffect(() => { if (spectrum) setSpectrum(spectrum); }, [spectrum, setSpectrum]);
  useEffect(() => { if (waveform) setWaveform(waveform); }, [waveform, setWaveform]);
  useEffect(() => { if (analytics) setAnalytics(analytics); }, [analytics, setAnalytics]);

  return null; // No UI, just sync
}
```

### HTTP CRUD → Zustand Flow

```typescript
// Example: Create Sequence
const createSequence = async (name: string, tempo: number = 120) => {
  try {
    // 1. Call API
    const sequence = await api.sequencer.createSequence({ name, tempo });

    // 2. Update Zustand store
    set((state) => ({
      sequences: [...state.sequences, sequence],
      activeSequenceId: sequence.id,
    }));

    // 3. Notify composition changed (for autosave)
    notifyCompositionChanged();

    toast.success(`Created sequence: ${name}`);
  } catch (error) {
    console.error("Failed to create sequence:", error);
    toast.error("Failed to create sequence");
  }
};
```

### Component Consumption (Fine-Grained Selectors)

```typescript
// BEFORE (React Context - re-renders on ANY state change)
function TransportControls() {
  const { isPlaying, tempo, playSequence, stopPlayback } = useSequencer();
  // Re-renders 30-60Hz because useSequencer() subscribes to ALL sequencer state
}

// AFTER (Zustand - re-renders ONLY when isPlaying or tempo changes)
const selectIsPlaying = (state) => state.transport?.is_playing ?? false;
const selectTempo = (state) => state.transport?.tempo ?? 120;

function TransportControls() {
  const isPlaying = useDAWStore(selectIsPlaying);
  const tempo = useDAWStore(selectTempo);
  const playSequence = useDAWStore((state) => state.playSequence);
  const stopPlayback = useDAWStore((state) => state.stopPlayback);
  // Only re-renders when isPlaying or tempo actually changes
}
```

### Cross-Window Synchronization

Zustand supports middleware for BroadcastChannel sync:

```typescript
import { subscribeWithSelector } from 'zustand/middleware';

const useDAWStore = create(
  subscribeWithSelector((set, get) => ({
    // ... store definition
  }))
);

// Subscribe to changes and broadcast
useDAWStore.subscribe(
  (state) => state.sequences,
  (sequences) => windowManager.broadcastState('sequences', sequences)
);

// Listen for broadcasts from other windows
windowManager.subscribeToState('sequences', (sequences) => {
  useDAWStore.setState({ sequences });
});
```

## Migration Strategy

### Option A: Big Bang (Recommended)
1. Create complete Zustand store
2. Wire all data sources (WebSocket + HTTP)
3. Update all components at once
4. Remove React Contexts entirely
5. Test thoroughly

**Pros**: Clean break, no hybrid state
**Cons**: Risky, requires extensive testing

### Option B: Gradual Migration
1. Create Zustand store alongside existing Contexts
2. Migrate one domain at a time (Sequencer → Mixer → Effects → etc.)
3. Keep both systems running during migration
4. Remove Contexts after all components migrated

**Pros**: Lower risk, incremental testing
**Cons**: Temporary complexity, state duplication

**RECOMMENDATION**: Option A (Big Bang) - the current architecture is fundamentally broken, a clean break is better than prolonging the pain.

## Performance Expectations

### Before (React Context)
- Every sequencer tick (30-60Hz) → `setState` in SequencerContext
- ALL components using `useSequencer()` re-render
- 10 components = 300-600 re-renders/sec
- Frame drops, UI lag, poor performance

### After (Zustand)
- Every sequencer tick (30-60Hz) → Zustand store update
- ONLY components subscribing to `transport.position` re-render
- 1-2 components (playhead, position display) = 30-60 re-renders/sec
- Smooth 60fps, no lag, excellent performance

## Next Steps

1. **Create Zustand Store**: `frontend/src/stores/dawStore.ts` with all slices
2. **Create WebSocket Sync**: `frontend/src/components/WebSocketSync.tsx`
3. **Wire HTTP CRUD**: Update all CRUD actions to use Zustand
4. **Update Components**: Replace Context hooks with Zustand selectors
5. **Remove Contexts**: Delete or gut React Contexts
6. **Fix Provider Hierarchy**: Move CompositionProvider outside
7. **Test Performance**: Verify no unnecessary re-renders

