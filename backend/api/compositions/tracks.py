"""
Composition Tracks Routes - Track management within compositions

All track operations are scoped to a specific composition.
Tracks are nested resources under compositions.

Validation:
- Instrument names are validated against SYNTHDEF_REGISTRY
- Invalid instruments will result in 422 Unprocessable Entity
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
from backend.services.daw.composition_service import CompositionService
from backend.services.daw.mixer_service import MixerService
from backend.services.daw.track_effects_service import TrackEffectsService
from backend.models.sequence import Track, KitPad
from backend.models.instrument_types import ValidInstrument
from backend.services.daw.registry import get_kit_by_id

router = APIRouter()
logger = logging.getLogger(__name__)


class CreateTrackRequest(BaseModel):
    """
    Request to create a track in a composition

    Validation:
    - instrument must be a valid SynthDef name from SYNTHDEF_REGISTRY
    - FastAPI will return 422 if instrument is invalid
    """
    name: str
    type: Optional[str] = "audio"  # "midi" or "audio"
    color: Optional[str] = "#3b82f6"
    sample_id: Optional[str] = None  # For sample-based tracks
    sample_name: Optional[str] = None  # Cached sample name
    sample_file_path: Optional[str] = None  # Cached file path
    instrument: Optional[ValidInstrument] = Field(
        None,
        description="Instrument/synth name for MIDI tracks. Must be a valid SynthDef from SYNTHDEF_REGISTRY."
    )
    kit_id: Optional[str] = None  # Drum kit ID from kit_registry


class UpdateTrackRequest(BaseModel):
    """
    Request to update track properties

    Validation:
    - instrument must be a valid SynthDef name from SYNTHDEF_REGISTRY
    - FastAPI will return 422 if instrument is invalid
    """
    name: Optional[str] = None
    volume: Optional[float] = Field(None, ge=0.0, le=2.0)
    pan: Optional[float] = Field(None, ge=-1.0, le=1.0)
    instrument: Optional[ValidInstrument] = Field(
        None,
        description="Instrument/synth name for MIDI tracks. Must be a valid SynthDef from SYNTHDEF_REGISTRY."
    )
    kit_id: Optional[str] = Field(None, description="Drum kit ID — loads pads and clears instrument")


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
        # UNDO: Push current state to undo stack BEFORE mutation
        composition_state_service.push_undo(composition_id)

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

        # Populate drum kit pad map when kit_id is provided
        if request.kit_id:
            kit_def = get_kit_by_id(request.kit_id)
            if kit_def:
                track.kit = {
                    note: KitPad(synthdef=pad["synthdef"], params=pad.get("params", {}))
                    for note, pad in kit_def["pads"].items()
                }
                track.kit_id = request.kit_id
                logger.info(f"🥁 Loaded drum kit '{kit_def['name']}' ({len(track.kit)} pads) onto track {track.id}")

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
        # UNDO: Push current state to undo stack BEFORE mutation
        composition_state_service.push_undo(composition_id)

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

        # Handle kit swap: load new kit pads and clear instrument,
        # or clear kit when a plain instrument is being assigned.
        if request.kit_id is not None:
            kit_def = get_kit_by_id(request.kit_id)
            if kit_def:
                track.kit = {
                    note: KitPad(synthdef=pad["synthdef"], params=pad.get("params", {}))
                    for note, pad in kit_def["pads"].items()
                }
                track.kit_id = request.kit_id
                track.instrument = None  # Kit overrides instrument
                logger.info(f"🥁 Swapped kit to '{kit_def['name']}' on track {track_id}")
            else:
                logger.warning(f"Kit '{request.kit_id}' not found — ignoring kit swap")
        elif request.instrument is not None:
            # Switching to a plain synth instrument — clear any loaded kit
            track.kit = None
            track.kit_id = None

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
        # UNDO: Push current state to undo stack BEFORE mutation
        composition_state_service.push_undo(composition_id)

        success = composition_state_service.delete_track(track_id)
        if not success:
            raise ResourceNotFoundError(f"Track {track_id} not found")

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
        # UNDO: Push current state to undo stack BEFORE mutation
        composition_state_service.push_undo(composition_id)

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
        # UNDO: Push current state to undo stack BEFORE mutation
        composition_state_service.push_undo(composition_id)

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

