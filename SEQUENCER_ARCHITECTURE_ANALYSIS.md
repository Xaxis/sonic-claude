# Sequencer Component Architecture Analysis & Recommendations

## Executive Summary

The sequencer feature is currently **partially organized** with some good patterns (subdirectories for Timeline/PianoRoll, custom hooks) but lacks **consistent structure** for scaling to complex DAW features. This analysis provides a comprehensive reorganization strategy based on industry best practices.

---

## Current State Analysis

### ✅ What's Working Well

1. **Subdirectory Organization for Complex Components**
   - `SequencerPanelTimeline/` - 6 related components grouped together
   - `SequencerPanelPianoRoll/` - 3 related components grouped together
   - This pattern should be extended to ALL component groups

2. **Custom Hooks Pattern Started**
   - `hooks/useSequencerState.ts` - Centralizes UI state management
   - Good separation of concerns from presentation

3. **Coordinator Pattern in SequencerPanel**
   - Main panel delegates to sub-components
   - Handles orchestration, not rendering details

### ❌ Critical Issues

1. **Inconsistent Organization**
   - 9 components flat in root directory (Transport, Toolbar, TrackList, Clip, Dialogs, Modals, EmptyState)
   - Only 2 component groups have subdirectories (Timeline, PianoRoll)
   - **Problem**: Hard to find related components, unclear boundaries

2. **Monolithic Types File**
   - Single `types.ts` with 189 lines
   - Mixes current types + legacy types
   - No clear separation by domain (Sequence, Track, Clip, MIDI, UI)
   - **Problem**: Type pollution, hard to maintain, unclear what's deprecated

3. **Missing Business Logic Hooks**
   - Only 1 hook (`useSequencerState`) for UI state
   - No hooks for: clip operations, track operations, sequence operations, keyboard shortcuts
   - **Problem**: Business logic scattered in SequencerPanel (676 lines), hard to test/reuse

4. **No Utility Functions Layer**
   - Time conversion, snap-to-grid, MIDI helpers, waveform rendering all inline
   - **Problem**: Code duplication, hard to test, no single source of truth

5. **No Constants/Configuration Layer**
   - Magic numbers throughout (grid sizes, colors, zoom levels, key bindings)
   - **Problem**: Hard to maintain, inconsistent behavior

6. **Naming Inconsistency**
   - Mix of `SequencerPanel*` and non-prefixed names (`SampleBrowserModal`, `SequenceManagerModal`)
   - **Problem**: Unclear what belongs to sequencer feature

---

## Recommended Architecture: Feature-Sliced Design

### Directory Structure

```
sequencer/
├── SequencerPanel.tsx          # Main coordinator (keep thin!)
├── index.ts                     # Public exports
│
├── ui/                          # Presentational components (organized by domain)
│   ├── Transport/
│   │   ├── SequencerTransport.tsx
│   │   ├── TransportControls.tsx
│   │   └── TempoControl.tsx
│   │
│   ├── Toolbar/
│   │   ├── SequencerToolbar.tsx
│   │   ├── SequenceSelector.tsx
│   │   ├── ZoomControls.tsx
│   │   └── GridControls.tsx
│   │
│   ├── Timeline/
│   │   ├── SequencerTimeline.tsx
│   │   ├── TimelineGrid.tsx
│   │   ├── TimelineRuler.tsx
│   │   ├── TimelinePlayhead.tsx
│   │   ├── TimelineLoopRegion.tsx
│   │   └── TimelineTrackRow.tsx
│   │
│   ├── Tracks/
│   │   ├── TrackList.tsx
│   │   ├── TrackHeader.tsx
│   │   └── TrackControls.tsx
│   │
│   ├── Clips/
│   │   ├── ClipRenderer.tsx      # Smart component that picks MIDI vs Audio
│   │   ├── MIDIClip.tsx
│   │   ├── AudioClip.tsx
│   │   └── ClipWaveform.tsx
│   │
│   ├── PianoRoll/
│   │   ├── PianoRollEditor.tsx
│   │   ├── PianoRollGrid.tsx
│   │   ├── PianoRollKeyboard.tsx
│   │   └── PianoRollNote.tsx
│   │
│   ├── Dialogs/
│   │   ├── SequenceSettingsDialog.tsx
│   │   ├── TrackTypeDialog.tsx
│   │   ├── SampleBrowserDialog.tsx
│   │   └── SequenceManagerDialog.tsx
│   │
│   └── States/
│       ├── EmptyState.tsx
│       ├── LoadingState.tsx
│       └── ErrorState.tsx
│
├── hooks/                       # Business logic & state management
│   ├── useSequencerState.ts     # ✅ Already exists
│   ├── useClipOperations.ts     # Clip CRUD, copy/paste, duplicate
│   ├── useTrackOperations.ts    # Track CRUD, mute/solo, volume/pan
│   ├── useSequenceOperations.ts # Sequence CRUD, tempo, time signature
│   ├── useKeyboardShortcuts.ts  # All keyboard shortcuts
│   ├── useTimelineNavigation.ts # Zoom, scroll, snap, seek
│   └── usePianoRollEditor.ts    # MIDI note editing logic
│
├── utils/                       # Pure helper functions
│   ├── timeConversion.ts        # Beats ↔ seconds, bars ↔ beats
│   ├── snapToGrid.ts            # Grid snapping calculations
│   ├── midiHelpers.ts           # Note number ↔ name, velocity scaling
│   ├── waveformRenderer.ts      # Audio waveform rendering
│   └── colorUtils.ts            # Track color generation
│
├── types/                       # Type definitions (split by domain)
│   ├── sequence.types.ts        # Sequence, CreateSequenceRequest, etc.
│   ├── track.types.ts           # SequencerTrack, TrackType, etc.
│   ├── clip.types.ts            # SequencerClip, AddClipRequest, etc.
│   ├── midi.types.ts            # MIDIEvent, MIDINote, etc.
│   ├── ui.types.ts              # UI-specific types (zoom, grid, etc.)
│   └── index.ts                 # Re-export all types
│
└── constants/                   # Configuration & constants
    ├── defaults.ts              # Default values (tempo, time sig, etc.)
    ├── gridSizes.ts             # Grid size options (1/4, 1/8, 1/16, etc.)
    ├── colors.ts                # Track color palette
    └── keyBindings.ts           # Keyboard shortcut mappings
```

