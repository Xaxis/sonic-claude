# Piano Roll Architecture - Clean Rebuild

## Why the Previous Implementation Failed

### Problems:
1. **Mixed state management** - Refs, state, and derived values all tangled together
2. **Event listener hell** - useEffect dependencies causing listeners to re-attach during drag
3. **Async timing issues** - Setting flags after async operations, missing events
4. **No clear data flow** - Fighting React instead of working with it
5. **Monolithic component** - Everything in one place, hard to reason about

## New Architecture

### Core Principle
**Local state is ALWAYS the source of truth for rendering**

```
User Interaction → Update Local State → Render → On Complete → Backend Sync
```

### State Management

**Single Source of Truth:**
```typescript
const [localNotes, setLocalNotes] = useState<MIDIEvent[]>([]);
```

**Sync Rule:**
- When `mode === 'IDLE'`: Sync from backend (clip.midi_events)
- When interacting: Local state is independent, backend is ignored
- On interaction complete: Commit local state to backend

### Interaction Modes

Clear, explicit modes instead of scattered flags:

```typescript
type InteractionMode = 
    | { type: 'IDLE' }
    | { type: 'DRAGGING_NOTE'; noteIndex: number; ... }
    | { type: 'RESIZING_NOTE'; noteIndex: number; ... }
    | { type: 'PAINTING_NOTES'; paintedCells: Set<string> };
```

### Event Flow

**1. Click Empty Cell:**
```
Grid mousedown → Add note to localNotes → Start PAINTING mode
→ Mouse move → Add more notes → Mouse up → Commit to backend → IDLE
```

**2. Click Note:**
```
Note click → Delete from localNotes → Commit to backend → Stay IDLE
```

**3. Drag Note:**
```
Note mousedown → Start DRAGGING mode
→ Mouse move → Update localNotes immediately → Render
→ Mouse up → Commit to backend → IDLE
```

**4. Resize Note:**
```
Resize handle mousedown → Start RESIZING mode
→ Mouse move → Update localNotes immediately → Render
→ Mouse up → Commit to backend → IDLE
```

### Key Improvements

**1. Immediate Updates**
```typescript
// Update local state directly - no waiting for backend
setLocalNotes(prev => {
    const updated = [...prev];
    updated[index] = { ...updated[index], start_time: newTime };
    return updated;
});
```

**2. Single Backend Commit**
```typescript
const handleMouseUp = async () => {
    await commitToBackend();  // ONE call per interaction
    setMode({ type: 'IDLE' });
};
```

**3. Stable Event Listeners**
```typescript
// Only re-attach when mode changes, not on every state update
useEffect(() => {
    if (mode.type === 'IDLE') return;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
}, [mode, ...]); // mode changes infrequently
```

**4. No Click/Drag Conflicts**
```typescript
// Click handler only fires in IDLE mode
const handleNoteClick = (e, index) => {
    if (mode.type === 'IDLE') {
        deleteNote(index);
    }
};
```

## Functionality

✅ **Click empty cell** → Add note + preview sound  
✅ **Click note** → Delete note  
✅ **Drag note** → Move note (responsive, immediate)  
✅ **Resize note** → Change duration  
✅ **Click-drag empty cells** → Paint multiple notes  
✅ **All interactions respect snap-to-grid**  
✅ **No duplicate notes after drag**  
✅ **No missed mouse up events**  
✅ **Responsive, immediate UI**  

## What Makes This Better

1. **Clear separation of concerns** - Each mode handles one thing
2. **Predictable state flow** - Always know where data comes from
3. **No race conditions** - Local state updates are synchronous
4. **Simple event handling** - Attach once per interaction, not per update
5. **Easy to debug** - Mode tells you exactly what's happening
6. **Easy to extend** - Add new modes without breaking existing ones

## Future Enhancements

If needed, could extract sub-components:
- `<PianoRollNote>` - Individual note rendering + interaction
- `<PianoRollCanvas>` - Grid rendering
- `<PianoRollKeyboard>` - Piano keys on left

But for now, keeping it simple and working.

