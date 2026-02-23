"""
Composition Tracks Routes - Track management within compositions

All track operations are scoped to a specific composition.
Tracks are nested resources under compositions.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

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
from backend.models.sequence import Track

router = APIRouter()
logger = logging.getLogger(__name__)


class CreateTrackRequest(BaseModel):
    """Request to create a track in a composition"""
    name: str
    type: Optional[str] = "sample"  # "midi", "audio", or "sample"
    color: Optional[str] = "#3b82f6"
    sample_id: Optional[str] = None  # For sample-based tracks
    sample_name: Optional[str] = None  # Cached sample name
    sample_file_path: Optional[str] = None  # Cached file path
    instrument: Optional[str] = None  # For MIDI tracks


class UpdateTrackRequest(BaseModel):
    """Request to update track properties"""
    name: Optional[str] = None
    volume: Optional[float] = Field(None, ge=0.0, le=2.0)
    pan: Optional[float] = Field(None, ge=-1.0, le=1.0)
    instrument: Optional[str] = None


class UpdateTrackMuteRequest(BaseModel):
    """Request to update track mute"""
    is_muted: bool


class UpdateTrackSoloRequest(BaseModel):
    """Request to update track solo"""
    is_solo: bool


# ============================================================================
# TRACK CRUD OPERATIONS
# ============================================================================

@router.post("/{composition_id}/tracks", response_model=Track)
async def create_track(
    composition_id: str,
    request: CreateTrackRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """
    Create a new track in the composition

    This automatically persists the composition to disk after creation.
    """
    try:
        track = composition_state_service.create_track(
            composition_id=composition_id,
            name=request.name,
            track_type=request.type,
            color=request.color,
            sample_id=request.sample_id,
            sample_name=request.sample_name,
            sample_file_path=request.sample_file_path,
            instrument=request.instrument
        )

        if not track:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # AUTO-PERSIST: Keep current.json in sync with memory
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        logger.info(f"✅ Created track '{request.name}' in composition {composition_id}")
        return track

    except Exception as e:
        logger.error(f"❌ Failed to create track: {e}")
        raise ServiceError(f"Failed to create track: {str(e)}")


@router.get("/{composition_id}/tracks", response_model=list[Track])
async def get_tracks(
    composition_id: str,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service)
):
    """Get all tracks in the composition"""
    composition = composition_state_service.get_composition(composition_id)
    if not composition:
        raise ResourceNotFoundError(f"Composition {composition_id} not found")
    return composition.tracks


@router.put("/{composition_id}/tracks/{track_id}", response_model=Track)
async def update_track(
    composition_id: str,
    track_id: str,
    request: UpdateTrackRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Update track properties"""
    try:
        track = composition_state_service.update_track(
            composition_id=composition_id,
            track_id=track_id,
            name=request.name,
            volume=request.volume,
            pan=request.pan,
            instrument=request.instrument
        )

        if not track:
            raise ResourceNotFoundError(f"Track {track_id} not found in composition {composition_id}")

        # AUTO-PERSIST: Keep current.json in sync with memory
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        return track

    except Exception as e:
        logger.error(f"❌ Failed to update track: {e}")
        raise ServiceError(f"Failed to update track: {str(e)}")


@router.delete("/{composition_id}/tracks/{track_id}")
async def delete_track(
    composition_id: str,
    track_id: str,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Delete a track from the composition"""
    try:
        success = composition_state_service.delete_track(composition_id, track_id)
        if not success:
            raise ResourceNotFoundError(f"Track {track_id} not found in composition {composition_id}")

        # AUTO-PERSIST: Keep current.json in sync with memory
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        logger.info(f"🗑️ Deleted track {track_id} from composition {composition_id}")
        return {"status": "success", "message": f"Track {track_id} deleted"}

    except Exception as e:
        logger.error(f"❌ Failed to delete track: {e}")
        raise ServiceError(f"Failed to delete track: {str(e)}")


# ============================================================================
# TRACK STATE OPERATIONS
# ============================================================================

@router.put("/{composition_id}/tracks/{track_id}/mute")
async def update_track_mute(
    composition_id: str,
    track_id: str,
    request: UpdateTrackMuteRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Update track mute state"""
    try:
        success = composition_state_service.set_track_mute(composition_id, track_id, request.is_muted)
        if not success:
            raise ResourceNotFoundError(f"Track {track_id} not found in composition {composition_id}")

        # AUTO-PERSIST: Keep current.json in sync with memory
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        return {"status": "success", "is_muted": request.is_muted}

    except Exception as e:
        logger.error(f"❌ Failed to update track mute: {e}")
        raise ServiceError(f"Failed to update track mute: {str(e)}")


@router.put("/{composition_id}/tracks/{track_id}/solo")
async def update_track_solo(
    composition_id: str,
    track_id: str,
    request: UpdateTrackSoloRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Update track solo state"""
    try:
        success = composition_state_service.set_track_solo(composition_id, track_id, request.is_solo)
        if not success:
            raise ResourceNotFoundError(f"Track {track_id} not found in composition {composition_id}")

        # AUTO-PERSIST: Keep current.json in sync with memory
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        return {"status": "success", "is_solo": request.is_solo}

    except Exception as e:
        logger.error(f"❌ Failed to update track solo: {e}")
        raise ServiceError(f"Failed to update track solo: {str(e)}")

