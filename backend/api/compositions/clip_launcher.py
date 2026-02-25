"""
Clip Launcher API - CRUD operations for clip launcher (performance mode)

NOTE: Clip launcher state is part of composition state.
All mutations auto-persist the composition.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
import logging

from backend.models.composition import Scene
from backend.services.daw.composition_state_service import CompositionStateService
from backend.services.daw.composition_service import CompositionService
from backend.services.daw.mixer_service import MixerService
from backend.services.daw.effects_service import TrackEffectsService
from backend.services.daw.playback_engine_service import PlaybackEngineService
from backend.core.dependencies import (
    get_composition_state_service,
    get_composition_service,
    get_mixer_service,
    get_track_effects_service,
    get_playback_engine_service
)
from backend.core.exceptions import ServiceError, ResourceNotFoundError

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# REQUEST MODELS
# ============================================================================

class AssignClipToSlotRequest(BaseModel):
    """Request to assign a clip to a slot"""
    clip_id: Optional[str] = Field(default=None, description="Clip ID to assign (null to clear slot)")


class CreateSceneRequest(BaseModel):
    """Request to create a new scene"""
    name: str = Field(description="Scene name")
    color: str = Field(default="#f39c12", description="Scene color")
    tempo: Optional[float] = Field(default=None, gt=0, le=300, description="Optional tempo override")


class UpdateSceneRequest(BaseModel):
    """Request to update a scene"""
    name: Optional[str] = Field(default=None, description="New scene name")
    color: Optional[str] = Field(default=None, description="New scene color")
    tempo: Optional[float] = Field(default=None, gt=0, le=300, description="New tempo override")


class SetLaunchQuantizationRequest(BaseModel):
    """Request to set launch quantization"""
    quantization: str = Field(description="Quantization: 'none', '1/4', '1/2', '1', '2', '4'")


# ============================================================================
# CLIP SLOT OPERATIONS
# ============================================================================

@router.put("/{composition_id}/clip-launcher/slots/{track_index}/{slot_index}")
async def assign_clip_to_slot(
    composition_id: str,
    track_index: int,
    slot_index: int,
    request: AssignClipToSlotRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Assign a clip to a slot in the clip launcher grid"""
    try:
        # UNDO: Push current state to undo stack BEFORE mutation
        composition_state_service.push_undo(composition_id)

        # Get composition
        composition = composition_state_service.get_composition(composition_id)
        if not composition:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # Initialize clip_slots if needed
        if composition.clip_slots is None:
            composition.clip_slots = []

        # Ensure grid is large enough
        while len(composition.clip_slots) <= track_index:
            composition.clip_slots.append([None] * 8)  # 8 slots per track
        
        while len(composition.clip_slots[track_index]) <= slot_index:
            composition.clip_slots[track_index].append(None)

        # Assign clip
        composition.clip_slots[track_index][slot_index] = request.clip_id

        # AUTO-PERSIST: Keep current.json in sync with memory
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        logger.info(f"✅ Assigned clip {request.clip_id} to slot [{track_index}][{slot_index}]")
        return {"status": "success", "track_index": track_index, "slot_index": slot_index, "clip_id": request.clip_id}

    except Exception as e:
        logger.error(f"❌ Failed to assign clip to slot: {e}")
        raise ServiceError(f"Failed to assign clip to slot: {str(e)}")


@router.get("/{composition_id}/clip-launcher/slots")
async def get_clip_slots(
    composition_id: str,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service)
):
    """Get all clip slots for the composition"""
    composition = composition_state_service.get_composition(composition_id)
    if not composition:
        raise ResourceNotFoundError(f"Composition {composition_id} not found")
    
    return {
        "clip_slots": composition.clip_slots or [],
        "scenes": composition.scenes or [],
        "launch_quantization": composition.launch_quantization or "1"
    }


# ============================================================================
# SCENE OPERATIONS
# ============================================================================

