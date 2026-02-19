"""
DAW Action Service - Execute AI-generated actions

Performance considerations:
- Actions are atomic and fast
- Validation before execution
- Rollback support for batch operations
- Async execution where possible
"""
import logging
import uuid
from typing import Dict, Any, List

from backend.models.ai_actions import (
    DAWAction,
    ActionResult,
    BatchActionRequest,
    BatchActionResponse,
    CreateMIDIClipAction,
    ModifyClipAction,
    DeleteClipAction,
    CreateTrackAction,
    SetTrackParameterAction,
    SetTempoAction,
    AddEffectAction,
    SetEffectParameterAction,
    PlaySequenceAction,
    StopPlaybackAction
)
from backend.models.sequence import (
    AddClipRequest,
    UpdateClipRequest,
    MIDINote,
    CreateSequenceRequest
)
from backend.services.sequencer_service import SequencerService
from backend.services.mixer_service import MixerService
from backend.services.track_effects_service import TrackEffectsService

logger = logging.getLogger(__name__)


class DAWActionService:
    """
    Executes structured actions from AI agent
    Maps high-level actions to service calls
    """
    
    def __init__(
        self,
        sequencer_service: SequencerService,
        mixer_service: MixerService,
        track_effects_service: TrackEffectsService
    ):
        self.sequencer = sequencer_service
        self.mixer = mixer_service
        self.effects = track_effects_service
    
    async def execute_action(self, action: DAWAction) -> ActionResult:
        """Execute a single action"""
        try:
            action_type = action.action
            params = action.parameters
            
            # Route to appropriate handler
            if action_type == "create_midi_clip":
                return await self._create_midi_clip(params)
            elif action_type == "modify_clip":
                return await self._modify_clip(params)
            elif action_type == "delete_clip":
                return await self._delete_clip(params)
            elif action_type == "create_track":
                return await self._create_track(params)
            elif action_type == "set_track_parameter":
                return await self._set_track_parameter(params)
            elif action_type == "set_tempo":
                return await self._set_tempo(params)
            elif action_type == "add_effect":
                return await self._add_effect(params)
            elif action_type == "set_effect_parameter":
                return await self._set_effect_parameter(params)
            elif action_type == "play_sequence":
                return await self._play_sequence(params)
            elif action_type == "stop_playback":
                return await self._stop_playback(params)
            else:
                return ActionResult(
                    success=False,
                    action=action_type,
                    message=f"Unknown action type: {action_type}",
                    error="UNKNOWN_ACTION"
                )
        
        except Exception as e:
            logger.error(f"Error executing action {action.action}: {e}", exc_info=True)
            return ActionResult(
                success=False,
                action=action.action,
                message=f"Action failed: {str(e)}",
                error=str(e)
            )
    
    async def execute_batch(self, request: BatchActionRequest) -> BatchActionResponse:
        """Execute multiple actions, optionally atomically"""
        results = []
        failed_count = 0
        
        for action in request.actions:
            result = await self.execute_action(action)
            results.append(result)
            
            if not result.success:
                failed_count += 1
                if request.atomic:
                    # TODO: Implement rollback mechanism
                    logger.warning("Atomic batch failed, rollback not yet implemented")
                    break
        
        return BatchActionResponse(
            results=results,
            all_succeeded=(failed_count == 0),
            failed_count=failed_count
        )
    
    # ========================================================================
    # ACTION HANDLERS
    # ========================================================================
    
    async def _create_midi_clip(self, params: Dict[str, Any]) -> ActionResult:
        """Create MIDI clip with notes"""
        try:
            # Convert compact notes to full MIDINote objects
            notes = []
            for note_data in params.get("notes", []):
                # Convert compact format {n, s, d, v} to full MIDINote
                midi_note = MIDINote(
                    note=note_data["n"],
                    note_name=self._midi_to_note_name(note_data["n"]),
                    start_time=note_data["s"],
                    duration=note_data["d"],
                    velocity=note_data.get("v", 100)
                )
                notes.append(midi_note)
            
            # Create clip request
            clip_request = AddClipRequest(
                name=params.get("name", f"AI Clip {uuid.uuid4().hex[:6]}"),
                type="midi",
                track_id=params["track_id"],
                start_time=params["start_time"],
                duration=params["duration"],
                midi_events=notes
            )
            
            # Get current sequence
            if not self.sequencer.current_sequence_id:
                return ActionResult(
                    success=False,
                    action="create_midi_clip",
                    message="No active sequence",
                    error="NO_SEQUENCE"
                )
            
            # Add clip
            clip = await self.sequencer.add_clip(
                self.sequencer.current_sequence_id,
                clip_request
            )
            
            return ActionResult(
                success=True,
                action="create_midi_clip",
                message=f"Created MIDI clip '{clip.name}' with {len(notes)} notes",
                data={"clip_id": clip.id, "note_count": len(notes)}
            )
        
        except Exception as e:
            logger.error(f"Failed to create MIDI clip: {e}")
            raise

    async def _modify_clip(self, params: Dict[str, Any]) -> ActionResult:
        """Modify existing clip"""
        # TODO: Implement clip modification
        return ActionResult(
            success=False,
            action="modify_clip",
            message="Not yet implemented",
            error="NOT_IMPLEMENTED"
        )

    async def _delete_clip(self, params: Dict[str, Any]) -> ActionResult:
        """Delete clip"""
        try:
            await self.sequencer.delete_clip(
                self.sequencer.current_sequence_id,
                params["clip_id"]
            )
            return ActionResult(
                success=True,
                action="delete_clip",
                message=f"Deleted clip {params['clip_id']}"
            )
        except Exception as e:
            logger.error(f"Failed to delete clip: {e}")
            raise

    async def _create_track(self, params: Dict[str, Any]) -> ActionResult:
        """Create new track"""
        # TODO: Implement track creation
        return ActionResult(
            success=False,
            action="create_track",
            message="Not yet implemented",
            error="NOT_IMPLEMENTED"
        )

    async def _set_track_parameter(self, params: Dict[str, Any]) -> ActionResult:
        """Set track parameter (volume, pan, mute, solo)"""
        try:
            track_id = params["track_id"]
            parameter = params["parameter"]
            value = params["value"]

            if parameter == "volume":
                await self.sequencer.update_track_volume(track_id, value)
            elif parameter == "pan":
                await self.sequencer.update_track_pan(track_id, value)
            elif parameter == "mute":
                await self.sequencer.mute_track(track_id, value)
            elif parameter == "solo":
                await self.sequencer.solo_track(track_id, value)
            else:
                return ActionResult(
                    success=False,
                    action="set_track_parameter",
                    message=f"Unknown parameter: {parameter}",
                    error="UNKNOWN_PARAMETER"
                )

            return ActionResult(
                success=True,
                action="set_track_parameter",
                message=f"Set {parameter} to {value} on track {track_id}"
            )
        except Exception as e:
            logger.error(f"Failed to set track parameter: {e}")
            raise

    async def _set_tempo(self, params: Dict[str, Any]) -> ActionResult:
        """Set global tempo"""
        try:
            await self.sequencer.set_tempo(params["tempo"])
            return ActionResult(
                success=True,
                action="set_tempo",
                message=f"Set tempo to {params['tempo']} BPM"
            )
        except Exception as e:
            logger.error(f"Failed to set tempo: {e}")
            raise

    async def _add_effect(self, params: Dict[str, Any]) -> ActionResult:
        """Add effect to track"""
        # TODO: Implement effect addition
        return ActionResult(
            success=False,
            action="add_effect",
            message="Not yet implemented",
            error="NOT_IMPLEMENTED"
        )

    async def _set_effect_parameter(self, params: Dict[str, Any]) -> ActionResult:
        """Set effect parameter"""
        # TODO: Implement effect parameter setting
        return ActionResult(
            success=False,
            action="set_effect_parameter",
            message="Not yet implemented",
            error="NOT_IMPLEMENTED"
        )

    async def _play_sequence(self, params: Dict[str, Any]) -> ActionResult:
        """Start playback"""
        try:
            sequence_id = params.get("sequence_id") or self.sequencer.current_sequence_id
            if not sequence_id:
                return ActionResult(
                    success=False,
                    action="play_sequence",
                    message="No sequence specified or active",
                    error="NO_SEQUENCE"
                )

            await self.sequencer.play_sequence(sequence_id)
            return ActionResult(
                success=True,
                action="play_sequence",
                message=f"Started playback of sequence {sequence_id}"
            )
        except Exception as e:
            logger.error(f"Failed to play sequence: {e}")
            raise

    async def _stop_playback(self, params: Dict[str, Any]) -> ActionResult:
        """Stop playback"""
        try:
            await self.sequencer.stop_playback()
            return ActionResult(
                success=True,
                action="stop_playback",
                message="Stopped playback"
            )
        except Exception as e:
            logger.error(f"Failed to stop playback: {e}")
            raise

    @staticmethod
    def _midi_to_note_name(midi_note: int) -> str:
        """Convert MIDI note number to note name"""
        notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        octave = (midi_note // 12) - 1
        note = notes[midi_note % 12]
        return f"{note}{octave}"

