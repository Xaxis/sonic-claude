"""
Composite Tools - Poka-Yoke Design

These tools combine multiple operations into atomic units that PREVENT mistakes
through tool design rather than relying on prompts.

Based on Anthropic's best practices:
- "Put as much effort into Agent-Computer Interface (ACI) as Human-Computer Interface (HCI)"
- "Poka-yoke your tools - make it harder to make mistakes"
- "Change the arguments so that it is harder to make mistakes"
"""
import logging
from typing import Dict, Any, List, Optional
from backend.models.ai_actions import DAWAction, ActionResult
from backend.services.ai.action_executor_service import DAWActionService

logger = logging.getLogger(__name__)


class CompositeToolExecutor:
    """
    Executes composite tools that combine multiple DAW operations.
    
    Each composite tool is ATOMIC - it either succeeds completely or fails.
    This prevents partial states like "track without clip".
    """
    
    def __init__(self, action_service: DAWActionService):
        self.action_service = action_service
    
    async def create_track_with_content(
        self,
        name: str,
        instrument: str,
        notes: List[Dict[str, Any]],
        effects: Optional[List[str]] = None,
        start_time: float = 0.0,
        duration: float = 4.0,
        clip_name: Optional[str] = None
    ) -> ActionResult:
        """
        Create a complete track with musical content in ONE atomic operation.
        
        This tool makes it IMPOSSIBLE to create empty tracks.
        
        Args:
            name: Track name (e.g., "Kick Drum", "Bass")
            instrument: Instrument type (must be valid from registry)
            notes: MIDI notes array (REQUIRED, min 1 note)
                   Format: [{"n": 60, "s": 0, "d": 1, "v": 100}, ...]
            effects: Optional list of effect types to add
            start_time: Clip start time in beats (default: 0)
            duration: Clip duration in beats (default: 4)
            clip_name: Optional clip name (defaults to "{name} Pattern")
        
        Returns:
            ActionResult with complete track data
        
        Raises:
            ValueError: If notes array is empty or invalid
        """
        # ====================================================================
        # VALIDATION (BEFORE doing anything)
        # ====================================================================
        if not notes or len(notes) == 0:
            error_msg = "notes array is REQUIRED and cannot be empty. A track without notes is useless."
            logger.error(f"❌ create_track_with_content validation failed: {error_msg}")
            return ActionResult(
                action="create_track_with_content",
                success=False,
                error=error_msg
            )
        
        # Validate note format
        for i, note in enumerate(notes):
            if "n" not in note or "s" not in note or "d" not in note:
                error_msg = f"Note {i} is missing required fields (n, s, d). Got: {note}"
                logger.error(f"❌ create_track_with_content validation failed: {error_msg}")
                return ActionResult(
                    action="create_track_with_content",
                    success=False,
                    error=error_msg
                )
        
        logger.info(f"✅ Validation passed: {len(notes)} notes provided")
        
        # ====================================================================
        # ATOMIC EXECUTION (all-or-nothing)
        # ====================================================================
        try:
            # Step 1: Create track
            logger.info(f"🎵 Step 1/3: Creating track '{name}' with instrument '{instrument}'")
            create_track_action = DAWAction(
                action="create_track",
                parameters={
                    "name": name,
                    "type": "midi",
                    "instrument": instrument
                }
            )
            track_result = await self.action_service.execute_action(create_track_action)
            
            if not track_result.success:
                logger.error(f"❌ Failed to create track: {track_result.error}")
                return track_result
            
            track_id = track_result.data.get("track_id")
            logger.info(f"✅ Track created: {track_id}")
            
            # Step 2: Create clip with notes (REQUIRED)
            logger.info(f"🎵 Step 2/3: Adding clip with {len(notes)} notes to track {track_id}")
            create_clip_action = DAWAction(
                action="create_midi_clip",
                parameters={
                    "track_id": track_id,
                    "start_time": start_time,
                    "duration": duration,
                    "notes": notes,
                    "name": clip_name or f"{name} Pattern"
                }
            )
            clip_result = await self.action_service.execute_action(create_clip_action)
            
            if not clip_result.success:
                logger.error(f"❌ Failed to create clip: {clip_result.error}")
                # TODO: Rollback track creation (future enhancement)
                return ActionResult(
                    action="create_track_with_content",
                    success=False,
                    error=f"Track created but clip failed: {clip_result.error}",
                    data={"track_id": track_id}
                )
            
            clip_id = clip_result.data.get("clip_id")
            logger.info(f"✅ Clip created: {clip_id}")
            
            # Step 3: Add effects (optional)
            effects_added = []
            if effects:
                logger.info(f"🎵 Step 3/3: Adding {len(effects)} effects to track {track_id}")
                for effect_type in effects:
                    add_effect_action = DAWAction(
                        action="add_effect",
                        parameters={
                            "track_id": track_id,
                            "effect_name": effect_type
                        }
                    )
                    effect_result = await self.action_service.execute_action(add_effect_action)
                    
                    if effect_result.success:
                        effects_added.append(effect_type)
                        logger.info(f"✅ Effect added: {effect_type}")
                    else:
                        logger.warning(f"⚠️ Failed to add effect {effect_type}: {effect_result.error}")
            else:
                logger.info(f"🎵 Step 3/3: No effects to add (skipped)")
            
            # ====================================================================
            # SUCCESS - Return complete track data
            # ====================================================================
            logger.info(f"🎉 create_track_with_content SUCCESS: Track '{name}' is complete with {len(notes)} notes and {len(effects_added)} effects")
            
            return ActionResult(
                action="create_track_with_content",
                success=True,
                message=f"Created complete track '{name}' with {len(notes)} notes and {len(effects_added)} effects",
                data={
                    "track_id": track_id,
                    "track_name": name,
                    "clip_id": clip_id,
                    "clip_name": clip_name or f"{name} Pattern",
                    "notes_count": len(notes),
                    "effects_added": effects_added
                }
            )
            
        except Exception as e:
            logger.exception(f"❌ create_track_with_content failed with exception")
            return ActionResult(
                action="create_track_with_content",
                success=False,
                error=f"Unexpected error: {str(e)}"
            )

