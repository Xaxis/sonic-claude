# Music Perception Pipeline - Refactoring Plan

## Executive Summary

**Goal**: Create a unified music perception pipeline that gives the AI "ears" to understand music at multiple levels: raw audio features, musical structure, and compositional relationships.

**Problem**: Current architecture has fragmented analysis services with no compositional-level understanding. AI sees MIDI notes but doesn't "hear" how tracks sound together.

**Solution**: Reorganize into a 3-layer perception pipeline with clear separation of concerns and proper naming conventions.

---

## Current State Analysis

### Existing Services (Fragmented)

```
backend/services/analysis/
├── audio_features_service.py      # Real-time audio features (energy, brightness)
├── sample_analyzer_service.py     # Sample file analysis (spectral, temporal, timbre)
└── midi_analyzer_service.py       # MIDI analysis (key, scale, complexity)

backend/services/ai/
├── state_collector_service.py     # Aggregates state for AI (DAWStateService)
├── context_builder_service.py     # Entity-specific context (ContextBuilderService)
├── agent_service.py               # AI agent (AIAgentService)
└── action_executor_service.py     # Executes actions (DAWActionService)
```

### Problems

1. **No composition-level analysis**: Individual tracks analyzed, but not how they work together
2. **Inconsistent naming**: `audio_features_service.py` vs `midi_analyzer_service.py` vs `state_collector_service.py`
3. **Scattered responsibilities**: Musical analysis split across `analysis/` and `ai/` folders
4. **Missing perceptual layer**: AI gets structural data (notes, clips) but no perceptual descriptions (timbre, frequency balance, energy)
5. **No request routing**: All requests get same context depth (wasteful)
6. **No generative capability**: Can't generate music from text prompts (like the research paper)

---

## Proposed Architecture

### New Directory Structure

```
backend/services/perception/          # NEW - Unified perception pipeline
├── __init__.py
├── audio_features.py                 # RENAMED from analysis/audio_features_service.py
├── sample_analysis.py                # RENAMED from analysis/sample_analyzer_service.py
├── symbolic_analysis.py              # RENAMED from analysis/midi_analyzer_service.py
├── musical_perception.py             # NEW - Track-level musical understanding
├── composition_perception.py         # NEW - Composition-level analysis
└── types.py                          # NEW - Shared types for perception

backend/services/ai/
├── __init__.py
├── perception_context.py             # REFACTORED from state_collector + context_builder
├── request_router.py                 # NEW - Smart context routing
├── music_generator.py                # NEW - LLM-driven music generation
├── agent.py                          # RENAMED from agent_service.py
├── actions.py                        # RENAMED from action_executor_service.py
└── types.py                          # Existing AI types

backend/services/analysis/            # DELETED - merged into perception/
```

### Service Responsibilities

#### Perception Layer (NEW)

**Layer 1: Raw Analysis** (existing, renamed)
- `AudioFeaturesAnalyzer` - Real-time audio features from spectrum
- `SampleAnalyzer` - Sample file analysis with librosa
- `SymbolicAnalyzer` - MIDI key/scale/rhythm detection

**Layer 2: Musical Understanding** (NEW)
- `MusicalPerceptionAnalyzer` - Track-level perceptual descriptions
  - Timbre descriptions ("bright, percussive kick")
  - Harmonic function ("tonic, dominant")
  - Rhythmic role ("driving groove", "sparse melody")
  - Frequency occupancy (which bands this track fills)

**Layer 3: Compositional Intelligence** (NEW)
- `CompositionPerceptionAnalyzer` - Multi-track analysis
  - Frequency masking detection
  - Harmonic relationships between tracks
  - Stereo field mapping
  - Energy/dynamics over time
  - Mix balance analysis
  - Genre/style classification

#### AI Layer (refactored)

**Context Building**
- `PerceptionContextBuilder` - Unified context builder
  - Merges state_collector + context_builder
  - Provides rich perceptual context
  - Efficient token usage with caching

