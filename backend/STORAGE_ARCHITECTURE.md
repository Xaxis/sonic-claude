# Storage Architecture

## Overview
Sonic Claude uses a **unified composition storage system** with clear separation of concerns.

## Directory Structure

```
data/
├── compositions/              # Unified composition storage (ONLY source of truth)
│   └── <composition_id>/
│       ├── current.json       # Current complete state
│       ├── metadata.json      # Composition metadata
│       ├── history/           # Version history
│       │   ├── 000_original.json
│       │   ├── 001_<timestamp>.json
│       │   └── ...
│       └── autosave.json      # Autosave backup
│
└── samples/                   # Audio samples
    ├── <sample_files>         # .webm, .wav, .mp3, etc.
    ├── metadata.json          # Sample metadata
    └── cache/                 # Sample analysis cache
        └── <sample_id>.json   # Cached analysis results
```

## Storage Responsibilities

### ✅ CompositionService (backend/services/composition_service.py)
**ONLY service that persists composition data**

- **Stores:** Complete composition snapshots (sequence + mixer + effects + samples)
- **Location:** `data/compositions/<composition_id>/`
- **Handles:**
  - Manual saves
  - AI iterations
  - Autosave
  - Version history
  - Atomic writes

### ✅ SampleAnalyzer (backend/services/sample_analyzer.py)
**Caches audio analysis results**

- **Stores:** Sample analysis cache (spectral, temporal, pitch features)
- **Location:** `data/samples/cache/<sample_id>.json`
- **Purpose:** Avoid re-analyzing samples on every AI request

### ✅ Sample Routes (backend/api/sample_routes.py)
**Manages audio sample files**

- **Stores:** Audio sample files + metadata
- **Location:** `data/samples/`
- **Handles:**
  - Sample upload
  - Sample metadata
  - Sample deletion

### ❌ Services That Do NOT Persist

#### SequencerService
- **Storage:** In-memory ONLY
- **Persistence:** Handled by CompositionService
- **State:** `self.sequences: Dict[str, Sequence]`

#### MixerService
- **Storage:** In-memory ONLY
- **Persistence:** Handled by CompositionService
- **State:** `self.state: MixerState`

#### TrackEffectsService
- **Storage:** In-memory ONLY
- **Persistence:** Handled by CompositionService
- **State:** `self.track_effects: Dict[str, TrackEffectChain]`

## Configuration (backend/core/config.py)

### StorageConfig
```python
class StorageConfig(BaseSettings):
    data_dir: Path = Path("data")
    samples_dir: Path = Path("data/samples")
    compositions_dir: Path = Path("data/compositions")
    
    def ensure_directories(self) -> None:
        """Create ONLY these directories at startup"""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.samples_dir.mkdir(parents=True, exist_ok=True)
        self.compositions_dir.mkdir(parents=True, exist_ok=True)
```

### Rules
1. **ONLY** `config.ensure_directories()` creates directories at startup
2. Services can create subdirectories on-demand (e.g., `compositions/<id>/history/`)
3. **NO** service should create top-level directories

## Data Flow

### Save Composition
```
User Action → Frontend → API → CompositionService.save_composition()
                                    ↓
                        data/compositions/<id>/current.json
                        data/compositions/<id>/history/NNN_<timestamp>.json
```

### Load Composition
```
Frontend → API → CompositionService.load_composition()
                        ↓
            Restore state to:
            - SequencerService.sequences
            - MixerService.state
            - TrackEffectsService.track_effects
```

### AI Iteration
```
AI Action → AIAgentService → DAWActionService → Services (in-memory)
                                                        ↓
                                            CompositionService.save_composition()
                                                        ↓
                                            data/compositions/<id>/history/
```

## Migration Notes

### Deprecated Directories
- ❌ `data/sequences/` - REMOVED (use `data/compositions/`)
- ❌ `data/mixer/` - REMOVED (use `data/compositions/`)
- ❌ `data/iterations/` - REMOVED (use `data/compositions/`)
- ❌ `data/sample_cache/` - MOVED to `data/samples/cache/`

### Migration Path
Old data in deprecated directories will NOT be automatically migrated.
Users should manually save compositions to migrate to the new system.

