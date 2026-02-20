# Frontend State Management Architecture

## Overview

The frontend now has a **unified, centralized state persistence system** that replaces scattered localStorage usage with a cohesive architecture.

---

## Problems Fixed

### ❌ **Before: Scattered Disaster**

1. **NO PERSISTENCE OF ACTIVE SEQUENCE**
   - `activeSequenceId` just picked first sequence on load
   - No localStorage for last active sequence
   - No sync between frontend and backend

2. **SCATTERED localStorage USAGE**
   - `STORAGE_KEYS.LAYOUT` - Layout state
   - `STORAGE_KEY` - Settings (different constant!)
   - `'sequencer-split-ratio'` - Hardcoded string (WTF!)
   - Multiple sources of truth

3. **SEQUENCE UI SETTINGS SAVED TO BACKEND**
   - Zoom, snap, grid, loop saved to backend
   - But `activeSequenceId` NOT saved anywhere

4. **MULTIPLE SOURCES OF TRUTH**
   - AudioEngineContext has `activeSequenceId`
   - Backend has `current_sequence_id`
   - They don't sync on load

---

## ✅ **After: Unified System**

### **1. Centralized State Persistence Service**

**File:** `frontend/src/services/state-persistence/state-persistence.service.ts`

**Features:**
- All localStorage keys defined in ONE place
- Type-safe get/set methods
- Automatic JSON serialization
- Validation and error handling
- Clear separation of concerns

**Storage Keys:**
```typescript
export const STORAGE_KEYS = {
    // Layout & UI
    LAYOUT: "sonic-claude-layout-v2",
    WINDOW_STATE: "sonic-claude-window-state",
    
    // Sequencer
    ACTIVE_SEQUENCE_ID: "sonic-claude-active-sequence",
    SEQUENCER_SPLIT_RATIO: "sonic-claude-sequencer-split",
    
    // Settings
    SETTINGS: "sonic-claude-settings",
    
    // Session
    LAST_SESSION: "sonic-claude-last-session",
} as const;
```

**API:**
```typescript
// Active Sequence
statePersistence.getActiveSequenceId(): string | null
statePersistence.setActiveSequenceId(sequenceId: string | null): void

// Sequencer UI
statePersistence.getSequencerSplitRatio(): number
statePersistence.setSequencerSplitRatio(ratio: number): void

// Layout
statePersistence.getLayout<T>(): T | null
statePersistence.setLayout<T>(layout: T): void

// Settings
statePersistence.getSettings<T>(): T | null
statePersistence.setSettings<T>(settings: T): void

// Session
statePersistence.getLastSession(): SessionState | null
statePersistence.saveSession(session: SessionState): void

// Utility
statePersistence.clearAll(): void
```

---

### **2. AudioEngineContext Integration**

**File:** `frontend/src/contexts/AudioEngineContext.tsx`

**Changes:**
1. **On app load** - Restore last active sequence:
   ```typescript
   const lastActiveId = statePersistence.getActiveSequenceId();
   const activeId = sequences.find(s => s.id === lastActiveId) 
       ? lastActiveId 
       : sequences[0].id;
   ```

2. **On sequence change** - Save to localStorage:
   ```typescript
   const setActiveSequenceId = useCallback((sequenceId: string | null) => {
       setState((prev) => ({ ...prev, activeSequenceId: sequenceId }));
       broadcastUpdate("audioEngine.activeSequenceId", sequenceId);
       statePersistence.setActiveSequenceId(sequenceId);
   }, [broadcastUpdate]);
   ```

3. **Effect to persist changes**:
   ```typescript
   useEffect(() => {
       if (state.activeSequenceId) {
           statePersistence.setActiveSequenceId(state.activeSequenceId);
       }
   }, [state.activeSequenceId]);
   ```

---

### **3. SequencerSplitLayout Migration**

**File:** `frontend/src/modules/sequencer/layouts/SequencerSplitLayout.tsx`

**Before:**
```typescript
const [timelineHeightPercent, setTimelineHeightPercent] = useState(() => {
    const saved = localStorage.getItem('sequencer-split-ratio');
    return saved ? parseFloat(saved) : 50;
});

useEffect(() => {
    localStorage.setItem('sequencer-split-ratio', timelineHeightPercent.toString());
}, [timelineHeightPercent]);
```

**After:**
```typescript
const [timelineHeightPercent, setTimelineHeightPercent] = useState(() => {
    return statePersistence.getSequencerSplitRatio();
});

useEffect(() => {
    statePersistence.setSequencerSplitRatio(timelineHeightPercent);
}, [timelineHeightPercent]);
```

---

### **4. LayoutContext Migration**

**File:** `frontend/src/contexts/LayoutContext.tsx`

**Before:**
```typescript
const stored = localStorage.getItem(STORAGE_KEYS.LAYOUT);
localStorage.setItem(STORAGE_KEYS.LAYOUT, JSON.stringify(toStore));
```

**After:**
```typescript
const stored = statePersistence.getLayout<any>();
statePersistence.setLayout(toStore);
```

---

### **5. SettingsContext Migration**

**File:** `frontend/src/contexts/SettingsContext.tsx`

**Before:**
```typescript
const stored = localStorage.getItem(STORAGE_KEY);
localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
```

**After:**
```typescript
const stored = statePersistence.getSettings<Settings>();
statePersistence.setSettings(settings);
```

---

## Architecture Flow

```
App Load
    ↓
Load All Compositions from Backend
    ↓
Restore Last Active Sequence from localStorage
    ↓
Set activeSequenceId in AudioEngineContext
    ↓
✅ User sees their last active sequence!

User Changes Sequence
    ↓
setActiveSequenceId() called
    ↓
Save to localStorage via statePersistence
    ↓
✅ Persisted for next app load!
```

---

## Benefits

1. **✅ SINGLE SOURCE OF TRUTH** - All localStorage keys in one place
2. **✅ TYPE SAFETY** - Generic get/set methods with TypeScript
3. **✅ CONSISTENCY** - Same pattern everywhere
4. **✅ MAINTAINABILITY** - Easy to add new persisted state
5. **✅ DEBUGGING** - `clearAll()` method for testing
6. **✅ ACTIVE SEQUENCE PERSISTENCE** - Finally works!

---

## Files Changed

1. `frontend/src/services/state-persistence/state-persistence.service.ts` - **NEW**
2. `frontend/src/contexts/AudioEngineContext.tsx` - Integrated service
3. `frontend/src/modules/sequencer/layouts/SequencerSplitLayout.tsx` - Migrated
4. `frontend/src/contexts/LayoutContext.tsx` - Migrated
5. `frontend/src/contexts/SettingsContext.tsx` - Migrated

