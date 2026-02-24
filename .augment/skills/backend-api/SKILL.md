---
name: backend-api
description: >
  Use when creating or modifying FastAPI endpoints for composition sub-resources.
  Includes undo/redo, auto-persist, dependency injection, and error handling patterns.
  Do NOT use for SuperCollider OSC handlers or WebSocket endpoints.
---

# Backend API Development

## Description
Skill for creating FastAPI endpoints following Sonic Claude's established patterns for composition-based CRUD operations with undo/redo and auto-persist.

## Instructions

### When to use this skill
Use this skill when creating new API endpoints for composition sub-resources (tracks, clips, scenes, effects, etc.).

### Prerequisites
- Understand the feature requirements
- Know which composition fields are affected
- Identify which services are needed

### Step-by-step process

#### 1. Create Request/Response Models
```python
from pydantic import BaseModel, Field
from typing import Optional

class CreateItemRequest(BaseModel):
    """Request to create an item"""
    name: str = Field(description="Item name")
    value: Optional[str] = Field(default=None, description="Optional value")
```

#### 2. Create Router with Dependency Injection
```python
from fastapi import APIRouter, Depends
import logging

from backend.services.daw.composition_state_service import CompositionStateService
from backend.services.daw.composition_service import CompositionService
from backend.core.dependencies import get_composition_state_service, get_composition_service

router = APIRouter(prefix="/items")
logger = logging.getLogger(__name__)
```

#### 3. Implement CRUD Endpoints

**Pattern for ALL mutations:**
```python
@router.post("/{composition_id}/items")
async def create_item(
    composition_id: str,
    request: CreateItemRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    try:
        # STEP 1: Push undo BEFORE mutation
        composition_state_service.push_undo(composition_id)
        
        # STEP 2: Get composition
        composition = composition_state_service.get_composition(composition_id)
        if not composition:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")
        
        # STEP 3: Execute mutation
        item = execute_mutation(composition, request)
        
        # STEP 4: Auto-persist AFTER mutation
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )
        
        logger.info(f"✅ Created item '{request.name}'")
        return item
        
    except Exception as e:
        logger.error(f"❌ Failed to create item: {e}")
        raise ServiceError(f"Failed to create item: {str(e)}")
```

#### 4. Register Router
```python
# In backend/api/compositions/__init__.py
from . import items

# IMPORTANT: Register BEFORE generic routes
router.include_router(items.router, tags=["compositions-items"])
```

### Critical patterns

**ALWAYS:**
- Push undo BEFORE mutation: `composition_state_service.push_undo(composition_id)`
- Auto-persist AFTER mutation: `composition_service.auto_persist_composition(...)`
- Use dependency injection: `Depends(get_service)`
- Log with emojis: `logger.info(f"✅ Success")` and `logger.error(f"❌ Error")`
- Raise descriptive errors: `raise ServiceError("Clear message")`

**NEVER:**
- Mutate without pushing undo first
- Forget to auto-persist after mutation
- Use hardcoded service instances

### Checklist
- [ ] Request/response models defined with Pydantic
- [ ] Router uses dependency injection
- [ ] push_undo() called BEFORE mutation
- [ ] auto_persist_composition() called AFTER mutation
- [ ] Error handling with try/except
- [ ] Logging with emojis
- [ ] Router registered in __init__.py
- [ ] Specific routes registered before generic routes

## Examples

See existing implementations:
- `backend/api/compositions/clips.py`
- `backend/api/compositions/tracks.py`
- `backend/api/compositions/clip_launcher.py`

