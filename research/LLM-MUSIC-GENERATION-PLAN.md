# LLM Music Generation: ACTUAL Implementation Plan

**Date**: 2026-02-27
**Reality Check**: Based on actual codebase analysis, not research fantasies

---

## Current State Analysis

### What Actually Exists

**AI Agent (`backend/services/ai/agent_service.py`)**:
- Claude Sonnet 4.5 integration via Anthropic API
- Tool-based architecture with structured function calling
- Creates MIDI clips directly with compact note format: `{n: note, s: start, d: duration, v: velocity}`
- Has access to 3-layer perception pipeline (but doesn't use it for generation)
- Composite tools prevent empty tracks (`create_track_with_content`)
- Intent routing for focused execution

**Perception Pipeline (3 layers)**:
- Layer 1: `AudioFeaturesAnalyzer`, `SymbolicAnalyzer`, `SampleAnalyzer` (raw features)
- Layer 2: `MusicalPerceptionAnalyzer` (track-level timbre/rhythm/role)
- Layer 3: `CompositionPerceptionAnalyzer` (mix-level conflicts/balance)
- Returns structured analysis but NO feedback loop to generation

**SuperCollider Integration**:
- OSC communication via `AudioEngineManager` (ports 57110/57121)
- SynthDefs loaded from `.scd` files (instruments, effects, monitoring)
- MIDI → frequency conversion: `freq = 440.0 * (2.0 ** ((note - 69) / 12.0))`
- Real-time audio monitoring with FFT/spectrum/meters
- No ABC notation support, no music21 integration

**Data Models**:
- `Composition`: Complete project state (tracks, clips, mixer, effects, chat history)
- `Track`: MIDI or audio, has instrument/sample assignment
- `Clip`: MIDI (with `MIDINote` events) or Audio (with file path)
- `MIDINote`: `{note, note_name, start_time, duration, velocity, channel}`

### What Doesn't Exist

- ABC notation support (no music21 library)
- Hierarchical generation pipeline (currently direct MIDI generation)
- Perception → feedback → refinement loop
- Genre constraint libraries
- Multi-scale generation (only composition-level)
- Musical reasoning service
- Any notion of "musical thought" - just raw MIDI note arrays

---

## The Actual Problems

### Problem 1: Direct MIDI Generation is Incoherent

Current flow:
```
User: "Create a jazz bass line"
→ Claude generates: [{n: 48, s: 0, d: 0.5, v: 100}, {n: 50, s: 0.5, d: 0.5, v: 95}, ...]
→ SuperCollider plays it
→ Sounds random/bad
```

Why it fails:
- No harmonic reasoning (just random MIDI numbers)
- No rhythmic structure (arbitrary start times)
- No genre knowledge (doesn't know what "jazz" means musically)
- No feedback (can't hear how bad it sounds)

### Problem 2: Perception Pipeline is Disconnected

Current flow:
```
Composition plays → Perception analyzers run → Generate insights → NOTHING HAPPENS
```

The perception data exists but isn't fed back to the AI for refinement.

### Problem 3: No Musical Knowledge Representation

Claude doesn't know:
- What chords are (just sees MIDI note numbers)
- What scales are
- What rhythmic patterns are
- What "jazz" or "EDM" means musically

It's like asking someone to paint who can only see RGB values, not colors.

---

## Realistic Implementation Plan

### Phase 1: Add Musical Knowledge Layer (Week 1-2)

**Goal**: Give Claude musical vocabulary without ABC notation complexity

**What to Build**:

1. **`MusicalKnowledgeService`** (`backend/services/ai/musical_knowledge.py`)
   ```python
   class MusicalKnowledgeService:
       def chord_to_midi_notes(self, chord_name: str, octave: int) -> List[int]
       def scale_to_midi_notes(self, scale_name: str, root: str, octave: int) -> List[int]
       def rhythm_pattern_to_timings(self, pattern: str, tempo: float) -> List[float]
       def genre_to_constraints(self, genre: str) -> GenreConstraints
   ```

2. **Genre Constraint Data** (`backend/data/genre_constraints.json`)
   ```json
   {
     "jazz": {
       "chords": ["Cmaj7", "Dm7", "G7", "Am7"],
       "scales": ["major", "dorian", "mixolydian"],
       "rhythm_patterns": ["swing_8th", "walking_bass"],
       "tempo_range": [80, 180]
     }
   }
   ```

3. **Update Agent Tools**:
   - Add `generate_music_with_knowledge` tool
   - Takes: `{genre, intent, key, tempo, duration}`
   - Returns: Structured musical plan → MIDI notes

**Why This Works**:
- Builds on existing MIDI infrastructure
- No new dependencies (music21 is overkill)
- Claude can reason about "Cmaj7" instead of "[60, 64, 67, 71]"
- Incremental improvement

---

### Phase 2: Hierarchical Generation (Week 3-4)

**Goal**: Generate music in stages instead of all-at-once

**What to Build**:

1. **`HierarchicalMusicGenerator`** (`backend/services/ai/hierarchical_generator.py`)
   ```python
   async def generate_composition(self, intent: str, genre: str):
       # Stage 1: Musical plan
       plan = await self._generate_plan(intent, genre)

       # Stage 2: Harmonic foundation
       chords = await self._generate_harmony(plan)

       # Stage 3: Melodic content
       melody = await self._generate_melody(chords, plan)


---

### Phase 4: Multi-Scale Generation (Week 7-8)

**Goal**: Generate at different granularities (track vs composition)

**What to Build**:

1. **Scope Detection in Agent**:
   ```python
   def detect_scope(self, user_intent: str) -> str:
       # Simple keyword matching (no fancy ML needed)
       if "track" in user_intent or "bass" in user_intent or "drums" in user_intent:
           return "track"
       elif "section" in user_intent or "chorus" in user_intent:
           return "section"
       else:
           return "composition"
   ```

2. **Track-Level Generation**:
   ```python
   async def generate_track(
       self,
       composition_id: str,
       track_role: str,  # "bass", "drums", "melody", "chords"
       genre: str,
       duration: float
   ) -> Track:
       # Get existing composition context
       composition = self.get_composition(composition_id)

       # Extract harmonic context from existing tracks
       chords = self._extract_chords_from_composition(composition)

       # Generate track that fits
       notes = await self._generate_track_notes(
           role=track_role,
           chords=chords,
           genre=genre,
           duration=duration
       )

       return self._create_track_with_notes(notes, track_role)
   ```

**Why This Works**:
- Builds on Phase 2 (hierarchical generation)
- Uses existing composition context
- Simple scope detection (no complex routing)
- Practical use case (add bass to existing song)

---

## What NOT to Do

### ❌ Don't: Add ABC Notation

**Why**:
- Adds dependency (music21 is 50MB+)
- Requires MIDI ↔ ABC conversion (error-prone)
- Claude already understands musical concepts in natural language
- Adds complexity without clear benefit for this codebase

**Instead**: Use structured JSON with musical terms:
```json
{
  "chords": ["Cmaj7", "Am7", "Fmaj7", "G7"],
  "melody": [
    {"note": "E4", "duration": "quarter", "timing": 0.0},
    {"note": "G4", "duration": "quarter", "timing": 0.5}
  ]
}
```

### ❌ Don't: Create Separate Services for Everything

**Why**:
- Current architecture is clean (AI agent + action executor)
- Adding 5 new services creates maintenance burden
- Most "services" can be simple functions

**Instead**: Add helper classes in `backend/services/ai/`:
- `musical_knowledge.py` (chord/scale/rhythm helpers)
- `hierarchical_generator.py` (staged generation logic)
- `musical_feedback.py` (perception → suggestions)

### ❌ Don't: Try to Implement All 5 Phases at Once

**Why**:
- Each phase depends on previous phase working
- Need to validate quality improvements incrementally
- Risk of building complex system that doesn't work

**Instead**: Ship Phase 1, measure improvement, then decide if Phase 2 is worth it.

---

## Concrete Next Steps

### This Week:

1. **Create `MusicalKnowledgeService`**:
   ```bash
   touch backend/services/ai/musical_knowledge.py
   ```
   - Implement `chord_to_midi_notes()`
   - Implement `scale_to_midi_notes()`
   - Test with simple chords (Cmaj, Dm7, G7)

2. **Create Genre Constraints JSON**:
   ```bash
   mkdir -p backend/data
   touch backend/data/genre_constraints.json
   ```
   - Add jazz constraints (chords, scales, tempo)
   - Add EDM constraints
   - Add rock constraints

3. **Update Agent Tool**:
   - Modify `create_track_with_content` to accept `genre` parameter
   - Use `MusicalKnowledgeService` to generate better notes
   - Test: "Create a jazz bass line" should sound more coherent

### Week 2:

1. **Measure Improvement**:
   - Generate 10 compositions with old system
   - Generate 10 compositions with new system
   - Compare harmonic coherence scores from perception analyzer
   - If improvement < 20%, stop and reassess

2. **Add Rhythm Patterns**:
   - Implement `rhythm_pattern_to_timings()`
   - Add common patterns (4-on-floor, swing, shuffle)
   - Test with drum generation

### Week 3-4 (Only if Week 1-2 shows improvement):

1. **Implement Hierarchical Generation**:
   - Create `HierarchicalMusicGenerator` class
   - Implement 4-stage pipeline
   - Create prompt templates
   - Test with full composition generation

### Week 5-6 (Only if Week 3-4 works):

1. **Add Feedback Loop**:
   - Create `MusicalFeedbackGenerator`
   - Connect to existing perception analyzers
   - Implement refinement loop
   - Measure quality improvement

---

## Success Metrics (Realistic)

### Phase 1 Success:
- Harmonic coherence score: >0.6 (currently ~0.3)
- Generated chords actually sound like the requested genre
- User can hear the difference between "jazz" and "EDM"

### Phase 2 Success:
- Compositions have clear structure (intro/verse/chorus)
- Melody fits the chord progression
- No random note soup

### Phase 3 Success:
- Frequency conflicts reduced by 50%
- Mix quality score >0.7
- System automatically fixes obvious issues

### Phase 4 Success:
- Can add single track to existing composition
- New track fits harmonically with existing tracks
- No need to regenerate entire composition

---

## Risk Assessment

### High Risk:
- **Claude's musical reasoning ability**: Unknown if it can actually reason about music well enough
- **Perception analyzer accuracy**: Current analyzers might not detect real issues
- **Iteration time**: Each generation takes 5-10 seconds, refinement loop could be slow

### Medium Risk:
- **Genre constraint quality**: Hand-crafted constraints might be too simplistic
- **Harmonic extraction**: Getting chords from existing MIDI might fail
- **User expectations**: Users might expect professional-quality output

### Low Risk:
- **Technical implementation**: All building blocks exist
- **Integration**: Clean architecture makes adding features straightforward
- **Performance**: SuperCollider can handle the audio load

---

## Decision Points

### After Phase 1:
- **If harmonic coherence < 0.5**: Stop, current approach doesn't work
- **If 0.5-0.7**: Continue but lower expectations
- **If >0.7**: Full steam ahead to Phase 2

### After Phase 2:
- **If structure unclear**: Revisit prompt engineering
- **If melody doesn't fit chords**: Add harmonic validation step
- **If sounds good**: Move to Phase 3

### After Phase 3:
- **If quality doesn't improve**: Perception analyzers might be wrong
- **If improves but slow**: Optimize iteration count
- **If works well**: Consider Phase 4

---

## The Honest Truth

This is an experiment. LLMs generating music is still bleeding-edge. The research papers are optimistic but often cherry-pick results.

**What will probably work**:
- Phase 1 (musical knowledge layer) - straightforward
- Basic hierarchical generation - proven pattern
- Simple feedback loop - perception data is good

**What might not work**:
- Claude's ability to reason about complex harmony
- Automatic refinement converging to "good" music
- Multi-scale generation without explicit training

**What to do if it doesn't work**:
- Fall back to template-based generation with LLM variation
- Use LLM for high-level decisions, deterministic code for notes
- Focus on transformation/variation rather than creation from scratch

**Realistic timeline**: 8-12 weeks to know if this approach is viable.

**Realistic outcome**: 60% chance of "better than random", 30% chance of "actually good", 10% chance of "professional quality".

Build incrementally. Measure constantly. Be ready to pivot.

       return tracks
   ```

2. **Prompt Templates** (`backend/services/ai/prompts/`)
   - `plan_prompt.txt`: "Given intent X and genre Y, create musical plan"
   - `harmony_prompt.txt`: "Given plan X, create chord progression"
   - `melody_prompt.txt`: "Given chords X, create melody"
   - `arrangement_prompt.txt`: "Given melody/chords, arrange for instruments"

**Why This Works**:
- Breaks complex task into manageable steps
- Each stage validates previous stage
- Easier to debug (can inspect intermediate outputs)
- Matches how humans compose

---

### Phase 3: Perception Feedback Loop (Week 5-6)

**Goal**: Use existing perception pipeline to improve generation

**What to Build**:

1. **`MusicalFeedbackGenerator`** (`backend/services/perception/musical_feedback.py`)
   ```python
   def generate_feedback(self, perception: CompositionPerception) -> str:
       issues = []

       # Check frequency conflicts
       for conflict in perception.frequency_conflicts:
           issues.append(f"Tracks {conflict.track_ids} clash in {conflict.frequency_range}")

       # Check harmonic conflicts
       for conflict in perception.harmonic_conflicts:
           issues.append(f"Harmonic clash: {conflict.description}")

       # Generate suggestions
       return self._issues_to_suggestions(issues)
   ```

2. **Refinement Loop in Agent**:
   ```python
   async def generate_and_refine(self, intent: str, max_iterations: int = 3):
       composition = await self.generate_composition(intent)

       for i in range(max_iterations):
           # Analyze
           perception = await self.analyze_composition(composition)

           # Check quality
           if perception.mix_quality > 0.75:
               break

           # Get feedback
           feedback = self.feedback_generator.generate_feedback(perception)

           # Refine
           composition = await self.refine_composition(composition, feedback)

       return composition
   ```

**Why This Works**:
- Uses existing perception analyzers (no new code there)
- Simple feedback translation (perception → natural language)
- Iterative improvement (proven pattern)
- Measurable quality threshold


