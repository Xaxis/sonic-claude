# Composition Architecture Fix

## The Fundamental Problem

**Current BROKEN Architecture:**
- `Composition` and `Sequence` are treated as separate entities
- "Sequence Manager" UI exists (shouldn't - there's only ONE sequence per composition)
- Creating a "sequence" creates a "composition" (backwards!)
- Loading a composition tries to load it "as a sequence" (nonsense!)
- Composition management is buried in sequencer toolbar (wrong!)

**Correct Architecture:**
- **Composition = Project File** (like Ableton .als, Logic .logicx, Pro Tools .ptx)
- A Composition CONTAINS exactly ONE Sequence + all associated state
- Composition management lives in **global Header** (File menu)
- No "Sequence Manager" - you manage COMPOSITIONS (projects)

## What is a Composition?

```
Composition (Project File):
├── Metadata (name, created_at, updated_at, tempo, time_signature)
├── Sequence (ONE - the timeline)
│   ├── Tracks (audio, MIDI, sample)
│   └── Clips (MIDI notes, audio regions)
├── Mixer State (channels, master, routing)
├── Effects (effect chains per track)
├── Sample Assignments (which samples are loaded)
└── AI Chat History (optional)
```

## UI/UX Changes Required

### 1. Global Header (Top-Right)
**Current**: CompositionSwitcher (basic dropdown)
**New**: Full File menu with:
- **New Composition** → Creates new project with empty sequence
- **Open Composition** → Browse/load existing compositions
- **Save** (Cmd+S) → Save current composition
- **Save As** → Save copy with new name
- **Recent Files** → Quick access to recent compositions
- **Composition Switcher** → Quick switch between open compositions

### 2. Sequencer Toolbar
**Remove**:
- ❌ "Sequence Manager" button (FolderOpen icon)
- ❌ "Create new sequence" button (Plus icon next to sequence dropdown)
- ❌ Sequence dropdown (there's only ONE sequence per composition)

**Keep**:
- ✅ Sequence Settings (tempo, time signature, loop) - these are composition-level settings
- ✅ Add Track button
- ✅ Zoom controls
- ✅ Grid/snap controls

### 3. Sequence Manager Dialog
**Delete**: `frontend/src/modules/sequencer/components/Dialogs/SequencerSequenceManager.tsx`
- This entire concept is wrong
- Composition management belongs in global Header, not sequencer

## Backend Changes Required

### 1. API Endpoints to Remove/Rename
**Remove**:
- `POST /api/sequencer/sequences` (create sequence) → Use `POST /api/compositions` instead
- `GET /api/sequencer/sequences` (list sequences) → Use `GET /api/compositions` instead
- `DELETE /api/sequencer/sequences/{id}` → Use `DELETE /api/compositions/{id}` instead

**Keep** (internal to composition):
- `GET /api/sequencer/sequences/{id}` → Internal: get sequence data for active composition
- `PUT /api/sequencer/sequences/{id}` → Internal: update sequence settings (tempo, time signature)

### 2. Composition Service Changes
**Current**: `CompositionService.save_composition(sequence_id, ...)`
**New**: `CompositionService.save_composition(composition_id, ...)`

The composition_id IS the sequence_id (1:1 relationship), but conceptually we should think "composition" not "sequence".

### 3. Sequencer Service Changes
**Current**: `SequencerService.create_sequence()` → Creates standalone sequence
**New**: Sequences are ONLY created internally when a composition is created

## Implementation Plan

### Phase 1: UI Refactoring (Frontend)
1. ✅ Expand CompositionSwitcher to full File menu
2. ✅ Remove "Sequence Manager" from sequencer toolbar
3. ✅ Remove sequence dropdown from sequencer toolbar
4. ✅ Update "Sequence Settings" to "Composition Settings"
5. ✅ Delete SequencerSequenceManager.tsx

### Phase 2: State Management (Zustand Store)
1. ✅ Remove `sequences` array from store (there's only ONE active sequence)
2. ✅ Add `activeComposition` to store (contains the ONE sequence)
3. ✅ Update all actions to work with compositions, not sequences
4. ✅ Remove `loadSequences()`, `createSequence()` from store
5. ✅ Add `createComposition()`, `loadComposition()`, `saveComposition()` to store

### Phase 3: Backend API Cleanup
1. ✅ Deprecate sequence creation endpoints
2. ✅ Ensure composition endpoints are the primary interface
3. ✅ Update CompositionService to be composition-first
4. ✅ Update SequencerService to be internal-only (no public sequence creation)

### Phase 4: Testing
1. ✅ Test: Create new composition → creates sequence internally
2. ✅ Test: Load composition → loads sequence + all state
3. ✅ Test: Save composition → saves sequence + all state
4. ✅ Test: Switch compositions → unloads old, loads new
5. ✅ Test: Composition persistence after restart

## Key Concepts

**Composition** = The PROJECT (what the user thinks about)
**Sequence** = Internal data structure (implementation detail)

Users should NEVER see "sequence" in the UI. They see:
- "New Composition"
- "Open Composition"
- "Save Composition"
- "Composition Settings" (tempo, time signature, loop)

The fact that a composition CONTAINS a sequence is an implementation detail.

