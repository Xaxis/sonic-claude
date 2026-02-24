---
name: zustand-actions
description: >
  Use when adding or modifying actions in the Zustand DAW store.
  Includes error handling, toast notifications, composition reloading, and API integration.
  Do NOT use for React components or backend code.
---

# Zustand Store Actions

## Description
Skill for adding actions to the Zustand store with proper error handling, toast notifications, and composition reloading.

## Instructions

### When to use this skill
Use this skill when adding new actions to the DAW store that interact with the backend API.

### Prerequisites
- Backend API endpoints exist
- Frontend API client methods exist
- Data models are defined in store

### Step-by-step process

#### 1. Add Action to Store Interface
```typescript
export interface DAWStore {
    // State
    items: Item[];
    
    // Actions
    loadItems: () => Promise<void>;
    createItem: (name: string, value?: string) => Promise<void>;
    updateItem: (itemId: string, updates: Partial<Item>) => Promise<void>;
    deleteItem: (itemId: string) => Promise<void>;
}
```

#### 2. Add Initial State
```typescript
export const useDAWStore = create<DAWStore>()(
    persist(
        (set, get) => ({
            // State
            items: [],
            
            // Actions below...
```

#### 3. Implement Actions

**READ (GET):**
```typescript
loadItems: async () => {
    try {
        const { activeComposition } = get();
        if (!activeComposition) return;
        
        const response = await api.compositions.getItems(activeComposition.id);
        set({ items: response.items });
    } catch (error) {
        console.error("Failed to load items:", error);
        toast.error("Failed to load items");
    }
},
```

**CREATE (POST):**
```typescript
createItem: async (name, value) => {
    try {
        const { activeComposition } = get();
        if (!activeComposition) return;
        
        await api.compositions.createItem({
            composition_id: activeComposition.id,
            name,
            value,
        });
        
        // ALWAYS reload composition after mutation
        await get().loadComposition(activeComposition.id);
        toast.success(`Item "${name}" created`);
    } catch (error) {
        console.error("Failed to create item:", error);
        toast.error("Failed to create item");
    }
},
```

**UPDATE (PUT/PATCH):**
```typescript
updateItem: async (itemId, updates) => {
    try {
        const { activeComposition } = get();
        if (!activeComposition) return;
        
        await api.compositions.updateItem(
            activeComposition.id,
            itemId,
            updates
        );
        
        // ALWAYS reload composition after mutation
        await get().loadComposition(activeComposition.id);
    } catch (error) {
        console.error("Failed to update item:", error);
        toast.error("Failed to update item");
    }
},
```

**DELETE:**
```typescript
deleteItem: async (itemId) => {
    try {
        const { activeComposition } = get();
        if (!activeComposition) return;
        
        await api.compositions.deleteItem(activeComposition.id, itemId);
        
        // ALWAYS reload composition after mutation
        await get().loadComposition(activeComposition.id);
        toast.success("Item deleted");
    } catch (error) {
        console.error("Failed to delete item:", error);
        toast.error("Failed to delete item");
    }
},
```

### Critical patterns

**ALWAYS:**
- Reload composition after mutations: `await get().loadComposition(activeComposition.id)`
- Check activeComposition exists: `if (!activeComposition) return;`
- Wrap in try/catch
- Log to console: `console.error("Failed to...", error)`
- Show toast notifications
- Use success toast for CREATE/DELETE
- Use error toast for ALL errors

**NEVER:**
- Mutate state directly without reloading
- Forget error handling
- Skip toast notifications
- Throw errors (let user continue working)

### Toast Guidelines

**Success toasts:**
- CREATE: `toast.success("Item created")`
- DELETE: `toast.success("Item deleted")`

**Error toasts:**
- ALL errors: `toast.error("Failed to...")`

**No toast:**
- READ operations
- UPDATE operations (unless significant)

### Checklist
- [ ] Action added to DAWStore interface
- [ ] Action implemented in create() function
- [ ] API client method called
- [ ] activeComposition checked before API call
- [ ] loadComposition() called after mutation
- [ ] Error handling with try/catch
- [ ] Console logging for debugging
- [ ] Toast notifications for user feedback
- [ ] Success toast for CREATE/DELETE
- [ ] Error toast for all errors

## Examples

See existing implementations in `frontend/src/stores/dawStore.ts`:
- `createTrack`
- `createClip`
- `createScene`