---

## Migration Strategy

### Phase 1: Foundation (Low Risk)
1. Create new directory structure
2. Move constants to `constants/`
3. Split `types.ts` into domain-specific files
4. Create utility functions in `utils/`

### Phase 2: Extract Business Logic (Medium Risk)
5. Create operation hooks (`useClipOperations`, `useTrackOperations`, etc.)
6. Move keyboard shortcuts to `useKeyboardShortcuts`
7. Refactor SequencerPanel to use new hooks

### Phase 3: Reorganize UI Components (Medium Risk)
8. Move flat components into `ui/` subdirectories
9. Rename for consistency (all dialogs, all states)
10. Update imports in SequencerPanel

### Phase 4: Cleanup (Low Risk)
11. Remove legacy types
12. Update index.ts exports
13. Run typecheck and fix any issues

---

## Key Principles

### 1. **Separation of Concerns**
- **UI Components**: Only rendering, no business logic
- **Hooks**: Business logic, state management, side effects
- **Utils**: Pure functions, no side effects
- **Types**: Type definitions only
- **Constants**: Configuration values

### 2. **Colocation**
- Related components in same directory
- Each subdirectory is self-contained
- Easy to find and modify related code

### 3. **Naming Consistency**
- All sequencer components prefixed: `Sequencer*` or in `sequencer/` directory
- Dialogs end with `Dialog`
- Hooks start with `use`
- Utils are descriptive verbs

### 4. **Scalability**
- Easy to add new features (just add to appropriate directory)
- Easy to find code (clear directory structure)
- Easy to test (business logic in hooks, pure functions in utils)

---

## Benefits

1. **Maintainability**: Clear structure, easy to find code
2. **Testability**: Business logic separated, pure functions
3. **Reusability**: Hooks and utils can be shared
4. **Onboarding**: New developers understand structure quickly
5. **Scalability**: Easy to add automation, MIDI CC, audio effects, etc.

---

## Detailed Component Mapping

### Current → Proposed

| Current Location | Proposed Location | Reason |
|-----------------|-------------------|--------|
| `SequencerPanelTransport.tsx` | `ui/Transport/SequencerTransport.tsx` | Group transport-related components |
| `SequencerPanelToolbar.tsx` | `ui/Toolbar/SequencerToolbar.tsx` | Group toolbar-related components |
| `SequencerPanelTrackList.tsx` | `ui/Tracks/TrackList.tsx` | Group track-related components |
| `SequencerPanelClip.tsx` | `ui/Clips/ClipRenderer.tsx` | Group clip-related components |
| `SequencerPanelTimeline/*` | `ui/Timeline/*` | Already grouped, just move to ui/ |
| `SequencerPanelPianoRoll/*` | `ui/PianoRoll/*` | Already grouped, just move to ui/ |
| `SequencerPanelSettingsDialog.tsx` | `ui/Dialogs/SequenceSettingsDialog.tsx` | Group all dialogs |
| `SequencerPanelTrackTypeDialog.tsx` | `ui/Dialogs/TrackTypeDialog.tsx` | Group all dialogs |
| `SampleBrowserModal.tsx` | `ui/Dialogs/SampleBrowserDialog.tsx` | Consistent naming + grouping |
| `SequenceManagerModal.tsx` | `ui/Dialogs/SequenceManagerDialog.tsx` | Consistent naming + grouping |
| `SequencerEmptyState.tsx` | `ui/States/EmptyState.tsx` | Group state components |

---

## Example: useClipOperations Hook

