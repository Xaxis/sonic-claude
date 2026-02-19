# Unified Composition Storage Migration Plan

## Problem
We had a fragmented mess of storage systems:
- `sequence_storage.py` - sequences only in `data/sequences/`
- `iteration_service.py` - AI iterations only in `data/iterations/`
- `mixer_service.py` - mixer state in `data/mixer/`
- `track_effects_service.py` - effects stored separately
- `data/sample_cache/` - should be inside `data/samples/`

## Solution
**ONE unified `CompositionService`** that stores complete compositions (sequence + mixer + effects + samples) with unified versioning for both manual saves AND AI iterations.

## New Directory Structure
```
data/
├── compositions/
│   └── <composition_id>/
│       ├── current.json           # Current complete state
│       ├── metadata.json          # Composition metadata
│       ├── history/
│       │   ├── 000_original.json  # Original state
│       │   ├── 001_<timestamp>.json  # First save/iteration
│       │   ├── 002_<timestamp>.json  # Second save/iteration
│       │   └── ...
│       └── autosave.json          # Autosave backup
└── samples/
    ├── <sample_files>
    └── cache/                     # Sample analysis cache (MOVED)
```

## Migration Steps

### 1. ✅ Create Unified Service
- [x] Created `backend/services/composition_service.py`
- [x] Stores complete CompositionSnapshot (sequence + mixer + effects + samples)
- [x] Unified history/versioning for ALL saves (manual + AI)
- [x] Atomic writes, autosave support

### 2. Update All Services to Use CompositionService

#### A. Update SequencerService
- [ ] Replace `SequenceStorage` with `CompositionService`
- [ ] Update `save_sequence()` to save complete composition
- [ ] Update `load_sequence()` to load from composition
- [ ] Update autosave to use composition service

#### B. Update MixerService
- [ ] Remove local storage (`data/mixer/mixer_state.json`)
- [ ] Use CompositionService for persistence
- [ ] Mixer state saved as part of complete composition

#### C. Update TrackEffectsService
- [ ] Remove separate effects storage
- [ ] Effects saved as part of complete composition

#### D. Update AIAgentService
- [ ] Remove `IterationService` dependency
- [ ] Use `CompositionService` to create history entries after AI actions
- [ ] Each AI action creates a new history version

### 3. Update Dependencies
- [ ] Add `CompositionService` to `backend/core/dependencies.py`
- [ ] Initialize in `initialize_services()`
- [ ] Inject into sequencer, mixer, effects, AI services
- [ ] Remove `IterationService` initialization

### 4. Delete Old Services
- [ ] Delete `backend/services/sequence_storage.py`
- [ ] Delete `backend/services/iteration_service.py`
- [ ] Look for anything else? Related refactors.
- [ ] Remove mixer/effects local storage code

### 5. WE DONT CARE ABOUT MIGRATING EXISTING DATA
- [ ] SKip this step, delete old data!

### 6. Update Frontend (if needed)
- [ ] Update API calls to use new composition endpoints
- [ ] Update iteration navigation to use composition history

## Benefits
1. **Single source of truth** - ONE service for ALL composition data
2. **Complete snapshots** - Every save captures EVERYTHING
3. **Unified history** - No separate systems for manual vs AI saves
4. **Consistent structure** - Same pattern everywhere
5. **Easier navigation** - Forward/backward through complete states
6. **Simpler code** - Less fragmentation, easier to maintain

## Next Steps
1. Update SequencerService to use CompositionService
2. Update MixerService to use CompositionService
3. Update TrackEffectsService to use CompositionService
4. Update AIAgentService to use CompositionService
5. Wire up in dependencies
6. Test thoroughly
7. Migrate existing data
8. Delete old services

