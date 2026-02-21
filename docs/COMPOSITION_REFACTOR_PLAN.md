# 🚀 COMPOSITION-CENTRIC REFACTOR - EXECUTION PLAN

## **CRITICAL INSIGHT**

**Backend models ALREADY capture composition-specific UI state!**
- ✅ `Sequence` model has: zoom, snap_enabled, grid_size, selected_clip_id, piano_roll_clip_id, sample_editor_clip_id
- ✅ `MixerState` model has: show_meters, meter_mode, selected_channel_id
- ✅ `CompositionSnapshot` captures: sequence + mixer_state + track_effects + sample_assignments + chat_history

**The REAL problem:**
- ❌ Frontend contexts don't load UI state from backend models
- ❌ Frontend contexts don't save UI state back to backend
- ❌ No composition-centric UX (no loader/switcher)
- ❌ Mixer/Effects state is global instead of per-composition

---

## **PHASE 1: Backend - Minor Additions** ✅

### **1.1 Add Effects UI State to Backend**
**File**: `backend/models/effects.py`
- Add `EffectsUIState` model with: `selected_effect_id`, `show_effect_browser`
- Add to `CompositionSnapshot`: `effects_ui_state: Optional[EffectsUIState]`

### **1.2 Add Synthesis State to Backend**
**File**: `backend/models/composition_snapshot.py`
- Add `synthesis_state` field to capture active synths and selected synth
- This is composition-specific (which synths are active for this composition)

### **1.3 Update Composition Service**
**File**: `backend/services/persistence/composition_service.py`
- Update `build_snapshot_from_services()` to capture effects UI state and synthesis state
- Update `restore_snapshot_to_services()` to restore effects UI state and synthesis state

---

## **PHASE 2: Frontend - Load Per-Composition State** ✅

### **2.1 Refactor SequencerContext**
**File**: `frontend/src/contexts/SequencerContext.tsx`
- When `setActiveSequenceId()` is called, load sequence from backend
- Extract UI state from sequence model: zoom, snap_enabled, grid_size, selected_clip_id, piano_roll_clip_id
- Update local state with these values
- **This makes UI state per-composition!**

### **2.2 Refactor MixerContext**
**File**: `frontend/src/contexts/MixerContext.tsx`
- Add `loadMixerState(mixerState: MixerState)` method
- Extract UI state from mixer model: show_meters, meter_mode, selected_channel_id
- Called by CompositionContext when composition loads

### **2.3 Refactor EffectsContext**
**File**: `frontend/src/contexts/EffectsContext.tsx`
- Add `loadEffectsState(effectChains: TrackEffectChain[], uiState: EffectsUIState)` method
- Load effect chains AND UI state
- Called by CompositionContext when composition loads

### **2.4 Create SamplesContext**
**File**: `frontend/src/contexts/SamplesContext.tsx`
- Manage sample library (global)
- Manage per-composition sample assignments
- Add `loadSampleAssignments(assignments: Record<string, string>)` method

### **2.5 Refactor CompositionContext - NEW PURPOSE**
**File**: `frontend/src/contexts/CompositionContext.tsx`
- **NEW ROLE**: Composition coordinator and loader
- Watch `activeSequenceId` from SequencerContext
- When it changes, load complete composition from backend
- Coordinate loading across all contexts (Mixer, Effects, Samples, AI)
- Handle save/autosave of complete composition
- Manage composition list

---

## **PHASE 3: Frontend - Composition-Centric UX** ✅

### **3.1 Create Composition Switcher Component**
**File**: `frontend/src/components/CompositionSwitcher.tsx`
- Dropdown showing all compositions
- "Create New" button
- "Load" button
- Shows current composition name
- Goes in global header

### **3.2 Create Composition Loader Dialog**
**File**: `frontend/src/components/CompositionLoader.tsx`
- First-run experience: "Create or Load Composition"
- List of existing compositions with metadata (name, last modified, preview)
- Create new composition form
- Load composition button

### **3.3 Update App.tsx**
**File**: `frontend/src/App.tsx`
- Check if composition is loaded (activeSequenceId !== null)
- Show CompositionLoader if not
- Add CompositionSwitcher to header
- Load last active composition on startup

### **3.4 Update localStorage Persistence**
**File**: `frontend/src/services/state-persistence/state-persistence.service.ts`
- Change `ACTIVE_SEQUENCE_ID` to `ACTIVE_COMPOSITION_ID`
- Store last active composition ID
- Load on app startup

---

## **PHASE 4: Fix Remaining Architecture Issues** ✅

### **4.1 Fix Provider Method Signatures** (222 errors)
- MixerContext: `fader` → `volume`, `mute` → `muted`, `solo` → `soloed`, etc.
- EffectsContext: `getTrackEffects` → `getTrackEffectChain`
- SynthesisContext: Type mismatches

### **4.2 Move AIContext to Global**
- Move from `modules/ai/contexts/` to `src/contexts/`
- Add to provider hierarchy in `main.tsx`

### **4.3 Handle SettingsContext**
- Decide if it should be global or composition-specific
- Mount in provider hierarchy or delete if broken

---

## **PHASE 5: Testing & Verification** ✅

1. Run build - should have 0 errors
2. Test composition create flow
3. Test composition load flow
4. Test composition switch flow (state should change)
5. Test autosave/manual save
6. Test cross-window sync

---

## **KEY ARCHITECTURAL DECISIONS**

### **What's Composition-Specific?**
- ✅ Sequence (tracks, clips, tempo, loop settings, UI state)
- ✅ Mixer state (channels, master, UI state)
- ✅ Effects (track effect chains, UI state)
- ✅ Sample assignments (which samples are used in this composition)
- ✅ Chat history (AI conversations about this composition)
- ✅ Synthesis state (which synths are active, selected synth)

### **What's Global?**
- ✅ Effect definitions (available effects library)
- ✅ Synth definitions (available synths library)
- ✅ Sample library (available samples)
- ✅ Settings (audio device, MIDI device, performance settings)
- ✅ Layout (tabs, panels, window positions) - **DECISION NEEDED**
- ✅ Telemetry (real-time WebSocket data - ephemeral)

### **composition_id = sequence_id**
- They are the SAME identifier (1:1 relationship)
- One composition = one sequence + its complete state
- Backend uses `composition_id` which IS the `sequence_id`

---

## **EXECUTION ORDER**

1. ✅ Phase 1: Backend additions (minor)
2. ✅ Phase 2: Frontend context refactoring (major)
3. ✅ Phase 3: Composition-centric UX (major)
4. ✅ Phase 4: Fix remaining issues
5. ✅ Phase 5: Testing

**Let's go!** 🚀

