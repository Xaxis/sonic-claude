# AI Pipeline Analysis & Instrument Validation Fix

## Executive Summary

**CRITICAL ISSUE**: The AI assistant (both chat and inline) is selecting instrument values that don't exist in the SuperCollider SynthDef registry, causing tracks to be created with invalid instruments that cannot produce sound.

**ROOT CAUSE**: The AI tool definition hardcodes an outdated, incomplete list of instruments instead of using the authoritative `SYNTHDEF_REGISTRY`.

**IMPACT**: User requests like "add a piano" or "create a bass line" result in broken tracks with non-existent instruments.

---

## Current AI Pipeline Architecture

### 1. Frontend → Backend Flow

```
User Input (Chat or Inline AI)
    ↓
Frontend: dawStore.sendMessage() or sendContextualMessage()
    ↓
API: POST /api/assistant/chat or /api/assistant/contextual
    ↓
Backend: AIAgentService.send_message() or send_contextual_message()
    ↓
Two-Stage AI Execution:
    STAGE 1 (Planning): Analyze request + DAW state → Generate plan
    STAGE 2 (Execution): Execute plan with tool calls
    ↓
DAWActionService.execute_action()
    ↓
CompositionStateService.create_track() / add_clip() / etc.
    ↓
Auto-persist to disk
    ↓
Frontend: Reload composition from backend
```

### 2. AI System Prompt Construction

The AI receives:
- **Planning Prompt**: Includes full DAW state, available instruments list, available effects list
- **Execution Prompt**: Minimal prompt focused on executing the plan
- **Tool Definitions**: JSON schema for each action (create_track, create_midi_clip, etc.)

### 3. Instrument List Generation

**Current Implementation** (`agent_service.py:778-795`):
```python
def _build_instruments_list(self) -> str:
    """Build formatted list of available instruments from SYNTHDEF_REGISTRY"""
    from backend.services.daw.synthdef_registry import SYNTHDEF_REGISTRY
    
    categories = {}
    for synth in SYNTHDEF_REGISTRY:
        cat = synth["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(f"  • {synth['name']} - {synth['description']}")
    
    lines = []
    for cat in sorted(categories.keys()):
        lines.append(f"\n{cat.upper()}:")
        lines.extend(sorted(categories[cat]))
    
    return "\n".join(lines)
```

This correctly uses `SYNTHDEF_REGISTRY` which contains **195 instruments** including:
- Basic: sine, saw, square, triangle
- Drums: kick808, kick909, snare808, snare909, hihatClosed808, etc.
- Piano: acousticGrandPiano, brightAcousticPiano, electricPiano1, etc.
- Guitar: acousticGuitarNylon, electricGuitarJazz, etc.
- Brass, Strings, Organ, and many more

---

## THE CRITICAL BUG

### Location: `agent_service.py:1336`

**Tool Definition for `create_track`**:
```python
{
    "name": "create_track",
    "description": "Create a new track. WARNING: You MUST immediately follow this...",
    "input_schema": {
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": "Track name (e.g., 'Kick Drum', 'Bass', 'Pad')"},
            "type": {"type": "string", "enum": ["midi", "audio"], "description": "Track type - use 'midi' for synthesized instruments"},
            "instrument": {"type": "string", "description": "Instrument/synth name for MIDI tracks. Available: sine, saw, square, triangle, kick, snare, hihat. REQUIRED for MIDI tracks to produce sound."}
        },
        "required": ["name", "type", "instrument"]
    }
}
```

**THE PROBLEM**: The `instrument` parameter description hardcodes:
```
"Available: sine, saw, square, triangle, kick, snare, hihat"
```

This is:
1. **Outdated**: Only lists 7 instruments when 195 are available
2. **Incomplete**: Missing all piano, guitar, brass, strings, organ, etc.
3. **Misleading**: AI sees this list in the tool schema and assumes these are the ONLY valid options
4. **Contradictory**: The planning prompt shows all 195 instruments, but the execution tool schema shows only 7

### Why This Causes the Bug

Claude's function calling works in two stages:
1. **Planning Stage**: AI sees full instrument list (195 instruments) ✅
2. **Execution Stage**: AI sees tool schema with only 7 instruments ❌

When executing, Claude may:
- Hallucinate instrument names based on the planning stage
- Use instruments from the planning list that aren't in the tool schema
- Get confused by the contradiction and make up names

---

## Validation Gap

**NO VALIDATION EXISTS** at any layer:

1. ❌ **Tool Schema**: No `enum` constraint on instrument values
2. ❌ **Pydantic Model** (`CreateTrackAction`): `instrument: Optional[str]` - accepts any string
3. ❌ **API Endpoint** (`tracks.py`): No validation before calling service
4. ❌ **Service Layer** (`composition_state_service.py`): Accepts any instrument string
5. ❌ **SuperCollider**: Will fail silently or error when trying to use non-existent SynthDef

