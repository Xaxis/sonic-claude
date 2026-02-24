"""
Composition Startup Operations - App initialization and bulk loading

This module handles loading all compositions into memory on app startup.
"""
import logging
from fastapi import APIRouter, Depends

from backend.core.dependencies import (
    get_composition_service,
    get_composition_state_service,
    get_mixer_service,
    get_track_effects_service,
    get_ai_agent_service,
)
from backend.services.daw.composition_service import CompositionService
from backend.services.daw.composition_state_service import CompositionStateService
from backend.services.daw.mixer_service import MixerService
from backend.services.daw.effects_service import TrackEffectsService
from backend.services.ai.agent_service import AIAgentService
from backend.core.exceptions import ServiceError

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# STARTUP/INITIALIZATION ENDPOINTS
# ============================================================================

@router.post("/load-all")
async def load_all_compositions(
    composition_service: CompositionService = Depends(get_composition_service),
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service),
    ai_agent_service: AIAgentService = Depends(get_ai_agent_service),
):
    """
    Load ALL saved compositions into memory on app startup

    This restores all compositions from disk to the in-memory services.
    Should be called once when the frontend initializes.
    """
    try:
        compositions = composition_service.list_compositions()
        loaded_count = 0
        first_composition_id = None

        for comp_meta in compositions:
            composition_id = comp_meta["id"]

            # Load composition from disk
            composition = composition_service.load_composition(composition_id)
            if not composition:
                logger.warning(f"⚠️ Failed to load composition {composition_id}")
                continue

            # Track first composition for setting as current
            if first_composition_id is None:
                first_composition_id = composition.id

            # Restore to services WITHOUT setting as current
            # This allows all compositions to be loaded without overwriting each other
            success = composition_service.restore_composition_to_services(
                composition=composition,
                composition_state_service=composition_state_service,
                mixer_service=mixer_service,
                effects_service=effects_service,
                set_as_current=False  # Don't set as current during bulk load
            )

            if success:
                loaded_count += 1
                logger.info(f"✅ Loaded composition: {composition.name} ({composition_id})")

                # Restore chat history to AI agent service
                if composition.chat_history:
                    ai_agent_service.chat_histories[composition_id] = composition.chat_history
                    logger.info(f"💬 Restored {len(composition.chat_history)} chat messages for composition {composition_id}")
            else:
                logger.error(f"❌ Failed to restore composition {composition_id}")

        # Set first composition as current (if any were loaded)
        if first_composition_id:
            composition_state_service.current_composition_id = first_composition_id
            logger.info(f"📌 Set first composition as current: {first_composition_id}")

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

