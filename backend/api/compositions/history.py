"""
Composition History Operations - Version management and restoration

This module handles composition version history, restoration, and autosave recovery.
"""
import logging
from fastapi import APIRouter, Depends

from backend.core.dependencies import (
    get_composition_service,
    get_composition_state_service,
    get_mixer_service,
    get_track_effects_service,
)
from backend.services.persistence.composition_service import CompositionService
from backend.services.daw.composition_state_service import CompositionStateService
from backend.services.daw.mixer_service import MixerService
from backend.services.daw.effects_service import TrackEffectsService
from backend.core.exceptions import ServiceError, ResourceNotFoundError

logger = logging.getLogger(__name__)

router = APIRouter()


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
        composition = composition_service.load_history_version(composition_id, version)
        if not composition:
            raise ResourceNotFoundError(f"Version {version} not found for composition {composition_id}")
        return composition
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
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
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
            composition_state_service=composition_state_service,
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

        logger.info(f"⏮️ Restored composition {composition_id} to version {version}")

        return {
            "status": "ok",
            "message": f"Restored to version {version}",
            "composition_id": composition_id,
            "version": version
        }

    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to restore version: {e}")
        raise ServiceError(f"Failed to restore version: {str(e)}")


@router.post("/{composition_id}/recover-autosave")
async def recover_from_autosave(
    composition_id: str,
    composition_service: CompositionService = Depends(get_composition_service),
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service),
):
    """
    Recover composition from autosave

    This loads the autosave and makes it the current version.
    """
    try:
        # Load autosave
        snapshot = composition_service.load_composition(composition_id, use_autosave=True)
        if not snapshot:
            raise ResourceNotFoundError(f"No autosave found for composition {composition_id}")

        # Restore to services
        success = composition_service.restore_snapshot_to_services(
            snapshot=snapshot,
            composition_state_service=composition_state_service,
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