@router.post("/{composition_id}/clip-launcher/scenes", response_model=Scene)
async def create_scene(
    composition_id: str,
    request: CreateSceneRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Create a new scene"""
    try:
        # UNDO: Push current state to undo stack BEFORE mutation
        composition_state_service.push_undo(composition_id)

        # Get composition
        composition = composition_state_service.get_composition(composition_id)
        if not composition:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # Create scene
        import uuid
        scene = Scene(
            id=f"scene-{uuid.uuid4().hex[:8]}",
            name=request.name,
            color=request.color,
            tempo=request.tempo
        )

        # Add to composition
        composition.scenes.append(scene)

        # AUTO-PERSIST
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        logger.info(f"✅ Created scene '{request.name}' in composition {composition_id}")
        return scene

    except Exception as e:
        logger.error(f"❌ Failed to create scene: {e}")
        raise ServiceError(f"Failed to create scene: {str(e)}")


@router.put("/{composition_id}/clip-launcher/scenes/{scene_id}", response_model=Scene)
async def update_scene(
    composition_id: str,
    scene_id: str,
    request: UpdateSceneRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Update a scene"""
    try:
        # UNDO: Push current state
        composition_state_service.push_undo(composition_id)

        # Get composition
        composition = composition_state_service.get_composition(composition_id)
        if not composition:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # Find scene
        scene = next((s for s in composition.scenes if s.id == scene_id), None)
        if not scene:
            raise ResourceNotFoundError(f"Scene {scene_id} not found")

        # Update fields
        if request.name is not None:
            scene.name = request.name
        if request.color is not None:
            scene.color = request.color
        if request.tempo is not None:
            scene.tempo = request.tempo

        # AUTO-PERSIST
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        logger.info(f"✅ Updated scene {scene_id}")
        return scene

    except Exception as e:
        logger.error(f"❌ Failed to update scene: {e}")
        raise ServiceError(f"Failed to update scene: {str(e)}")


@router.delete("/{composition_id}/clip-launcher/scenes/{scene_id}")
async def delete_scene(
    composition_id: str,
    scene_id: str,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Delete a scene"""
    try:
        # UNDO: Push current state
        composition_state_service.push_undo(composition_id)

        # Get composition
        composition = composition_state_service.get_composition(composition_id)
        if not composition:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # Remove scene
        composition.scenes = [s for s in composition.scenes if s.id != scene_id]

        # AUTO-PERSIST
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        logger.info(f"✅ Deleted scene {scene_id}")
        return {"status": "success", "scene_id": scene_id}

    except Exception as e:
        logger.error(f"❌ Failed to delete scene: {e}")
        raise ServiceError(f"Failed to delete scene: {str(e)}")


# ============================================================================
# SETTINGS
# ============================================================================

@router.put("/{composition_id}/clip-launcher/quantization")
async def set_launch_quantization(
    composition_id: str,
    request: SetLaunchQuantizationRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Set launch quantization for the composition"""
    try:
        # Get composition
        composition = composition_state_service.get_composition(composition_id)
        if not composition:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # Update quantization
        composition.launch_quantization = request.quantization

        # AUTO-PERSIST
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        logger.info(f"✅ Set launch quantization to {request.quantization}")
        return {"status": "success", "quantization": request.quantization}

    except Exception as e:
        logger.error(f"❌ Failed to set launch quantization: {e}")
        raise ServiceError(f"Failed to set launch quantization: {str(e)}")


# ============================================================================
# CLIP PLAYBACK (PERFORMANCE MODE)
# ============================================================================

@router.post("/{composition_id}/clip-launcher/clips/{clip_id}/launch")
async def launch_clip(
    composition_id: str,
    clip_id: str,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    playback_engine_service: PlaybackEngineService = Depends(get_playback_engine_service)
):
    """
    Launch a clip in the clip launcher

    This triggers the clip to play according to the launch quantization setting.
    The clip will loop until stopped.
    """
    try:
        # Get composition
        composition = composition_state_service.get_composition(composition_id)
        if not composition:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # Find clip
        clip = next((c for c in composition.clips if c.id == clip_id), None)
        if not clip:
            raise ResourceNotFoundError(f"Clip {clip_id} not found")

        # Trigger clip playback (respects composition.launch_quantization)
        # - If quantization is 'none' or playback not running: launches immediately
        # - Otherwise: schedules launch at next beat/bar boundary
        await playback_engine_service.launch_clip(composition_id, clip_id)

        logger.info(f"✅ Launched clip '{clip.name}' (ID: {clip_id})")
        return {"status": "launched", "clip_id": clip_id}

    except Exception as e:
        logger.error(f"❌ Failed to launch clip: {e}")
        raise ServiceError(f"Failed to launch clip: {str(e)}")


@router.post("/{composition_id}/clip-launcher/clips/{clip_id}/stop")
async def stop_clip(
    composition_id: str,
    clip_id: str,
    playback_engine_service: PlaybackEngineService = Depends(get_playback_engine_service)
):
    """Stop a playing clip"""
    try:
        await playback_engine_service.stop_clip(clip_id)

        logger.info(f"✅ Stopped clip {clip_id}")
        return {"status": "stopped", "clip_id": clip_id}

    except Exception as e:
        logger.error(f"❌ Failed to stop clip: {e}")
        raise ServiceError(f"Failed to stop clip: {str(e)}")


@router.post("/{composition_id}/clip-launcher/scenes/{scene_id}/launch")
async def launch_scene(
    composition_id: str,
    scene_id: str,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    playback_engine_service: PlaybackEngineService = Depends(get_playback_engine_service)
):
    """
    Launch a scene (triggers all clips in that row)

    Finds all clips assigned to the scene's slot index across all tracks
    and launches them simultaneously.
    """
    try:
        # Get composition
        composition = composition_state_service.get_composition(composition_id)
        if not composition:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # Find scene
        scene = next((s for s in composition.scenes if s.id == scene_id), None)
        if not scene:
            raise ResourceNotFoundError(f"Scene {scene_id} not found")

        # Find scene index
        scene_index = composition.scenes.index(scene)

        # Collect all clip IDs in this scene (horizontal row)
        clip_ids_to_launch = []
        if composition.clip_slots:
            for track_index, track_slots in enumerate(composition.clip_slots):
                if scene_index < len(track_slots):
                    clip_id = track_slots[scene_index]
                    if clip_id:
                        clip_ids_to_launch.append(clip_id)

        # Launch all clips in the scene
        for clip_id in clip_ids_to_launch:
            await playback_engine_service.launch_clip(composition_id, clip_id)

        logger.info(f"✅ Launched scene '{scene.name}' ({len(clip_ids_to_launch)} clips)")
        return {
            "status": "launched",
            "scene_id": scene_id,
            "clips_launched": len(clip_ids_to_launch)
        }

    except Exception as e:
        logger.error(f"❌ Failed to launch scene: {e}")
        raise ServiceError(f"Failed to launch scene: {str(e)}")


@router.post("/{composition_id}/clip-launcher/clips/stop-all")
async def stop_all_clips(
    composition_id: str,
    playback_engine_service: PlaybackEngineService = Depends(get_playback_engine_service)
):
    """Stop all playing clips"""
    try:
        await playback_engine_service.stop_all_clips()

        logger.info(f"✅ Stopped all clips")
        return {"status": "stopped"}

    except Exception as e:
        logger.error(f"❌ Failed to stop all clips: {e}")
        raise ServiceError(f"Failed to stop all clips: {str(e)}")


@router.post("/{composition_id}/clip-launcher/tracks/{track_id}/stop-all")
async def stop_track_clips(
    composition_id: str,
    track_id: str,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    playback_engine_service: PlaybackEngineService = Depends(get_playback_engine_service)
):
    """
    Stop all clips on a specific track

    Stops all playing and triggered clips that belong to the specified track.
    """
    try:
        # Get composition
        composition = composition_state_service.get_composition(composition_id)
        if not composition:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # Find all clips on this track
        track_clip_ids = [clip.id for clip in composition.clips if clip.track_id == track_id]

        # Stop each clip
        stopped_count = 0
        for clip_id in track_clip_ids:
            if clip_id in playback_engine_service.active_synths or clip_id in playback_engine_service.triggered_clips:
                await playback_engine_service.stop_clip(clip_id)
                stopped_count += 1

        logger.info(f"✅ Stopped {stopped_count} clips on track {track_id}")
        return {
            "status": "stopped",
            "track_id": track_id,
            "clips_stopped": stopped_count
        }

    except Exception as e:
        logger.error(f"❌ Failed to stop track clips: {e}")
        raise ServiceError(f"Failed to stop track clips: {str(e)}")