**Result**: Invalid instruments flow through the entire system unchecked until playback fails.

---

## Available Instruments (Ground Truth)

**Source**: `backend/services/daw/synthdef_registry.py` + SuperCollider `.scd` files

**Total**: 195 instruments across categories:
- Basic (4): sine, saw, square, triangle
- Synth (5): fm, pad, bass, lead, pluck, bell, organ
- Drums (30+): kick808, kick909, kickAcoustic, snare808, snare909, hihatClosed808, hihatOpen808, etc.
- Piano (8): acousticGrandPiano, brightAcousticPiano, electricGrandPiano, honkyTonkPiano, electricPiano1, electricPiano2, harpsichord, clavinet
- Chromatic Percussion (8): celesta, glockenspiel, musicBox, vibraphone, marimba, xylophone, tubularBells, dulcimer
- Organ (8): drawbarOrgan, percussiveOrgan, rockOrgan, churchOrgan, reedOrgan, accordion, harmonica, bandoneon
- Guitar (8): acousticGuitarNylon, acousticGuitarSteel, electricGuitarJazz, electricGuitarClean, electricGuitarMuted, overdrivenGuitar, distortionGuitar, guitarHarmonics
- Bass (8): acousticBass, electricBassFinger, electricBassPick, fretlessBass, slapBass1, slapBass2, synthBass1, synthBass2
- Strings, Brass, and many more...

---

## Solution Design

### Approach: Multi-Layer Validation + Dynamic Tool Schema

#### Layer 1: Dynamic Tool Schema (AI Constraint)

**Change**: Make `instrument` parameter use `enum` with ALL valid instruments from `SYNTHDEF_REGISTRY`

**Location**: `backend/services/ai/agent_service.py:_get_tool_definitions()`

**Implementation**:
```python
def _get_tool_definitions(self) -> List[Dict[str, Any]]:
    from backend.services.daw.synthdef_registry import SYNTHDEF_REGISTRY

    # Build enum of ALL valid instrument names
    valid_instruments = [synth["name"] for synth in SYNTHDEF_REGISTRY]

    return [
        {
            "name": "create_track",
            "description": "Create a new track. WARNING: You MUST immediately follow this with create_midi_clip...",
            "input_schema": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Track name (e.g., 'Kick Drum', 'Bass', 'Pad')"},
                    "type": {"type": "string", "enum": ["midi", "audio"], "description": "Track type - use 'midi' for synthesized instruments"},
                    "instrument": {
                        "type": "string",
                        "enum": valid_instruments,  # ✅ DYNAMIC ENUM FROM REGISTRY
                        "description": "Instrument/synth name for MIDI tracks. See AVAILABLE INSTRUMENTS section in system prompt for full list with descriptions. REQUIRED for MIDI tracks to produce sound."
                    }
                },
                "required": ["name", "type", "instrument"]
            }
        },
        # ... other tools
    ]
```

**Benefits**:
- Claude's function calling will ONLY allow valid instruments
- No hallucination possible - Claude must pick from the enum
- Automatically stays in sync with `SYNTHDEF_REGISTRY`
- Works for both chat and inline AI

#### Layer 2: Pydantic Validation (API Layer)

**Change**: Add `Literal` enum to `CreateTrackAction` and `CreateTrackRequest`

**Location**: `backend/models/ai_actions.py` and `backend/api/compositions/tracks.py`

**Implementation**:
```python
# In ai_actions.py
from backend.services.daw.synthdef_registry import get_all_synthdefs

# Generate Literal type from registry
VALID_INSTRUMENTS = Literal[tuple(s["name"] for s in get_all_synthdefs())]

class CreateTrackAction(BaseModel):
    action: Literal["create_track"] = "create_track"
    name: str
    type: Literal["midi", "audio", "sample"]
    instrument: Optional[VALID_INSTRUMENTS] = Field(None, description="Instrument/synth name for MIDI tracks")
    color: Optional[str] = Field(None, description="Track color (hex)")
```

**Benefits**:
- FastAPI will reject invalid instruments with 422 Unprocessable Entity
- Automatic API documentation shows valid values
- Type safety in Python code

#### Layer 3: Service Layer Validation (Defense in Depth)

**Change**: Add explicit validation in `composition_state_service.create_track()`

**Location**: `backend/services/daw/composition_state_service.py`

**Implementation**:
```python
def create_track(
    self,
    composition_id: str,
    name: str,
    track_type: str = "sample",
    color: str = "#3b82f6",
    sample_id: Optional[str] = None,
    sample_name: Optional[str] = None,
    sample_file_path: Optional[str] = None,
    instrument: Optional[str] = None
) -> Optional[Track]:
    """Create a new track in a composition"""
    from backend.services.daw.synthdef_registry import get_all_synthdefs

    # Validate instrument if provided
    if instrument:
        valid_instruments = {s["name"] for s in get_all_synthdefs()}
        if instrument not in valid_instruments:
            logger.error(f"❌ Invalid instrument '{instrument}'. Must be one of: {sorted(valid_instruments)}")
            raise ValueError(f"Invalid instrument '{instrument}'. See SYNTHDEF_REGISTRY for valid instruments.")

    # ... rest of implementation
```

