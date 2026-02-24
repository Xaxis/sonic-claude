---
type: always
---

# Sonic Claude Development Rules

## Core Architecture Principles

### 1. Composition-First Design
- **Composition is the PRIMARY entity** - everything revolves around it
- No separate "snapshots" or "projects" - Composition contains all state
- All sub-resources (tracks, clips, effects, scenes) belong to a Composition

### 2. No Prop Drilling
- Components read directly from Zustand store using selectors
- NEVER pass data down as props
- Use `const data = useDAWStore((state) => state.data)` pattern

### 3. Undo/Redo + Auto-Persist Pattern
- **ALWAYS** push undo BEFORE mutation: `composition_state_service.push_undo(composition_id)`
- **ALWAYS** auto-persist AFTER mutation: `composition_service.auto_persist_composition()`
- This applies to ALL backend mutations

### 4. Backend is Source of Truth
- Frontend ALWAYS reloads composition after mutations
- Never update local state directly - always reload from backend
- Use `await loadComposition(compositionId)` after mutations

## Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Models**: Pydantic for request/response validation
- **Services**: Dependency injection with `Depends()`
- **Audio Engine**: SuperCollider (scsynth + sclang)

### Frontend
- **Framework**: React + TypeScript
- **State Management**: Zustand (no Redux, no Context API)
- **Queries**: TanStack Query for data fetching
- **Build Tool**: Vite
- **Styling**: Tailwind CSS

### Real-time Communication
- **WebSocket**: Audio data streams (60Hz from SuperCollider)
- **REST API**: CRUD operations for compositions and sub-resources
- **OSC**: SuperCollider ↔ Python communication

## Data Flow

```
SuperCollider (scsynth)
    ↓ OSC
Python Realtime Analyzer
    ↓ WebSocket
Frontend Hooks (useAudioData)
    ↓
Zustand Store
    ↓
React Components
```

## Critical Patterns

### Panel Root Div Pattern
ALL panels must use this EXACT CSS pattern:
```tsx
<div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
  <SubPanel>
    {/* content */}
  </SubPanel>
</div>
```

### Zustand Selector Pattern
```typescript
// ✅ CORRECT - Selector for performance
const tracks = useDAWStore((state) => state.composition?.tracks ?? []);

// ❌ WRONG - No prop drilling
<TrackList tracks={tracks} />
```

### Backend Mutation Pattern
```python
# 1. Push undo BEFORE mutation
composition_state_service.push_undo(composition_id)

# 2. Perform mutation
composition.tracks.append(new_track)

# 3. Auto-persist AFTER mutation
composition_service.auto_persist_composition()

# 4. Return updated composition
return composition
```

## File Organization

### Backend
```
backend/
├── api/                    # FastAPI routers
│   └── compositions/       # Composition endpoints
├── models/                 # Pydantic models
├── services/               # Business logic
└── supercollider/          # SC integration
```

### Frontend
```
frontend/src/
├── modules/                # Feature modules
│   └── feature-name/
│       ├── FeaturePanel.tsx
│       ├── components/
│       └── hooks/
├── stores/                 # Zustand stores
├── services/api/           # API clients
└── hooks/                  # Shared hooks
```

## Never Do This

- ❌ Create new patterns without documenting them
- ❌ Use prop drilling for state
- ❌ Mutate backend state without undo/redo
- ❌ Update frontend state without reloading from backend
- ❌ Create excessive documentation files
- ❌ Deviate from established CSS patterns
- ❌ Use Redux, Context API, or other state management
- ❌ Manually edit package.json - use package managers

## Always Do This

- ✅ Follow existing patterns exactly
- ✅ Use Zustand for ALL state management
- ✅ Push undo before mutations, auto-persist after
- ✅ Reload composition after mutations
- ✅ Use exact CSS pattern for panel root divs
- ✅ Use dependency injection in backend
- ✅ Use package managers (npm, pip) for dependencies

