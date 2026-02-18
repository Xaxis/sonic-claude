# Sequencer Context Usage Guide

## Overview
The sequencer uses React Context (`SequencerContext`) to provide state and actions to all child components, eliminating prop-drilling and following React best practices.

## Architecture

### State Management
- **Source of Truth**: `useSequencerState` hook (in `hooks/useSequencerState.ts`)
- **Provider**: `SequencerProvider` (in `contexts/SequencerContext.tsx`)
- **Consumer Hooks**:
  - `useSequencerContext()` - Full context access
  - `useSequencerState()` - UI state and actions only
  - `useSequencerData()` - Backend data only
  - `useSequencerPlayback()` - Playback state only

### Complete Context Interface
```typescript
interface SequencerContextValue {
    // UI State (from useSequencerState)
    state: SequencerState;
    actions: SequencerActions;

    // Backend Data
    sequences: Sequence[];
    activeSequenceId: string | null;
    tracks: SequencerTrack[];
    clips: SequencerClip[];

    // Playback State
    currentPosition: number;
    isPlaying: boolean;
    tempo: number;
}

interface SequencerState {
    // Timeline view
    zoom: number;
    snapEnabled: boolean;
    gridSize: number;

    // Playback
    isRecording: boolean;
    isLooping: boolean;
    isPaused: boolean;
    loopStart: number;
    loopEnd: number;

    // Selection & clipboard
    selectedClip: string | null;
    clipboardClip: SequencerClip | null;

    // Modals
    showSampleBrowser: boolean;
    showSequenceManager: boolean;
    showSequenceSettings: boolean;
    showTrackTypeDialog: boolean;

    // Piano Roll
    showPianoRoll: boolean;
    pianoRollClipId: string | null;

    // Sample Editor
    showSampleEditor: boolean;
    sampleEditorClipId: string | null;

    // Tempo input
    tempoInput: string;
}
```

## Component Classification

### ✅ Components Using Context (Refactored)
These components consume `SequencerContext` directly:

1. **SequencerPanelToolbar** - Uses `zoom`, `snapEnabled`, `gridSize` + actions
2. **SequencerTransport** - Uses `isRecording`, `isLooping`, `isPaused`, `tempoInput` + actions
3. **SequencerTimelineSection** - Uses `zoom`, `snapEnabled`, `gridSize`, `isLooping`, `loopStart`, `loopEnd`, `selectedClip`, `pianoRollClipId`, `sampleEditorClipId`
4. **SequencerPianoRollSection** - Uses `zoom`, `snapEnabled`, `gridSize`, `isLooping`, `loopStart`, `loopEnd`
5. **SequencerSampleEditorSection** - Uses `zoom`, `snapEnabled`, `gridSize`, `isLooping`, `loopStart`, `loopEnd`
6. **SequencerClip** - Uses `zoom`, `snapEnabled`, `gridSize`, `selectedClip`
7. **PianoRollWrapper** - Uses `showPianoRoll`, `pianoRollClipId`, `zoom`, `snapEnabled`, `gridSize`
8. **SampleEditorWrapper** - Uses `showSampleEditor`, `sampleEditorClipId`, `zoom`, `snapEnabled`, `gridSize`
9. **SequencerPianoRoll** - Uses `snapEnabled`, `gridSize` + actions
10. **SequencerSampleEditor** - Uses `snapEnabled`, `gridSize` + actions
11. **SequencerTimeline** - Uses `tracks`, `clips`, `zoom`, `currentPosition`, `snapEnabled`, `gridSize`
12. **SequencerTimelineLoopRegion** - Uses `isLooping`, `loopStart`, `loopEnd`, `zoom`, `snapEnabled`, `gridSize`
13. **SequencerTimelinePlayhead** - Uses `currentPosition`, `zoom`, `snapEnabled`, `gridSize`, `isPlaying`, `tempo`, `isLooping`, `loopStart`, `loopEnd`
14. **SequencerTimelineTrackRow** - Uses `zoom`, `snapEnabled`, `gridSize`, `selectedClip`, `pianoRollClipId`, `sampleEditorClipId`
15. **SequencerSplitLayout** - Uses `clips`, `pianoRollClipId`, `sampleEditorClipId`, `zoom`, `snapEnabled`, `gridSize`, `currentPosition`, `isPlaying`

### ❌ Components That Should NOT Use Context
These are pure presentational components that should receive all data as props:

- **SequencerEmptyState** - Only receives callbacks, no state
- **WaveformDisplay** - Pure presentational component
- **SequencerPianoRollKeyboard** - Pure presentational component
- **SequencerPianoRollGrid** - Receives all data as props (note manipulation)
- **SequencerPianoRollRuler** - Receives all data as props
- **SampleEditorRuler** - Receives all data as props
- **SequencerTimelineRuler** - Receives all data as props
- **SequencerTimelineGrid** - Receives all data as props
- **SequencerTracks** - Receives all data as props (track list)

## Usage Pattern

### How to Use Context in a Component

```typescript
import { useSequencerContext } from "../../contexts/SequencerContext.tsx";

export function MyComponent({ /* non-state props */ }: MyComponentProps) {
    // Get state and actions from context
    const { state, actions } = useSequencerContext();
    
    // Destructure what you need
    const { zoom, snapEnabled, gridSize } = state;
    const { setZoom, toggleSnap, setGridSize } = actions;
    
    // Use them in your component
    return (
        <div>
            <button onClick={toggleSnap}>
                Snap: {snapEnabled ? 'ON' : 'OFF'}
            </button>
        </div>
    );
}
```

### When to Use Context vs Props

**Use Context for:**
- **UI state** (zoom, snap, grid, loop settings)
- **Selection state** (selectedClip, clipboard)
- **Modal visibility** (showPianoRoll, showSampleEditor, etc.)
- **Backend data** (tracks, clips, sequences, activeSequenceId)
- **Playback state** (currentPosition, isPlaying, tempo)
- **Actions** that modify any of the above

**Use Props for:**
- **Callbacks** that interact with backend (onUpdateClip, onDeleteTrack, etc.)
- **Scroll refs** and scroll handlers
- **Active notes** for visual feedback (from WebSocket)
- **Component-specific configuration** that doesn't need to be shared

## Benefits

1. **No Prop Drilling**: State doesn't need to be passed through 5+ layers of components
2. **Cleaner Interfaces**: Component props only include what they actually need
3. **Easier Refactoring**: Changing state structure doesn't require updating every component in the chain
4. **Better Performance**: Components only re-render when the specific state they use changes
5. **Consistent Pattern**: All sequencer components follow the same state management pattern

