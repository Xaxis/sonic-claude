"""
Composition API Routes - Unified composition storage endpoints

This replaces the fragmented sequence save/version/autosave endpoints with
a unified composition API that handles complete DAW state (sequence + mixer + effects).
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.core.dependencies import (
    get_composition_service,
    get_sequencer_service,
    get_mixer_service,
    get_track_effects_service,
)
from backend.services.composition_service import CompositionService
from backend.services.sequencer_service import SequencerService
from backend.services.mixer_service import MixerService
from backend.services.track_effects_service import TrackEffectsService
from backend.models.composition_snapshot import CompositionSnapshot
from backend.core.exceptions import ServiceError, ResourceNotFoundError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/compositions", tags=["compositions"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class SaveCompositionRequest(BaseModel):
    """Request to save a composition"""
    sequence_id: str
    name: Optional[str] = None
    create_history: bool = True
    is_autosave: bool = False
    metadata: Optional[dict] = None


class CompositionMetadata(BaseModel):
    """Composition metadata for listing"""
    id: str
    name: str
    created_at: str
    updated_at: Optional[str] = None


class HistoryEntry(BaseModel):
    """History entry metadata"""
    version: int
    timestamp: str
    summary: str


# ============================================================================
# COMPOSITION CRUD ENDPOINTS
# ============================================================================

@router.post("/save")
async def save_composition(
    request: SaveCompositionRequest,
    composition_service: CompositionService = Depends(get_composition_service),
    sequencer_service: SequencerService = Depends(get_sequencer_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service),
):
    """
    Save complete composition state (sequence + mixer + effects)

    This creates a complete snapshot and optionally adds it to history.
    """
    try:
        # Get sequence
        sequence = sequencer_service.get_sequence(request.sequence_id)
        if not sequence:
            raise ResourceNotFoundError(f"Sequence {request.sequence_id} not found")

        # Build complete snapshot
        snapshot = composition_service.build_snapshot_from_services(
            sequencer_service=sequencer_service,
            mixer_service=mixer_service,
            effects_service=effects_service,
            sequence_id=request.sequence_id,
            name=request.name or sequence.name,
            metadata=request.metadata or {"source": "manual_save"}
        )

        if not snapshot:
            raise ServiceError(f"Failed to build snapshot for sequence {request.sequence_id}")

        # Save composition
        composition_service.save_composition(
            composition_id=request.sequence_id,
            snapshot=snapshot,
            create_history=request.create_history,
            is_autosave=request.is_autosave
        )

        logger.info(f"💾 Saved composition {request.sequence_id} (history={request.create_history})")

        return {
            "status": "ok",
            "message": f"Composition {request.sequence_id} saved",
            "composition_id": request.sequence_id,
            "history_created": request.create_history
        }

    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to save composition: {e}")
        raise ServiceError(f"Failed to save composition: {str(e)}")


@router.get("/list")
async def list_compositions(
    composition_service: CompositionService = Depends(get_composition_service)
):
    """List all compositions"""
    try:
        compositions = composition_service.list_compositions()
        return {"compositions": compositions}
    except Exception as e:
        logger.error(f"❌ Failed to list compositions: {e}")
        raise ServiceError(f"Failed to list compositions: {str(e)}")


@router.get("/{composition_id}")
async def get_composition(
    composition_id: str,
    use_autosave: bool = False,
    composition_service: CompositionService = Depends(get_composition_service)
):
    """Get composition by ID"""
    try:
        snapshot = composition_service.load_composition(composition_id, use_autosave=use_autosave)
        if not snapshot:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")
        return snapshot
    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to load composition: {e}")
        raise ServiceError(f"Failed to load composition: {str(e)}")





@router.delete("/{composition_id}")
async def delete_composition(
    composition_id: str,
    composition_service: CompositionService = Depends(get_composition_service)
):
    """Delete a composition and all its history"""
    try:
        success = composition_service.delete_composition(composition_id)
        if not success:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        logger.info(f"🗑️ Deleted composition {composition_id}")
        return {"status": "ok", "message": f"Composition {composition_id} deleted"}

    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete composition: {e}")
        raise ServiceError(f"Failed to delete composition: {str(e)}")


# ============================================================================
# HISTORY/VERSION ENDPOINTS
# ============================================================================

@router.get("/{composition_id}/history")
async def get_history(
    composition_id: str,
    composition_service: CompositionService = Depends(get_composition_service)
):
    """Get history entries for a composition"""
    try:
        history = composition_service.get_history(composition_id)
        return {
            "composition_id": composition_id,
            "history": history
        }
    except Exception as e:
        logger.error(f"❌ Failed to get history: {e}")
        raise ServiceError(f"Failed to get history: {str(e)}")


@router.get("/{composition_id}/history/{version}")
async def get_history_version(
    composition_id: str,
    version: int,
    composition_service: CompositionService = Depends(get_composition_service)
):
    """Get a specific version from history"""
    try:
        snapshot = composition_service.load_history_version(composition_id, version)
        if not snapshot:
            raise ResourceNotFoundError(f"Version {version} not found for composition {composition_id}")
        return snapshot
    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to load history version: {e}")
        raise ServiceError(f"Failed to load history version: {str(e)}")


@router.post("/{composition_id}/history/{version}/restore")
async def restore_version(
    composition_id: str,
    version: int,
    composition_service: CompositionService = Depends(get_composition_service),
    sequencer_service: SequencerService = Depends(get_sequencer_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service),
):
    """
    Restore composition to a specific version

    This loads the version and applies it to all services (sequencer, mixer, effects).
    It also creates a new history entry for the restoration.
    """
    try:
        # Load the version
        snapshot = composition_service.load_history_version(composition_id, version)
        if not snapshot:
            raise ResourceNotFoundError(f"Version {version} not found for composition {composition_id}")

        # Restore to services
        success = composition_service.restore_snapshot_to_services(
            snapshot=snapshot,
            sequencer_service=sequencer_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        if not success:
            raise ServiceError(f"Failed to restore snapshot to services")

        # Save as current (creates new history entry)
        composition_service.save_composition(
            composition_id=composition_id,
            snapshot=snapshot,
            create_history=True,
            is_autosave=False
        )

        logger.info(f"♻️ Restored composition {composition_id} to version {version}")

        return {
            "status": "ok",
            "message": f"Restored to version {version}",
            "composition_id": composition_id,
            "restored_version": version
        }

    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to restore version: {e}")
        raise ServiceError(f"Failed to restore version: {str(e)}")


@router.post("/{composition_id}/recover")
async def recover_from_autosave(
    composition_id: str,
    composition_service: CompositionService = Depends(get_composition_service),
    sequencer_service: SequencerService = Depends(get_sequencer_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service),
):
    """
    Recover composition from autosave

    This loads the autosave and applies it to all services, then saves it as current.
    """
    try:
        # Load autosave
        snapshot = composition_service.load_composition(composition_id, use_autosave=True)
        if not snapshot:
            raise ResourceNotFoundError(f"No autosave found for composition {composition_id}")

        # Restore to services
        success = composition_service.restore_snapshot_to_services(
            snapshot=snapshot,
            sequencer_service=sequencer_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        if not success:
            raise ServiceError(f"Failed to restore autosave to services")

        # Save as current (creates history entry)
        composition_service.save_composition(
            composition_id=composition_id,
            snapshot=snapshot,
            create_history=True,
            is_autosave=False
        )

        logger.info(f"💾 Recovered composition {composition_id} from autosave")

        return {
            "status": "ok",
            "message": f"Recovered from autosave",
            "composition_id": composition_id
        }

    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to recover from autosave: {e}")
        raise ServiceError(f"Failed to recover from autosave: {str(e)}")


# ============================================================================
# STARTUP/INITIALIZATION ENDPOINTS
# ============================================================================

@router.post("/load-all")
async def load_all_compositions(
    composition_service: CompositionService = Depends(get_composition_service),
    sequencer_service: SequencerService = Depends(get_sequencer_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service),
):
    """
    Load ALL saved compositions into memory on app startup

    This restores all compositions from disk to the in-memory services.
    Should be called once when the frontend initializes.
    """
    try:
        compositions = composition_service.list_compositions()
        loaded_count = 0

        for comp_meta in compositions:
            composition_id = comp_meta["id"]

            # Load composition snapshot
            snapshot = composition_service.load_composition(composition_id)
            if not snapshot:
                logger.warning(f"⚠️ Failed to load composition {composition_id}")
                continue

            # Restore to services
            success = composition_service.restore_snapshot_to_services(
                snapshot=snapshot,
                sequencer_service=sequencer_service,
                mixer_service=mixer_service,
                effects_service=effects_service
            )

            if success:
                loaded_count += 1
                logger.info(f"✅ Loaded composition: {snapshot.name} ({composition_id})")
            else:
                logger.error(f"❌ Failed to restore composition {composition_id}")

        logger.info(f"🎵 Loaded {loaded_count}/{len(compositions)} compositions into memory")

        return {
            "status": "ok",
            "message": f"Loaded {loaded_count} compositions",
            "total": len(compositions),
            "loaded": loaded_count
        }

    except Exception as e:
        logger.error(f"❌ Failed to load compositions: {e}")
        raise ServiceError(f"Failed to load compositions: {str(e)}")