**Request Intelligence**
- `RequestRouter` - Smart context selection
  - Classifies request type
  - Loads appropriate analysis depth
  - Minimizes tokens while maximizing relevance

**Music Generation**
- `MusicGenerator` - LLM-driven music creation
  - Prompt → MIDI generation (like research paper)
  - Template-based composition
  - Complementary part generation

**Agent & Execution**
- `AIAgent` - Main AI agent (renamed for clarity)
- `ActionExecutor` - Executes DAW actions (renamed for clarity)

---

## Migration Plan

### Phase 1: Rename & Reorganize (No Logic Changes)

**Step 1.1**: Create new `perception/` directory
**Step 1.2**: Move and rename existing analysis services
**Step 1.3**: Update imports across codebase
**Step 1.4**: Update dependency injection in `core/dependencies.py`
**Step 1.5**: Verify tests pass

### Phase 2: Implement Musical Perception (NEW)

**Step 2.1**: Create `musical_perception.py`
- Track-level perceptual analysis
- Timbre descriptions for LLM
- Harmonic/rhythmic role detection

**Step 2.2**: Create `composition_perception.py`
- Multi-track frequency analysis
- Harmonic relationship detection
- Mix balance analysis

**Step 2.3**: Wire into perception pipeline

### Phase 3: Refactor AI Context Building

**Step 3.1**: Merge `state_collector` + `context_builder` → `perception_context.py`
**Step 3.2**: Integrate new perception layers
**Step 3.3**: Add perceptual descriptions to AI context

### Phase 4: Add Request Routing

**Step 4.1**: Create `request_router.py`
**Step 4.2**: Define request type taxonomy
**Step 4.3**: Implement context depth selection

### Phase 5: Add Music Generation

**Step 5.1**: Create `music_generator.py`
**Step 5.2**: Implement prompt → MIDI generation
**Step 5.3**: Add template-based composition

---

## File Mapping (Detailed)

| Current Path | New Path | Changes |
|-------------|----------|---------|
| `services/analysis/audio_features_service.py` | `services/perception/audio_features.py` | Rename class: `AudioFeatureExtractor` → `AudioFeaturesAnalyzer` |
| `services/analysis/sample_analyzer_service.py` | `services/perception/sample_analysis.py` | Rename class: `SampleFileAnalyzer` → `SampleAnalyzer` |
| `services/analysis/midi_analyzer_service.py` | `services/perception/symbolic_analysis.py` | Rename class: `MIDIAnalyzer` → `SymbolicAnalyzer` |
| `services/ai/state_collector_service.py` | `services/ai/perception_context.py` | Merge with context_builder, rename: `DAWStateService` → `PerceptionContextBuilder` |
| `services/ai/context_builder_service.py` | `services/ai/perception_context.py` | Merged into perception_context.py |
| `services/ai/agent_service.py` | `services/ai/agent.py` | Rename class: `AIAgentService` → `AIAgent` |
| `services/ai/action_executor_service.py` | `services/ai/actions.py` | Rename class: `DAWActionService` → `ActionExecutor` |
| N/A | `services/perception/musical_perception.py` | NEW - `MusicalPerceptionAnalyzer` |
| N/A | `services/perception/composition_perception.py` | NEW - `CompositionPerceptionAnalyzer` |
| N/A | `services/ai/request_router.py` | NEW - `RequestRouter` |
| N/A | `services/ai/music_generator.py` | NEW - `MusicGenerator` |

---

## Next Steps

1. Review and approve this plan
2. Start with Phase 1 (rename & reorganize)
3. Implement Phase 2 (musical perception) - THE CRITICAL NEW CAPABILITY
4. Continue with remaining phases

**Estimated effort**: 
- Phase 1: 2-3 hours (mechanical refactoring)
- Phase 2: 8-10 hours (new perception logic)
- Phase 3: 3-4 hours (merge context builders)
- Phase 4: 4-5 hours (request routing)
- Phase 5: 6-8 hours (music generation)

**Total**: ~25-30 hours of focused development

