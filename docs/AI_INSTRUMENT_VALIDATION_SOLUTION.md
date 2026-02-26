# AI Instrument Validation - Proposed Solution

## Problem Statement

The AI assistant (both chat and inline) is selecting instrument values for tracks that **do not exist** in the SuperCollider SynthDef registry. This causes tracks to be created with invalid instruments that cannot produce sound.

**Example Failures**:
- User: "add a piano track" → AI creates track with `instrument="piano"` (doesn't exist)
- User: "add a guitar solo" → AI creates track with `instrument="guitar"` (doesn't exist)
- Valid instruments: `acousticGrandPiano`, `electricGuitarJazz`, etc.

---

## Root Cause

**Location**: `backend/services/ai/agent_service.py:1336`

The `create_track` tool definition hardcodes an **outdated list of 7 instruments**:

```python
"instrument": {
    "type": "string",
    "description": "Instrument/synth name for MIDI tracks. Available: sine, saw, square, triangle, kick, snare, hihat. REQUIRED for MIDI tracks to produce sound."
}
```

**Reality**: The system has **195 instruments** in `SYNTHDEF_REGISTRY`:
- Piano: acousticGrandPiano, brightAcousticPiano, electricPiano1, etc.
- Guitar: acousticGuitarNylon, electricGuitarJazz, overdrivenGuitar, etc.
- Drums: kick808, kick909, snare808, hihatClosed808, etc.
- Brass, Strings, Organ, Bass, and 100+ more

**The Contradiction**:
1. Planning stage shows AI all 195 instruments ✅
2. Execution stage (tool schema) shows only 7 instruments ❌
3. AI gets confused and hallucinates instrument names ❌

---

## Proposed Solution: Multi-Layer Validation

### Layer 1: Fix AI Tool Schema (CRITICAL)

**Change**: Use dynamic `enum` from `SYNTHDEF_REGISTRY` instead of hardcoded description

**File**: `backend/services/ai/agent_service.py`

**Before**:
```python
"instrument": {
    "type": "string",
    "description": "Available: sine, saw, square, triangle, kick, snare, hihat"
}
```

**After**:
```python
def _get_tool_definitions(self) -> List[Dict[str, Any]]:
    from backend.services.daw.synthdef_registry import SYNTHDEF_REGISTRY
    
    # Build enum of ALL valid instrument names
    valid_instruments = [synth["name"] for synth in SYNTHDEF_REGISTRY]
    
    return [
        {
            "name": "create_track",
            "input_schema": {
                "properties": {
                    "instrument": {
                        "type": "string",
                        "enum": valid_instruments,  # ✅ 195 instruments
                        "description": "Instrument/synth name. See AVAILABLE INSTRUMENTS in system prompt for descriptions."
                    }
                }
            }
        }
    ]
```

**Impact**: Claude's function calling will **ONLY** allow valid instruments. No hallucination possible.

---

### Layer 2: Add Pydantic Validation (IMPORTANT)

**Change**: Add `Literal` enum to Pydantic models

**Files**: 
- `backend/models/ai_actions.py`
- `backend/api/compositions/tracks.py`

**Implementation**:
```python
from typing import Literal, get_args
from backend.services.daw.synthdef_registry import get_all_synthdefs

# Generate Literal type from registry
_VALID_INSTRUMENTS = tuple(s["name"] for s in get_all_synthdefs())
ValidInstrument = Literal[_VALID_INSTRUMENTS]

class CreateTrackAction(BaseModel):
    action: Literal["create_track"] = "create_track"
    name: str
    type: Literal["midi", "audio", "sample"]
    instrument: Optional[ValidInstrument] = None  # ✅ Type-safe
```

**Impact**: FastAPI will reject invalid instruments with 422 error. API docs will show valid values.

---

### Layer 3: Service Layer Validation (DEFENSE)

**Change**: Add explicit validation in service methods

**File**: `backend/services/daw/composition_state_service.py`

**Implementation**:
```python
def create_track(
    self,
    composition_id: str,
    name: str,
    instrument: Optional[str] = None,
    # ... other params
) -> Optional[Track]:
    from backend.services.daw.synthdef_registry import get_all_synthdefs
    
    # Validate instrument if provided
    if instrument:
        valid_instruments = {s["name"] for s in get_all_synthdefs()}
        if instrument not in valid_instruments:
            logger.error(f"❌ Invalid instrument '{instrument}'")
            raise ValueError(
                f"Invalid instrument '{instrument}'. "
                f"Valid instruments: {sorted(valid_instruments)}"
            )
    
    # ... rest of implementation
```

**Impact**: Catches any invalid instruments that slip through. Provides clear error messages.

---

## Implementation Steps

### Step 1: Fix AI Tool Schema ⚡ CRITICAL
1. Update `_get_tool_definitions()` in `agent_service.py`
2. Use dynamic enum from `SYNTHDEF_REGISTRY`
3. Update description to reference system prompt
4. Test: "add a piano track" should work

### Step 2: Add Pydantic Validation 🛡️ IMPORTANT
1. Create `ValidInstrument` Literal type
2. Update `CreateTrackAction` model
3. Update `CreateTrackRequest` model
4. Update `UpdateTrackRequest` model
5. Test: API should reject invalid instruments

### Step 3: Add Service Validation 🔒 DEFENSE
1. Add validation in `create_track()`
2. Add validation in `update_track()`
3. Add helpful error messages
4. Test: Direct service calls should fail gracefully

---

## Testing Plan

### Test Case 1: Chat AI - Piano
```
Input: "add a piano track"
Expected: Track created with valid piano instrument (e.g., acousticGrandPiano)
Current: Fails with invalid instrument
```

### Test Case 2: Chat AI - Guitar
```
Input: "add a guitar solo"
Expected: Track created with valid guitar instrument (e.g., electricGuitarJazz)
Current: Fails with invalid instrument
```

### Test Case 3: Inline AI - Bass
```
Input: Long-press track → "change to bass"
Expected: Track updated with valid bass instrument (e.g., acousticBass)
Current: Fails with invalid instrument
```

### Test Case 4: API Validation
```
POST /api/compositions/{id}/tracks
Body: {"name": "Test", "type": "midi", "instrument": "invalid"}
Expected: 422 Unprocessable Entity
Current: Accepts invalid instrument
```

---

## Success Criteria

✅ AI can ONLY select from 195 valid instruments
✅ No hallucination or invalid instrument names possible
✅ API rejects invalid instruments with clear errors
✅ Service layer validates as defense in depth
✅ Both chat and inline AI work correctly
✅ All instrument categories accessible (Piano, Guitar, Brass, Strings, etc.)

---

## Files to Modify

1. ✅ `backend/services/ai/agent_service.py` - Fix tool definitions
2. ✅ `backend/models/ai_actions.py` - Add Pydantic validation
3. ✅ `backend/api/compositions/tracks.py` - Add Pydantic validation
4. ✅ `backend/services/daw/composition_state_service.py` - Add service validation

---

## Timeline

- **Phase 1** (Critical): 30 minutes - Fix AI tool schema
- **Phase 2** (Important): 30 minutes - Add Pydantic validation
- **Phase 3** (Defense): 20 minutes - Add service validation
- **Testing**: 20 minutes - Verify all test cases

**Total**: ~2 hours to complete solution

---

## Next Steps

1. Review and approve this solution
2. Implement Phase 1 (AI tool schema fix)
3. Test with real AI requests
4. Implement Phases 2 & 3 (validation layers)
5. Comprehensive testing
6. Deploy and monitor

**Ready to proceed with implementation?**
