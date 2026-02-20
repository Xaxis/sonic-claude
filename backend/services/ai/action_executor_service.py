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
    CreateSequenceRequest,
    Sequence
)
from backend.services.daw.sequencer_service import SequencerService
from backend.services.daw.mixer_service import MixerService
from backend.services.daw.effects_service import TrackEffectsService

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

            logger.info(f"🎯 Executing action: {action_type}")
            logger.info(f"   Parameters: {params}")

            # Route to appropriate handler
            if action_type == "create_midi_clip":
                result = await self._create_midi_clip(params)
                logger.info(f"   ✅ create_midi_clip result: {result.message}")
                return result
            elif action_type == "modify_clip":
                return await self._modify_clip(params)
            elif action_type == "delete_clip":
                return await self._delete_clip(params)
            elif action_type == "create_track":
                result = await self._create_track(params)
                logger.info(f"   ✅ create_track result: {result.message}")
                return result
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
            logger.error(f"❌ Error executing action {action.action}: {e}", exc_info=True)
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
                    # Stop on first failure in atomic mode
                    logger.warning(f"Atomic batch failed at action {len(results)}, stopping execution")
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
                clip_type="midi",
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
            
            # Add clip (NOT async - remove await)
            clip = self.sequencer.add_clip(
                self.sequencer.current_sequence_id,
                clip_request
            )

            if not clip:
                return ActionResult(
                    success=False,
                    action="create_midi_clip",
                    message="Failed to create clip",
                    error="CLIP_CREATION_FAILED"
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
        try:
            clip_id = params["clip_id"]

            # Build update request
            update_request = UpdateClipRequest()

            if "start_time" in params:
                update_request.start_time = params["start_time"]
            if "duration" in params:
                update_request.duration = params["duration"]
            if "is_muted" in params:
                update_request.is_muted = params["is_muted"]
            if "gain" in params:
                update_request.gain = params["gain"]

            # Handle MIDI note updates (convert compact format)
            if "notes" in params:
                notes = []
                for note_data in params["notes"]:
                    midi_note = MIDINote(
                        note=note_data["n"],
                        note_name=self._midi_to_note_name(note_data["n"]),
                        start_time=note_data["s"],
                        duration=note_data["d"],
                        velocity=note_data.get("v", 100)
                    )
                    notes.append(midi_note)
                update_request.midi_events = notes

            if not self.sequencer.current_sequence_id:
                return ActionResult(
                    success=False,
                    action="modify_clip",
                    message="No active sequence",
                    error="NO_SEQUENCE"
                )

            clip = self.sequencer.update_clip(
                self.sequencer.current_sequence_id,
                clip_id,
                update_request
            )

            if not clip:
                return ActionResult(
                    success=False,
                    action="modify_clip",
                    message=f"Clip {clip_id} not found",
                    error="CLIP_NOT_FOUND"
                )

            return ActionResult(
                success=True,
                action="modify_clip",
                message=f"Modified clip '{clip.name}'",
                data={"clip_id": clip.id}
            )

        except Exception as e:
            logger.error(f"Failed to modify clip: {e}")
            raise

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
        try:
            if not self.sequencer.current_sequence_id:
                return ActionResult(
                    success=False,
                    action="create_track",
                    message="No active sequence",
                    error="NO_SEQUENCE"
                )

            track = self.sequencer.create_track(
                sequence_id=self.sequencer.current_sequence_id,
                name=params.get("name", "AI Track"),
                track_type=params.get("type", "midi"),
                color=params.get("color", "#3b82f6"),
                instrument=params.get("instrument")  # Set instrument for MIDI tracks
            )

            if not track:
                return ActionResult(
                    success=False,
                    action="create_track",
                    message="Failed to create track",
                    error="CREATION_FAILED"
                )

            # Build message with instrument info if provided
            message = f"Created track '{track.name}'"
            if track.instrument:
                message += f" with instrument '{track.instrument}'"

            return ActionResult(
                success=True,
                action="create_track",
                message=message,
                data={"track_id": track.id, "instrument": track.instrument}
            )

        except Exception as e:
            logger.error(f"Failed to create track: {e}")
            raise

    async def _set_track_parameter(self, params: Dict[str, Any]) -> ActionResult:
        """Set track parameter (volume, pan, mute, solo)"""
        try:
            track_id = params["track_id"]
            parameter = params["parameter"]
            value = params["value"]

            if parameter == "volume":
                await self.sequencer.update_track(track_id, volume=value)
            elif parameter == "pan":
                await self.sequencer.update_track(track_id, pan=value)
            elif parameter == "mute":
                await self.sequencer.update_track_mute(track_id, value)
            elif parameter == "solo":
                await self.sequencer.update_track_solo(track_id, value)
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
        try:
            effect = await self.effects.create_effect(
                track_id=params["track_id"],
                effect_name=params["effect_name"],
                slot_index=params.get("slot_index"),
                display_name=params.get("display_name")
            )

            return ActionResult(
                success=True,
                action="add_effect",
                message=f"Added {effect.effect_name} to track {params['track_id']}",
                data={"effect_id": effect.id, "slot_index": effect.slot_index}
            )

        except Exception as e:
            logger.error(f"Failed to add effect: {e}")
            raise

    async def _set_effect_parameter(self, params: Dict[str, Any]) -> ActionResult:
        """Set effect parameter"""
        try:
            effect = await self.effects.update_effect_parameter(
                effect_id=params["effect_id"],
                parameter_name=params["parameter_name"],
                value=params["value"]
            )

            return ActionResult(
                success=True,
                action="set_effect_parameter",
                message=f"Set {params['parameter_name']} to {params['value']} on effect {effect.effect_name}",
                data={"effect_id": effect.id}
            )

        except Exception as e:
            logger.error(f"Failed to set effect parameter: {e}")
            raise

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