**Benefits**:
- Catches any invalid instruments that slip through
- Provides clear error messages
- Protects against direct service calls

#### Layer 4: Frontend Validation (UI Layer)

**Change**: Add instrument picker with autocomplete in track creation UI

**Location**: `frontend/src/modules/sequencer/components/` (future enhancement)

**Benefits**:
- Users can browse available instruments
- Prevents manual typos
- Shows instrument categories and descriptions

---

## Implementation Plan

### Phase 1: Fix AI Tool Schema (CRITICAL - Do First)
1. ✅ Update `_get_tool_definitions()` to use dynamic enum from `SYNTHDEF_REGISTRY`
2. ✅ Update tool description to reference system prompt for full list
3. ✅ Test with chat AI: "add a piano track"
4. ✅ Test with inline AI: long-press track → "change to guitar"

### Phase 2: Add Pydantic Validation (IMPORTANT - Do Second)
1. ✅ Create `VALID_INSTRUMENTS` Literal type from registry
2. ✅ Update `CreateTrackAction` model
3. ✅ Update `CreateTrackRequest` model
4. ✅ Update `UpdateTrackRequest` model (for changing instruments)
5. ✅ Test API endpoint with invalid instrument → expect 422 error

### Phase 3: Add Service Layer Validation (DEFENSE - Do Third)
1. ✅ Add validation in `composition_state_service.create_track()`
2. ✅ Add validation in `composition_state_service.update_track()`
3. ✅ Add helpful error messages with valid instrument list
4. ✅ Test direct service calls

### Phase 4: Frontend Enhancements (OPTIONAL - Do Later)
1. ⏸️ Add instrument picker component
2. ⏸️ Add autocomplete for instrument selection
3. ⏸️ Show instrument categories in UI
4. ⏸️ Add instrument preview/audition feature

---

## Testing Strategy

### Test Cases

#### 1. Chat AI - Valid Instruments
```
User: "add a piano track"
Expected: Creates track with instrument="acousticGrandPiano" (or similar valid piano)
```

#### 2. Chat AI - Previously Broken Instruments
```
User: "add a guitar solo"
Expected: Creates track with instrument="electricGuitarJazz" (or similar valid guitar)
```

#### 3. Inline AI - Track Modification
```
User: Long-press track → "change to bass"
Expected: Updates track with instrument="acousticBass" (or similar valid bass)
```

#### 4. API Direct Call - Invalid Instrument
```
POST /api/compositions/{id}/tracks
Body: {"name": "Test", "type": "midi", "instrument": "invalid_synth"}
Expected: 422 Unprocessable Entity with validation error
```

#### 5. Service Layer - Invalid Instrument
```python
composition_state_service.create_track(
    composition_id="test",
    name="Test",
    track_type="midi",
    instrument="nonexistent"
)
Expected: ValueError with helpful message
```

---

## Files to Modify

### Backend
1. ✅ `backend/services/ai/agent_service.py` - Fix `_get_tool_definitions()`
2. ✅ `backend/models/ai_actions.py` - Add Pydantic validation
3. ✅ `backend/api/compositions/tracks.py` - Add Pydantic validation
4. ✅ `backend/services/daw/composition_state_service.py` - Add service validation

### Frontend (Optional)
5. ⏸️ `frontend/src/components/instruments/InstrumentPicker.tsx` - New component
6. ⏸️ `frontend/src/modules/sequencer/components/Toolbars/SequencerActionToolbar.tsx` - Add picker

---

## Success Criteria

✅ **AI can ONLY select valid instruments** - No hallucination possible
✅ **API rejects invalid instruments** - 422 error with clear message
✅ **Service layer validates** - Defense in depth
✅ **All 195 instruments are available** - Full SuperCollider library accessible
✅ **Chat and inline AI both work** - Consistent behavior
✅ **Error messages are helpful** - Guide users to valid options

---

## Appendix: Instrument Categories

**SYNTHDEF_REGISTRY** contains these categories:
- Basic (4 instruments)
- Synth (6 instruments)
- Drums (30+ instruments)
- Piano (8 instruments)
- Chromatic Percussion (8 instruments)
- Organ (8 instruments)
- Guitar (8 instruments)
- Bass (8 instruments)
- Strings (8 instruments)
- Ensemble (8 instruments)
- Brass (8 instruments)
- Reed, Pipe, Lead, Pad, FX, Ethnic, Percussive, Sound FX (100+ instruments)

**Total: 195 instruments** across all categories, matching General MIDI standard plus extended library.

