"""
Composition Startup Operations - App initialization and bulk loading

This module handles loading all compositions into memory on app startup.
"""
import logging
from fastapi import APIRouter, Depends

from backend.core.dependencies import (
    get_composition_service,
    get_sequencer_service,
    get_mixer_service,
    get_track_effects_service,
    get_ai_agent_service,
)
from backend.services.persistence.composition_service import CompositionService
from backend.services.daw.sequencer_service import SequencerService
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
    sequencer_service: SequencerService = Depends(get_sequencer_service),
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
        first_sequence_id = None

        for comp_meta in compositions:
            composition_id = comp_meta["id"]

            # Load composition snapshot
            snapshot = composition_service.load_composition(composition_id)
            if not snapshot:
                logger.warning(f"⚠️ Failed to load composition {composition_id}")
                continue

            # Track first sequence for setting as current
            if first_sequence_id is None:
                first_sequence_id = snapshot.sequence.id

            # Restore to services WITHOUT setting as current
            # This allows all compositions to be loaded without overwriting each other
            success = composition_service.restore_snapshot_to_services(
                snapshot=snapshot,
                sequencer_service=sequencer_service,
                mixer_service=mixer_service,
                effects_service=effects_service,
                set_as_current=False  # Don't set as current during bulk load
            )

            if success:
                loaded_count += 1
                logger.info(f"✅ Loaded composition: {snapshot.name} ({composition_id})")

                # Restore chat history to AI agent service
                if snapshot.chat_history:
                    ai_agent_service.chat_histories[composition_id] = snapshot.chat_history
                    logger.info(f"💬 Restored {len(snapshot.chat_history)} chat messages for composition {composition_id}")
            else:
                logger.error(f"❌ Failed to restore composition {composition_id}")

        # Set first sequence as current (if any were loaded)
        if first_sequence_id:
            sequencer_service.current_sequence_id = first_sequence_id
            logger.info(f"📌 Set first sequence as current: {first_sequence_id}")

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

