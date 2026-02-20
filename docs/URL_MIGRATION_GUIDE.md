# URL Migration Guide

## Backend URL Changes

### Old Pattern → New Pattern

| Old URL | New URL | Status |
|---------|---------|--------|
| `/audio-engine/audio/synthesis/*` | `/api/audio/synthesis/*` | ✅ Updated |
| `/audio-engine/audio/input/*` | `/api/audio/input/*` | ✅ Updated |
| `/audio-engine/audio/sequencer/*` | `/api/sequencer/*` | ✅ Updated |
| `/audio-engine/audio/mixer/*` | `/api/mixer/*` | ✅ Updated |
| `/audio-engine/audio/effects/*` | `/api/effects/*` | ✅ Updated |
| `/audio-engine/ws/*` | `/api/ws/*` | ✅ Updated |
| `/api/samples/*` | `/api/samples/*` | ✅ No change |
| `/api/compositions/*` | `/api/compositions/*` | ✅ No change |
| `/api/ai/*` | `/api/ai/*` | ✅ No change |

## Frontend Files to Update

### 1. audio-engine.service.ts
**File:** `frontend/src/services/audio-engine/audio-engine.service.ts`

**Changes needed:**
- Replace `/audio-engine/audio/sequencer/` → `/api/sequencer/`
- Replace `/audio-engine/audio/synthesis/` → `/api/audio/synthesis/`
- Replace `/audio-engine/audio/mixer/` → `/api/mixer/`
- Replace `/audio-engine/audio/effects/` → `/api/effects/`

**Estimated endpoints:** ~50 endpoints

### 2. mixer.service.ts
**File:** `frontend/src/services/mixer/mixer.service.ts`

**Changes needed:**
- Replace `BASE_URL = "http://localhost:8000/audio-engine/audio/mixer"` 
- With `BASE_URL = "http://localhost:8000/api/mixer"`

**Estimated endpoints:** ~15 endpoints

### 3. sequencer.service.ts
**File:** `frontend/src/services/sequencer/sequencer.service.ts`

**Changes needed:**
- Replace `/audio-engine/audio/sequencer/` → `/api/sequencer/`

**Estimated endpoints:** ~20 endpoints

### 4. WebSocket connections
**File:** `frontend/src/contexts/AudioEngineContext.tsx`

**Changes needed:**
- Replace `ws://localhost:8000/audio-engine/ws/` → `ws://localhost:8000/api/ws/`

**Endpoints:**
- `/spectrum`
- `/waveform`
- `/meters`
- `/transport`

### 5. ai.service.ts
**File:** `frontend/src/services/ai/ai.service.ts`

**Status:** ✅ Already uses `/api/ai/*` - no changes needed

### 6. samples.service.ts
**File:** `frontend/src/services/samples/samples.service.ts`

**Status:** ✅ Already uses `/api/samples/*` - no changes needed

### 7. compositions.service.ts
**File:** `frontend/src/services/compositions/compositions.service.ts`

**Status:** ✅ Already uses `/api/compositions/*` - no changes needed

## Implementation Strategy

### Option A: Big Bang (Recommended for small team)
1. Update all backend routes at once
2. Update all frontend services at once
3. Test everything
4. Deploy together

**Pros:** Clean, no technical debt
**Cons:** Risky, everything breaks until complete

### Option B: Gradual Migration (Safer)
1. Add new routes alongside old routes
2. Update frontend service by service
3. Remove old routes once frontend migrated
4. Deploy incrementally

**Pros:** Safer, can rollback
**Cons:** Temporary code duplication

## We're doing Option A (Big Bang)

Since this is a refactoring effort and we want clean architecture, we'll do it all at once.

## Testing Checklist

After migration, verify:
- [ ] Sequencer playback works
- [ ] Mixer controls work
- [ ] Effects can be added/removed
- [ ] AI chat works
- [ ] Samples can be uploaded
- [ ] Compositions can be saved/loaded
- [ ] WebSocket streams work (waveform, spectrum, meters, transport)
- [ ] All frontend pages load without errors
- [ ] No console errors

## Rollback Plan

If something breaks:
1. Revert `backend/main.py` router changes
2. Revert frontend service changes
3. Restart backend
4. Hard refresh frontend (Ctrl+Shift+R)

