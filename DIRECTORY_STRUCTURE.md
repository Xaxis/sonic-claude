# Directory Structure - Detailed File Placement

## CURRENT STRUCTURE (Before Refactoring)

```
backend/
├── models/
│   ├── __init__.py
│   ├── ai_actions.py
│   ├── composition.py
│   ├── daw_state.py
│   ├── effects.py
│   ├── instrument_types.py
│   ├── mixer.py
│   ├── sample_analysis.py          # Existing model
│   ├── sequence.py
│   └── types.py
│
├── services/
│   ├── analysis/                    # ❌ TO BE DELETED
│   │   ├── __init__.py
│   │   ├── audio_features_service.py      # → MOVE to perception/audio_features.py
│   │   ├── sample_analyzer_service.py     # → MOVE to perception/sample_analysis.py
│   │   └── midi_analyzer_service.py       # → MOVE to perception/symbolic_analysis.py
│   │
│   ├── ai/
│   │   ├── __init__.py
│   │   ├── state_collector_service.py     # → MERGE into perception_context.py
│   │   ├── context_builder_service.py     # → MERGE into perception_context.py
│   │   ├── agent_service.py               # → RENAME to agent.py
│   │   └── action_executor_service.py     # → RENAME to actions.py
│   │
│   ├── audio/
│   │   ├── __init__.py
│   │   ├── buffer_manager_service.py
│   │   ├── bus_manager_service.py
│   │   ├── input_service.py
│   │   └── realtime_analyzer_service.py
│   │
│   ├── daw/
│   │   ├── __init__.py
│   │   ├── composition_service.py
│   │   ├── composition_state_service.py
│   │   ├── effect_definitions.py
│   │   ├── mixer_service.py
│   │   ├── mixer_track_channels_service.py
│   │   ├── playback_engine_service.py
│   │   ├── synthdef_loader.py
│   │   ├── synthdef_registry.py
│   │   ├── track_effects_service.py
│   │   └── track_meters_service.py
│   │
│   └── websocket/
│       ├── __init__.py
│       └── websocket_manager_service.py
│
├── core/
│   ├── __init__.py
│   ├── config.py
│   ├── dependencies.py              # → UPDATE imports and DI
│   ├── engine_manager.py
│   └── exceptions.py
│
└── api/
    ├── assistant/
    ├── audio/
    ├── compositions/
    ├── playback/
    ├── samples/
    └── websocket/
```

---

## NEW STRUCTURE (After Refactoring)

