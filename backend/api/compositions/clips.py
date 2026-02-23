"""
Composition Clips Routes - Clip management within compositions

All clip operations are scoped to a specific composition.
Clips are nested resources under compositions.
"""
import logging
from fastapi import APIRouter, Depends

from backend.core.dependencies import (
    get_composition_state_service,
    get_composition_service,
    get_mixer_service,
    get_track_effects_service
)
from backend.core.exceptions import (
    ResourceNotFoundError,
    ServiceError,
)
from backend.services.daw.composition_state_service import CompositionStateService
from backend.services.persistence.composition_service import CompositionService
from backend.services.daw.mixer_service import MixerService
from backend.services.daw.effects_service import TrackEffectsService
from backend.models.sequence import Clip, AddClipRequest, UpdateClipRequest

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# CLIP CRUD OPERATIONS
# ============================================================================

@router.post("/{composition_id}/clips", response_model=Clip)
async def create_clip(
    composition_id: str,
    request: AddClipRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Create a new clip in the composition"""
    try:
        clip = composition_state_service.add_clip(composition_id, request)
        if not clip:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # AUTO-PERSIST: Keep current.json in sync with memory
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        logger.info(f"✅ Created clip in composition {composition_id}")
        return clip

    except Exception as e:
        logger.error(f"❌ Failed to create clip: {e}")
        raise ServiceError(f"Failed to create clip: {str(e)}")


@router.get("/{composition_id}/clips", response_model=list[Clip])
async def get_clips(
    composition_id: str,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service)
):
    """Get all clips in the composition"""
    composition = composition_state_service.get_composition(composition_id)
    if not composition:
        raise ResourceNotFoundError(f"Composition {composition_id} not found")
    return composition.clips


@router.put("/{composition_id}/clips/{clip_id}", response_model=Clip)
async def update_clip(
    composition_id: str,
    clip_id: str,
    request: UpdateClipRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Update clip properties"""
    try:
        clip = composition_state_service.update_clip(composition_id, clip_id, request)
        if not clip:
            raise ResourceNotFoundError(f"Clip {clip_id} not found in composition {composition_id}")

        # AUTO-PERSIST: Keep current.json in sync with memory
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        return clip

    except Exception as e:
        logger.error(f"❌ Failed to update clip: {e}")
        raise ServiceError(f"Failed to update clip: {str(e)}")


@router.delete("/{composition_id}/clips/{clip_id}")
async def delete_clip(
    composition_id: str,
    clip_id: str,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Delete a clip from the composition"""
    try:
        success = composition_state_service.delete_clip(composition_id, clip_id)
        if not success:
            raise ResourceNotFoundError(f"Clip {clip_id} not found in composition {composition_id}")

        # AUTO-PERSIST: Keep current.json in sync with memory
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        logger.info(f"🗑️ Deleted clip {clip_id} from composition {composition_id}")
        return {"status": "success", "message": f"Clip {clip_id} deleted"}

    except Exception as e:
        logger.error(f"❌ Failed to delete clip: {e}")
        raise ServiceError(f"Failed to delete clip: {str(e)}")

