---
name: frontend-components
description: >
  Use when creating or modifying React components and panels with Zustand integration.
  Includes no-prop-drilling pattern, SubPanel wrapping, and exact CSS patterns.
  Do NOT use for backend code or API clients.
---

# Frontend Component Development

## Description
Skill for creating React components following Sonic Claude's no-prop-drilling pattern with Zustand store integration.

## Instructions

### When to use this skill
Use this skill when creating new UI panels or components that need to interact with application state.

### Prerequisites
- Understand the feature requirements
- Know which store state is needed
- Identify which actions to call

### Step-by-step process

#### 1. Create Panel Component
```tsx
import { useEffect } from "react";
import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { useDAWStore } from "@/stores/dawStore";

export function FeaturePanel() {
    // Read from store (selector pattern)
    const items = useDAWStore(state => state.items);
    const activeComposition = useDAWStore(state => state.activeComposition);
    
    // Get actions from store
    const loadItems = useDAWStore(state => state.loadItems);
    const createItem = useDAWStore(state => state.createItem);
    
    // Load data on mount
    useEffect(() => {
        if (activeComposition) {
            loadItems();
        }
    }, [activeComposition, loadItems]);
    
    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            <SubPanel title="FEATURE" showHeader={false}>
                {/* Content */}
            </SubPanel>
        </div>
    );
}
```

#### 2. Critical CSS Pattern
**ALWAYS use this exact root div structure:**
```tsx
<div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
```

This ensures:
- `flex h-full flex-1 flex-col` - Full height, flexible, column layout
- `gap-2` - Consistent spacing
- `overflow-hidden` - Prevents scroll issues
- `p-2` - Consistent padding

#### 3. No Prop Drilling Pattern

**❌ WRONG:**
```tsx
// Parent
<FeatureItem item={item} onUpdate={handleUpdate} />

// Child
function FeatureItem({ item, onUpdate }) {
    return <div onClick={() => onUpdate(item.id)}>...</div>
}
```

**✅ CORRECT:**
```tsx
// Parent
<FeatureItem itemId={item.id} />

// Child
function FeatureItem({ itemId }) {
    const item = useDAWStore(state => 
        state.items.find(i => i.id === itemId)
    );
    const updateItem = useDAWStore(state => state.updateItem);
    
    return <div onClick={() => updateItem(itemId, {...})}>...</div>
}
```

#### 4. Performance Optimization

**Use selector pattern:**
```tsx
// ❌ WRONG: Re-renders on ANY store change
const store = useDAWStore();

// ✅ CORRECT: Only re-renders when items change
const items = useDAWStore(state => state.items);

// ✅ CORRECT: Only re-renders when specific item changes
const item = useDAWStore(state => 
    state.items.find(i => i.id === itemId)
);
```

### Critical patterns

**ALWAYS:**
- Read from Zustand store (no props for data)
- Call actions from Zustand store
- Use exact CSS pattern for root div
- Use SubPanel for sections
- Use selector pattern for performance
- Handle loading/error/empty states

**NEVER:**
- Pass data as props (except IDs)
- Pass callbacks as props
- Deviate from CSS pattern
- Access store without selectors

### Checklist
- [ ] Component reads from Zustand store
- [ ] Component calls actions from store
- [ ] Root div uses exact CSS pattern
- [ ] SubPanel wrapping used
- [ ] No prop drilling
- [ ] Selector pattern for performance
- [ ] useEffect for data loading
- [ ] Error states handled
- [ ] Loading states handled
- [ ] Empty states handled

## Examples

See existing implementations:
- `frontend/src/modules/sequencer/SequencerPanel.tsx`
- `frontend/src/modules/mixer/MixerPanel.tsx`