```typescript
// hooks/useClipOperations.ts
import { useCallback } from "react";
import { useAudioEngine } from "@/contexts/AudioEngineContext";
import type { SequencerClip, AddClipRequest } from "../types";
import { toast } from "sonner";

export function useClipOperations(sequenceId: string | null) {
    const { addClip, updateClip, deleteClip, duplicateClip } = useAudioEngine();

    const createClip = useCallback(async (request: AddClipRequest) => {
        if (!sequenceId) {
            toast.error("No active sequence");
            return null;
        }
        try {
            await addClip(sequenceId, request);
            toast.success("Clip created");
        } catch (error) {
            console.error("Failed to create clip:", error);
            toast.error("Failed to create clip");
        }
    }, [sequenceId, addClip]);

    const moveClip = useCallback(async (clipId: string, newStartTime: number) => {
        if (!sequenceId) return;
        await updateClip(sequenceId, clipId, { start_time: newStartTime });
    }, [sequenceId, updateClip]);

    const resizeClip = useCallback(async (clipId: string, newDuration: number) => {
        if (!sequenceId) return;
        await updateClip(sequenceId, clipId, { duration: newDuration });
    }, [sequenceId, updateClip]);

    const removeClip = useCallback(async (clipId: string) => {
        if (!sequenceId) return;
        await deleteClip(sequenceId, clipId);
        toast.success("Clip deleted");
    }, [sequenceId, deleteClip]);

    const copyClip = useCallback(async (clipId: string) => {
        if (!sequenceId) return;
        await duplicateClip(sequenceId, clipId);
        toast.success("Clip duplicated");
    }, [sequenceId, duplicateClip]);

    return {
        createClip,
        moveClip,
        resizeClip,
        removeClip,
        copyClip,
    };
}
```

---

## Example: Constants File

```typescript
// constants/defaults.ts
export const DEFAULT_TEMPO = 120;
export const DEFAULT_TIME_SIGNATURE = "4/4";
export const DEFAULT_ZOOM = 0.5;
export const DEFAULT_GRID_SIZE = 16; // 1/16 note

export const MIN_TEMPO = 20;
export const MAX_TEMPO = 300;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

// constants/gridSizes.ts
export const GRID_SIZES = [
    { value: 1, label: "1 bar" },
    { value: 2, label: "1/2 note" },
    { value: 4, label: "1/4 note" },
    { value: 8, label: "1/8 note" },
    { value: 16, label: "1/16 note" },
    { value: 32, label: "1/32 note" },
] as const;

// constants/colors.ts
export const TRACK_COLORS = [
    "#ef4444", // red
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#10b981", // green
    "#f59e0b", // amber
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
] as const;

export function getTrackColor(index: number): string {
    return TRACK_COLORS[index % TRACK_COLORS.length];
}
```

---

## Example: Utility Functions

```typescript
// utils/timeConversion.ts
export function beatsToSeconds(beats: number, tempo: number): number {
    return (beats / tempo) * 60;
}

export function secondsToBeats(seconds: number, tempo: number): number {
    return (seconds * tempo) / 60;
}

export function beatsToBars(beats: number, timeSignature: string = "4/4"): number {
    const [numerator] = timeSignature.split("/").map(Number);
    return beats / numerator;
}

// utils/snapToGrid.ts
export function snapToGrid(position: number, gridSize: number, enabled: boolean = true): number {
    if (!enabled) return position;
    const beatDivision = 4 / gridSize; // 4 = quarter note
    return Math.round(position / beatDivision) * beatDivision;
}

// utils/midiHelpers.ts
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function midiNoteToName(noteNumber: number): string {
    const octave = Math.floor(noteNumber / 12) - 1;
    const noteName = NOTE_NAMES[noteNumber % 12];
    return `${noteName}${octave}`;
}

export function noteNameToMidi(noteName: string): number {
    const match = noteName.match(/^([A-G]#?)(-?\d+)$/);
    if (!match) return 60; // Default to C4
    const [, note, octave] = match;
    const noteIndex = NOTE_NAMES.indexOf(note);
    return (parseInt(octave) + 1) * 12 + noteIndex;
}
```

---

## Implementation Priority

### High Priority (Do First)
1. **Extract constants** - Low risk, high value, reduces magic numbers
2. **Create utility functions** - Enables testing, reduces duplication
3. **Split types file** - Improves clarity, removes legacy types
4. **Create useClipOperations** - Most complex business logic, biggest win

### Medium Priority (Do Second)
5. **Create useTrackOperations** - Simplifies SequencerPanel
6. **Create useKeyboardShortcuts** - Centralizes all shortcuts
7. **Reorganize Dialogs** - Consistent naming and location
8. **Reorganize Transport/Toolbar** - Clear component boundaries

### Low Priority (Do Last)
9. **Create LoadingState/ErrorState** - Nice to have, not critical
10. **Optimize PianoRoll** - Already well-organized
11. **Documentation** - Add JSDoc comments to all hooks/utils

---

## Next Steps

Would you like me to:
1. **Start Phase 1**: Create directory structure and move constants/types?
2. **Create specific hooks**: Which operation hook should I build first?
3. **Reorganize specific component group**: Transport, Toolbar, Clips, etc.?

