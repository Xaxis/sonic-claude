---
name: frontend-module
description: >
  Use when creating a new frontend module (feature) following the established module pattern.
  Includes directory structure, barrel exports, panel component pattern, and types organization.
  Do NOT use for single components or backend code.
---

# Frontend Module Pattern

## Description
Skill for creating complete frontend modules following Sonic Claude's established module architecture pattern.

## When to Use
- Creating a new feature module (e.g., clip-launcher, transport, etc.)
- Need to scaffold a complete module with proper structure
- Building a panel with sub-components and types

## Module Directory Structure

```
frontend/src/modules/feature-name/
├── FeaturePanel.tsx          # Main panel component (PascalCase)
├── components/               # Sub-components organized by category
│   ├── Toolbars/            # Toolbar components
│   ├── Layouts/             # Layout components
│   ├── Channel/             # Channel/strip components
│   └── States/              # Empty states, loading states
├── hooks/                    # Module-specific hooks (optional)
│   └── useFeature.ts
├── index.ts                  # Barrel export
└── types.ts                  # TypeScript types
```

## Step-by-Step Process

### 1. Create Module Directory
```bash
mkdir -p frontend/src/modules/feature-name/components/{Toolbars,Layouts,Channel,States}
mkdir -p frontend/src/modules/feature-name/hooks
```

### 2. Create Main Panel Component (FeaturePanel.tsx)

**CRITICAL: Use EXACT panel root div pattern:**

```tsx
/**
 * Feature Panel
 *
 * Description of what this panel does.
 */

import { useEffect } from "react";
import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { useDAWStore } from "@/stores/dawStore";

export function FeaturePanel() {
    // Read from store (selector pattern - NO PROP DRILLING)
    const items = useDAWStore(state => state.items);
    const activeComposition = useDAWStore(state => state.activeComposition);
    
    // Get actions from store
    const loadItems = useDAWStore(state => state.loadItems);
    
    // Load data on mount
    useEffect(() => {
        if (activeComposition) {
            loadItems();
        }
    }, [activeComposition, loadItems]);
    
    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            <SubPanel title="FEATURE" showHeader={false}>
                {/* content */}
            </SubPanel>
        </div>
    );
}
```

**CRITICAL CSS PATTERN:**
- Root div: `className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2"`
- This is MANDATORY for all panels
- Ensures proper layout and overflow handling

### 3. Create Barrel Export (index.ts)

```typescript
export { FeaturePanel } from "./FeaturePanel.tsx";
export * from "./types.ts";
```

### 4. Create Types File (types.ts)

```typescript
/**
 * Feature Module Types
 *
 * Type definitions for the feature module.
 */

export interface FeatureItem {
    id: string;
    name: string;
    // ... other fields
}

export interface CreateFeatureRequest {
    name: string;
    // ... other fields
}
```

### 5. Create Sub-Components

**Pattern for sub-components:**
- Read from store directly (NO PROP DRILLING)
- Call store actions directly
- Only pass refs or callbacks if absolutely necessary

```tsx
// components/Toolbars/FeatureToolbar.tsx
import { useDAWStore } from "@/stores/dawStore";

export function FeatureToolbar() {
    const items = useDAWStore(state => state.items);
    const createItem = useDAWStore(state => state.createItem);
    
    return (
        <div className="flex items-center gap-2">
            {/* toolbar content */}
        </div>
    );
}
```

## Common Patterns

### Empty State Pattern
```tsx
// components/States/FeatureEmptyState.tsx
export function FeatureEmptyState() {
    return (
        <div className="flex flex-1 items-center justify-center">
            <div className="text-center space-y-3 max-w-sm">
                <div className="text-6xl opacity-20">🎵</div>
                <p className="text-base font-bold text-foreground">No Items</p>
                <p className="text-sm text-muted-foreground">
                    Create your first item to get started
                </p>
            </div>
        </div>
    );
}
```

### Layout Pattern
```tsx
// components/Layouts/FeatureLayout.tsx
import { useDAWStore } from "@/stores/dawStore";

export function FeatureLayout() {
    const items = useDAWStore(state => state.items);
    
    return (
        <div className="flex h-full gap-4 overflow-x-auto">
            {items.map(item => (
                <FeatureItem key={item.id} itemId={item.id} />
            ))}
        </div>
    );
}
```

## Checklist

- [ ] Created module directory with proper structure
- [ ] Main panel uses EXACT root div CSS pattern
- [ ] All components read from store (no prop drilling)
- [ ] Barrel export in index.ts
- [ ] Types defined in types.ts
- [ ] Sub-components organized by category (Toolbars, Layouts, etc.)
- [ ] Empty state component if needed
- [ ] Module registered in layout.config.ts if it's a panel

