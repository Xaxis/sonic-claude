# Music Perception Pipeline - Implementation Checklist

## Phase 1: Rename & Reorganize ✅ (No Logic Changes)

### Step 1.1: Create new directory structure
- [ ] Create `backend/services/perception/` directory
- [ ] Create `backend/services/perception/__init__.py`
- [ ] Create `backend/services/perception/types.py` (for shared types)

### Step 1.2: Move and rename analysis services
- [ ] Move `analysis/audio_features_service.py` → `perception/audio_features.py`
  - [ ] Rename class: `AudioFeatureExtractor` → `AudioFeaturesAnalyzer`
  - [ ] Update docstrings
- [ ] Move `analysis/sample_analyzer_service.py` → `perception/sample_analysis.py`
  - [ ] Rename class: `SampleFileAnalyzer` → `SampleAnalyzer`
  - [ ] Update docstrings
- [ ] Move `analysis/midi_analyzer_service.py` → `perception/symbolic_analysis.py`
  - [ ] Rename class: `MIDIAnalyzer` → `SymbolicAnalyzer`
  - [ ] Update docstrings

### Step 1.3: Update imports across codebase
- [ ] Update `backend/core/dependencies.py`
  - [ ] Change imports from `services.analysis.*` to `services.perception.*`
  - [ ] Update class names in type hints
  - [ ] Update variable names (`_audio_feature_extractor` → `_audio_features_analyzer`)
- [ ] Update `backend/services/ai/state_collector_service.py`
  - [ ] Update imports
  - [ ] Update constructor parameters
- [ ] Search codebase for all imports of old services
  - [ ] `rg "from backend.services.analysis" backend/`
  - [ ] Update each occurrence

### Step 1.4: Update dependency injection
- [ ] Update `initialize_services()` in `dependencies.py`
  - [ ] Use new class names
  - [ ] Verify dependency graph is correct
- [ ] Update getter functions
  - [ ] `get_audio_feature_extractor()` → `get_audio_features_analyzer()`
  - [ ] `get_sample_analyzer()` (already correct)
  - [ ] `get_musical_context_analyzer()` → `get_symbolic_analyzer()`

### Step 1.5: Verify tests pass
- [ ] Run backend tests: `pytest backend/tests/`
- [ ] Fix any import errors
- [ ] Verify no functionality broken

### Step 1.6: Delete old directory
- [ ] Delete `backend/services/analysis/` (after confirming all moved)

---

## Phase 2: Implement Musical Perception 🎵 (NEW)

### Step 2.1: Create perception models
- [ ] Create `backend/models/perception.py`
  - [ ] Define `TrackPerception` model
  - [ ] Define `CompositionPerception` model
  - [ ] Define `FrequencyConflict` model
  - [ ] Define `HarmonicConflict` model
  - [ ] Define `RhythmicConflict` model

### Step 2.2: Implement MusicalPerceptionAnalyzer
- [ ] Create `backend/services/perception/musical_perception.py`
- [ ] Implement `MusicalPerceptionAnalyzer` class
  - [ ] `__init__()` - inject dependencies
  - [ ] `analyze_track()` - main entry point
  - [ ] `_describe_timbre()` - convert features to natural language
  - [ ] `_detect_harmonic_role()` - bass/harmony/melody/percussion
  - [ ] `_detect_rhythmic_role()` - groove/accents/sustained
  - [ ] `_analyze_frequency_occupancy()` - which bands occupied
  - [ ] `_detect_conflicts()` - find clashing tracks
- [ ] Add unit tests for musical perception

### Step 2.3: Implement CompositionPerceptionAnalyzer
- [ ] Create `backend/services/perception/composition_perception.py`
- [ ] Implement `CompositionPerceptionAnalyzer` class
  - [ ] `__init__()` - inject dependencies
  - [ ] `analyze_composition()` - main entry point
  - [ ] `_detect_frequency_conflicts()` - find masking
  - [ ] `_analyze_harmonic_relationships()` - chord progressions
  - [ ] `_map_stereo_field()` - spatial positioning
  - [ ] `_compute_energy_curve()` - dynamics over time
  - [ ] `_analyze_mix_balance()` - frequency distribution
  - [ ] `_generate_suggestions()` - actionable recommendations
- [ ] Add unit tests for composition perception

### Step 2.4: Wire into dependency injection
- [ ] Update `backend/core/dependencies.py`
  - [ ] Add `_musical_perception_analyzer` singleton
  - [ ] Add `_composition_perception_analyzer` singleton
  - [ ] Initialize in `initialize_services()`
  - [ ] Create getter functions

---

## Phase 3: Refactor AI Context Building 🤖

### Step 3.1: Merge state_collector + context_builder
- [ ] Create `backend/services/ai/perception_context.py`
- [ ] Implement `PerceptionContextBuilder` class
  - [ ] Merge logic from `DAWStateService`
  - [ ] Merge logic from `ContextBuilderService`
  - [ ] Add perception layer integration
  - [ ] Implement smart caching