```
backend/
├── models/
│   ├── __init__.py
│   ├── ai_actions.py
│   ├── composition.py
│   ├── daw_state.py
│   ├── effects.py
│   ├── instrument_types.py
│   ├── mixer.py
│   ├── sample_analysis.py
│   ├── sequence.py
│   ├── types.py
│   └── perception.py                # ⭐ NEW - TrackPerception, CompositionPerception models
│
├── services/
│   ├── perception/                  # ⭐ NEW DIRECTORY - Unified perception pipeline
│   │   ├── __init__.py              # ⭐ NEW - Exports all analyzers
│   │   ├── types.py                 # ⭐ NEW - Shared perception types
│   │   │
│   │   ├── audio_features.py        # ✏️ MOVED & RENAMED from analysis/audio_features_service.py
│   │   │   └── class AudioFeaturesAnalyzer (was AudioFeatureExtractor)
│   │   │
│   │   ├── sample_analysis.py       # ✏️ MOVED & RENAMED from analysis/sample_analyzer_service.py
│   │   │   └── class SampleAnalyzer (was SampleFileAnalyzer)
│   │   │
│   │   ├── symbolic_analysis.py     # ✏️ MOVED & RENAMED from analysis/midi_analyzer_service.py
│   │   │   └── class SymbolicAnalyzer (was MIDIAnalyzer)
│   │   │
│   │   ├── musical_perception.py    # ⭐ NEW - Track-level musical understanding
│   │   │   └── class MusicalPerceptionAnalyzer
│   │   │       ├── analyze_track()
│   │   │       ├── _describe_timbre()
│   │   │       ├── _detect_harmonic_role()
│   │   │       ├── _detect_rhythmic_role()
│   │   │       └── _analyze_frequency_occupancy()
│   │   │
│   │   └── composition_perception.py # ⭐ NEW - Composition-level intelligence
│   │       └── class CompositionPerceptionAnalyzer
│   │           ├── analyze_composition()
│   │           ├── _detect_frequency_conflicts()
│   │           ├── _analyze_harmonic_relationships()
│   │           ├── _map_stereo_field()
│   │           ├── _compute_energy_curve()
│   │           └── _generate_suggestions()
│   │
│   ├── ai/
│   │   ├── __init__.py
│   │   │
│   │   ├── perception_context.py    # ⭐ NEW - Merged state_collector + context_builder
│   │   │   └── class PerceptionContextBuilder (was DAWStateService + ContextBuilderService)
│   │   │       ├── build_full_context()
│   │   │       ├── build_track_context()
│   │   │       └── build_composition_context()
│   │   │
│   │   ├── request_router.py        # ⭐ NEW - Smart context routing
│   │   │   └── class RequestRouter
│   │   │       ├── classify_request()
│   │   │       ├── get_context_requirements()
│   │   │       └── route_request()
│   │   │
│   │   ├── music_generator.py       # ⭐ NEW - LLM-driven music generation
│   │   │   └── class MusicGenerator
│   │   │       ├── generate_from_prompt()
│   │   │       ├── generate_complementary_part()
│   │   │       └── generate_full_arrangement()
│   │   │
│   │   ├── agent.py                 # ✏️ RENAMED from agent_service.py
│   │   │   └── class AIAgent (was AIAgentService)
│   │   │
│   │   └── actions.py               # ✏️ RENAMED from action_executor_service.py
│   │       └── class ActionExecutor (was DAWActionService)
│   │
│   ├── audio/                       # ✅ UNCHANGED
│   │   ├── __init__.py
│   │   ├── buffer_manager_service.py
│   │   ├── bus_manager_service.py
│   │   ├── input_service.py
│   │   └── realtime_analyzer_service.py
│   │
│   ├── daw/                         # ✅ UNCHANGED
│   │   ├── __init__.py
│   │   ├── composition_service.py
│   │   ├── composition_state_service.py
│   │   ├── effect_definitions.py
│   │   ├── mixer_service.py
│   │   ├── mixer_track_channels_service.py
│   │   ├── playback_engine_service.py
│   │   ├── synthdef_loader.py
│   │   ├── synthdef_registry.py
│   │   ├── track_effects_service.py
│   │   └── track_meters_service.py
│   │
│   └── websocket/                   # ✅ UNCHANGED
│       ├── __init__.py
│       └── websocket_manager_service.py
│
├── core/
│   ├── __init__.py
│   ├── config.py
│   ├── dependencies.py              # ✏️ UPDATED - New imports, DI setup
│   ├── engine_manager.py
│   └── exceptions.py
│
└── api/                             # ✅ UNCHANGED
    ├── assistant/
    ├── audio/
    ├── compositions/
    ├── playback/
    ├── samples/
    └── websocket/
```

---

## File Movement Summary

### Phase 1: Moves & Renames (No Logic Changes)

| Current Path | New Path | Action | Class Rename |
|-------------|----------|--------|--------------|
| `services/analysis/audio_features_service.py` | `services/perception/audio_features.py` | MOVE + RENAME | `AudioFeatureExtractor` → `AudioFeaturesAnalyzer` |
| `services/analysis/sample_analyzer_service.py` | `services/perception/sample_analysis.py` | MOVE + RENAME | `SampleFileAnalyzer` → `SampleAnalyzer` |
| `services/analysis/midi_analyzer_service.py` | `services/perception/symbolic_analysis.py` | MOVE + RENAME | `MIDIAnalyzer` → `SymbolicAnalyzer` |
| `services/ai/agent_service.py` | `services/ai/agent.py` | RENAME | `AIAgentService` → `AIAgent` |
| `services/ai/action_executor_service.py` | `services/ai/actions.py` | RENAME | `DAWActionService` → `ActionExecutor` |
| `services/ai/state_collector_service.py` | (merged) | DELETE | Merged into `PerceptionContextBuilder` |
| `services/ai/context_builder_service.py` | (merged) | DELETE | Merged into `PerceptionContextBuilder` |
| `services/analysis/` | (deleted) | DELETE | Entire directory removed |

### Phase 2: New Files (New Capabilities)

| New Path | Purpose | Key Classes |
|----------|---------|-------------|
| `models/perception.py` | Perception data models | `TrackPerception`, `CompositionPerception`, `FrequencyConflict` |
| `services/perception/__init__.py` | Module exports | Exports all analyzers |
| `services/perception/types.py` | Shared types | Perception-related types |
| `services/perception/musical_perception.py` | Track-level musical understanding | `MusicalPerceptionAnalyzer` |
| `services/perception/composition_perception.py` | Composition-level intelligence | `CompositionPerceptionAnalyzer` |
| `services/ai/perception_context.py` | Unified context builder | `PerceptionContextBuilder` |
| `services/ai/request_router.py` | Smart context routing | `RequestRouter` |
| `services/ai/music_generator.py` | LLM music generation | `MusicGenerator` |

---

## Legend

- ⭐ **NEW** - Brand new file/directory
- ✏️ **RENAMED/MOVED** - Existing file moved or renamed
- ✅ **UNCHANGED** - No changes to this directory
- ❌ **DELETED** - Will be removed after migration