- [ ] Update `backend/services/ai/__init__.py`
  - [ ] Export `PerceptionContextBuilder`

### Step 3.2: Integrate new perception layers
- [ ] Update `PerceptionContextBuilder.__init__()`
  - [ ] Inject `MusicalPerceptionAnalyzer`
  - [ ] Inject `CompositionPerceptionAnalyzer`
- [ ] Implement `build_full_context()`
  - [ ] Get raw analysis (existing)
  - [ ] Get track perceptions (NEW)
  - [ ] Get composition perception (NEW)
  - [ ] Format for LLM consumption
- [ ] Implement `build_track_context()`
  - [ ] Include track perception
  - [ ] Include frequency conflicts
- [ ] Implement `build_composition_context()`
  - [ ] Include composition perception
  - [ ] Include suggestions

### Step 3.3: Update AI agent to use new context
- [ ] Update `backend/services/ai/agent_service.py`
  - [ ] Change dependency from `DAWStateService` to `PerceptionContextBuilder`
  - [ ] Update `_build_context_message()` to use new format
  - [ ] Add perceptual descriptions to planning prompt
- [ ] Update `backend/core/dependencies.py`
  - [ ] Replace `_daw_state_service` with `_perception_context_builder`
  - [ ] Update initialization

### Step 3.4: Delete old services
- [ ] Delete `backend/services/ai/state_collector_service.py`
- [ ] Delete `backend/services/ai/context_builder_service.py`

---

## Phase 4: Add Request Routing 🎯

### Step 4.1: Create request router
- [ ] Create `backend/services/ai/request_router.py`
- [ ] Implement `RequestRouter` class
  - [ ] Define request type taxonomy
  - [ ] Implement `classify_request()` - detect request type
  - [ ] Implement `get_context_requirements()` - what to include
  - [ ] Implement `route_request()` - return appropriate context

### Step 4.2: Define request types
- [ ] `modify_single_track` - focused context
- [ ] `add_track` - composition context + gaps
- [ ] `create_full_composition` - generative templates
- [ ] `modify_effects` - track + frequency analysis
- [ ] `change_sound_character` - timbre analysis

### Step 4.3: Integrate into AI agent
- [ ] Update `AIAgentService.send_message()`
  - [ ] Use `RequestRouter` to classify request
  - [ ] Load only required context depth
  - [ ] Pass to planning stage
- [ ] Measure token savings

---

## Phase 5: Add Music Generation 🎼

### Step 5.1: Create music generator
- [ ] Create `backend/services/ai/music_generator.py`
- [ ] Implement `MusicGenerator` class
  - [ ] `__init__()` - inject LLM client
  - [ ] `generate_from_prompt()` - text → MIDI
  - [ ] `generate_complementary_part()` - fit with existing
  - [ ] `generate_full_arrangement()` - multi-track

### Step 5.2: Implement prompt → MIDI generation
- [ ] Create prompt templates (like research paper)
- [ ] Implement JSON → MIDI conversion
- [ ] Add validation and error handling
- [ ] Test with various prompts

### Step 5.3: Add genre/style templates
- [ ] Define genre characteristics (lo-fi, techno, etc.)
- [ ] Create template system
- [ ] Implement template-based generation

### Step 5.4: Integrate into AI agent
- [ ] Update `AIAgentService`
  - [ ] Add `MusicGenerator` dependency
  - [ ] Add generation actions to tool definitions
  - [ ] Wire up in execution stage

---

## Testing & Validation

### Unit Tests
- [ ] Test `MusicalPerceptionAnalyzer` with sample tracks
- [ ] Test `CompositionPerceptionAnalyzer` with sample compositions
- [ ] Test `PerceptionContextBuilder` context building
- [ ] Test `RequestRouter` classification
- [ ] Test `MusicGenerator` MIDI generation

### Integration Tests
- [ ] Test full perception pipeline end-to-end
- [ ] Test AI agent with new perception context
- [ ] Test request routing with different request types
- [ ] Test music generation from prompts

### Manual Testing
- [ ] Create test composition with frequency conflicts
- [ ] Ask AI to "add a bassline" - verify it uses perception
- [ ] Ask AI to "make it warmer" - verify it analyzes timbre
- [ ] Ask AI to "create a lo-fi beat" - verify generation works

---

## Documentation

- [ ] Update architecture documentation
- [ ] Add perception pipeline diagrams
- [ ] Document new models and types
- [ ] Add usage examples
- [ ] Update API documentation

---

## Deployment

- [ ] Run full test suite
- [ ] Verify no regressions
- [ ] Update dependencies if needed
- [ ] Deploy to staging
- [ ] Test in production-like environment
- [ ] Deploy to production

---

## Success Metrics

- [ ] AI generates musically appropriate basslines
- [ ] AI correctly identifies frequency conflicts
- [ ] AI provides actionable mix suggestions
- [ ] Token usage reduced by ~25% (smart routing)
- [ ] Music generation works for basic prompts
- [ ] User satisfaction with AI suggestions improves

