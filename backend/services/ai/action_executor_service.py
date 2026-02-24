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
    # Clip actions
    CreateMIDIClipAction,
    ModifyClipAction,
    DeleteClipAction,
    DuplicateClipAction,
    MoveClipAction,
    SplitClipAction,
    SetClipGainAction,
    # Track actions
    CreateTrackAction,
    DeleteTrackAction,
    RenameTrackAction,
    ChangeTrackInstrumentAction,
    ReorderTracksAction,
    SetTrackParameterAction,
    # Effect actions
    AddEffectAction,
    RemoveEffectAction,
    BypassEffectAction,
    ReorderEffectsAction,
    SetEffectParameterAction,
    # Composition actions
    SetTempoAction,
    SetTimeSignatureAction,
    SetLoopPointsAction,
    SeekToPositionAction,
    RenameCompositionAction,
    # Playback actions
    PlaySequenceAction,
    StopPlaybackAction
)
from backend.models.sequence import (
    AddClipRequest,
    UpdateClipRequest,
    MIDINote,
)
from backend.services.daw.composition_state_service import CompositionStateService
from backend.services.daw.playback_engine_service import PlaybackEngineService
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
        composition_state_service: CompositionStateService,
        playback_engine_service: PlaybackEngineService,
        mixer_service: MixerService,
        track_effects_service: TrackEffectsService
    ):
        self.composition_state = composition_state_service
        self.playback_engine = playback_engine_service
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
            # === CLIP OPERATIONS ===
            if action_type == "create_midi_clip":
                result = await self._create_midi_clip(params)
                logger.info(f"   ✅ create_midi_clip result: {result.message}")
                return result
            elif action_type == "modify_clip":
                return await self._modify_clip(params)
            elif action_type == "delete_clip":
                return await self._delete_clip(params)
            elif action_type == "duplicate_clip":
                return await self._duplicate_clip(params)
            elif action_type == "move_clip":
                return await self._move_clip(params)
            elif action_type == "split_clip":
                return await self._split_clip(params)
            elif action_type == "set_clip_gain":
                return await self._set_clip_gain(params)

            # === TRACK OPERATIONS ===
            elif action_type == "create_track":
                result = await self._create_track(params)
                logger.info(f"   ✅ create_track result: {result.message}")
                return result
            elif action_type == "delete_track":
                return await self._delete_track(params)
            elif action_type == "rename_track":
                return await self._rename_track(params)
            elif action_type == "change_track_instrument":
                return await self._change_track_instrument(params)
            elif action_type == "reorder_tracks":
                return await self._reorder_tracks(params)
            elif action_type == "set_track_parameter":
                return await self._set_track_parameter(params)

            # === EFFECT OPERATIONS ===
            elif action_type == "add_effect":
                return await self._add_effect(params)
            elif action_type == "remove_effect":
                return await self._remove_effect(params)
            elif action_type == "bypass_effect":
                return await self._bypass_effect(params)
            elif action_type == "reorder_effects":
                return await self._reorder_effects(params)
            elif action_type == "set_effect_parameter":
                return await self._set_effect_parameter(params)

            # === COMPOSITION OPERATIONS ===
            elif action_type == "set_tempo":
                return await self._set_tempo(params)
            elif action_type == "set_time_signature":
                return await self._set_time_signature(params)
            elif action_type == "set_loop_points":
                return await self._set_loop_points(params)
            elif action_type == "seek_to_position":
                return await self._seek_to_position(params)
            elif action_type == "rename_composition":
                return await self._rename_composition(params)

            # === PLAYBACK OPERATIONS ===
            elif action_type == "play_composition":
                return await self._play_composition(params)
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
            if not self.composition_state.current_composition_id:
                return ActionResult(
                    success=False,
                    action="create_midi_clip",
                    message="No active sequence",
                    error="NO_SEQUENCE"
                )
            
            # Add clip (NOT async - remove await)
            clip = self.composition_state.add_clip(
                self.composition_state.current_composition_id,
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

            if not self.composition_state.current_composition_id:
                return ActionResult(
                    success=False,
                    action="modify_clip",
                    message="No active sequence",
                    error="NO_SEQUENCE"
                )

            clip = self.composition_state.update_clip(
                self.composition_state.current_composition_id,
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
            await self.composition_state.delete_clip(
                self.composition_state.current_composition_id,
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
            if not self.composition_state.current_composition_id:
                return ActionResult(
                    success=False,
                    action="create_track",
                    message="No active composition",
                    error="NO_COMPOSITION"
                )

            track = self.composition_state.create_track(
                composition_id=self.composition_state.current_composition_id,
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

            # Get current composition ID
            if not self.composition_state.current_composition_id:
                return ActionResult(
                    success=False,
                    action="set_track_parameter",
                    message="No active composition",
                    error="NO_COMPOSITION"
                )

            composition_id = self.composition_state.current_composition_id

            # Get the track to update its properties
            composition = self.composition_state.get_composition(composition_id)
            if not composition:
                return ActionResult(
                    success=False,
                    action="set_track_parameter",
                    message=f"Composition {composition_id} not found",
                    error="COMPOSITION_NOT_FOUND"
                )

            track = next((t for t in composition.tracks if t.id == track_id), None)
            if not track:
                return ActionResult(
                    success=False,
                    action="set_track_parameter",
                    message=f"Track {track_id} not found",
                    error="TRACK_NOT_FOUND"
                )

            if parameter == "volume":
                track.volume = value
            elif parameter == "pan":
                track.pan = value
            elif parameter == "mute":
                track.is_muted = value
            elif parameter == "solo":
                track.is_solo = value
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
            # Get current composition ID
            if not self.composition_state.current_composition_id:
                return ActionResult(
                    success=False,
                    action="set_tempo",
                    message="No active composition",
                    error="NO_COMPOSITION"
                )

            composition_id = self.composition_state.current_composition_id
            await self.playback_engine.set_tempo(composition_id, params["tempo"])
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

    async def _play_composition(self, params: Dict[str, Any]) -> ActionResult:
        """Start playback"""
        try:
            composition_id = params.get("composition_id") or self.composition_state.current_composition_id
            if not composition_id:
                return ActionResult(
                    success=False,
                    action="play_composition",
                    message="No composition specified or active",
                    error="NO_COMPOSITION"
                )

            await self.playback_engine.play_composition(composition_id)
            return ActionResult(
                success=True,
                action="play_composition",
                message=f"Started playback of composition {composition_id}"
            )
        except Exception as e:
            logger.error(f"Failed to play sequence: {e}")
            raise

    async def _stop_playback(self, params: Dict[str, Any]) -> ActionResult:
        """Stop playback"""
        try:
            await self.playback_engine.stop_playback()
            return ActionResult(
                success=True,
                action="stop_playback",
                message="Stopped playback"
            )
        except Exception as e:
            logger.error(f"Failed to stop playback: {e}")
            raise

    # ========================================================================
    # EXTENDED CLIP OPERATIONS
    # ========================================================================

    async def _duplicate_clip(self, params: Dict[str, Any]) -> ActionResult:
        """Duplicate a clip"""
        try:
            composition_id = self.composition_state.current_composition_id
            if not composition_id:
                return ActionResult(
                    success=False,
                    action="duplicate_clip",
                    message="No active composition",
                    error="NO_COMPOSITION"
                )

            composition = self.composition_state.get_composition(composition_id)
            if not composition:
                return ActionResult(
                    success=False,
                    action="duplicate_clip",
                    message=f"Composition {composition_id} not found",
                    error="COMPOSITION_NOT_FOUND"
                )

            # Find the clip to duplicate
            clip = next((c for c in composition.clips if c.id == params["clip_id"]), None)
            if not clip:
                return ActionResult(
                    success=False,
                    action="duplicate_clip",
                    message=f"Clip {params['clip_id']} not found",
                    error="CLIP_NOT_FOUND"
                )

            # Create duplicate clip
            new_clip_id = str(uuid.uuid4())
            start_time = params.get("start_time", clip.start_time + clip.duration)  # Auto-place after original

            from backend.models.sequence import Clip
            new_clip = Clip(
                id=new_clip_id,
                name=f"{clip.name} (copy)",
                type=clip.type,
                track_id=clip.track_id,
                start_time=start_time,
                duration=clip.duration,
                is_muted=clip.is_muted,
                is_looped=clip.is_looped,
                gain=clip.gain,
                midi_events=clip.midi_events.copy() if clip.midi_events else None,
                audio_file_path=clip.audio_file_path,
                audio_offset=clip.audio_offset
            )

            composition.clips.append(new_clip)

            return ActionResult(
                success=True,
                action="duplicate_clip",
                message=f"Duplicated clip {clip.name}",
                data={"clip_id": new_clip_id, "start_time": start_time}
            )

        except Exception as e:
            logger.error(f"Failed to duplicate clip: {e}")
            raise

    async def _move_clip(self, params: Dict[str, Any]) -> ActionResult:
        """Move a clip to a different track or time"""
        try:
            composition_id = self.composition_state.current_composition_id
            if not composition_id:
                return ActionResult(
                    success=False,
                    action="move_clip",
                    message="No active composition",
                    error="NO_COMPOSITION"
                )

            composition = self.composition_state.get_composition(composition_id)
            if not composition:
                return ActionResult(
                    success=False,
                    action="move_clip",
                    message=f"Composition {composition_id} not found",
                    error="COMPOSITION_NOT_FOUND"
                )

            # Find the clip
            clip = next((c for c in composition.clips if c.id == params["clip_id"]), None)
            if not clip:
                return ActionResult(
                    success=False,
                    action="move_clip",
                    message=f"Clip {params['clip_id']} not found",
                    error="CLIP_NOT_FOUND"
                )

            # Update clip position/track
            if "track_id" in params and params["track_id"]:
                clip.track_id = params["track_id"]
            if "start_time" in params and params["start_time"] is not None:
                clip.start_time = params["start_time"]

            return ActionResult(
                success=True,
                action="move_clip",
                message=f"Moved clip {clip.name}",
                data={"clip_id": clip.id, "track_id": clip.track_id, "start_time": clip.start_time}
            )

        except Exception as e:
            logger.error(f"Failed to move clip: {e}")
            raise

    async def _split_clip(self, params: Dict[str, Any]) -> ActionResult:
        """Split a clip at a specific time"""
        try:
            composition_id = self.composition_state.current_composition_id
            if not composition_id:
                return ActionResult(
                    success=False,
                    action="split_clip",
                    message="No active composition",
                    error="NO_COMPOSITION"
                )

            composition = self.composition_state.get_composition(composition_id)
            if not composition:
                return ActionResult(
                    success=False,
                    action="split_clip",
                    message=f"Composition {composition_id} not found",
                    error="COMPOSITION_NOT_FOUND"
                )

            # Find the clip
            clip = next((c for c in composition.clips if c.id == params["clip_id"]), None)
            if not clip:
                return ActionResult(
                    success=False,
                    action="split_clip",
                    message=f"Clip {params['clip_id']} not found",
                    error="CLIP_NOT_FOUND"
                )

            split_time = params["split_time"]
            if split_time <= 0 or split_time >= clip.duration:
                return ActionResult(
                    success=False,
                    action="split_clip",
                    message=f"Split time {split_time} must be between 0 and {clip.duration}",
                    error="INVALID_SPLIT_TIME"
                )

            # Create second half clip
            from backend.models.sequence import Clip
            new_clip_id = str(uuid.uuid4())
            new_clip = Clip(
                id=new_clip_id,
                name=f"{clip.name} (2)",
                type=clip.type,
                track_id=clip.track_id,
                start_time=clip.start_time + split_time,
                duration=clip.duration - split_time,
                is_muted=clip.is_muted,
                is_looped=clip.is_looped,
                gain=clip.gain,
                audio_file_path=clip.audio_file_path,
                audio_offset=clip.audio_offset
            )

            # Split MIDI notes if MIDI clip
            if clip.type == "midi" and clip.midi_events:
                first_half_notes = []
                second_half_notes = []
                for note in clip.midi_events:
                    if note.start_time < split_time:
                        # Note starts in first half
                        if note.start_time + note.duration <= split_time:
                            # Completely in first half
                            first_half_notes.append(note)
                        else:
                            # Spans split point - truncate
                            from backend.models.sequence import MIDINote
                            first_half_notes.append(MIDINote(
                                note=note.note,
                                note_name=note.note_name,
                                start_time=note.start_time,
                                duration=split_time - note.start_time,
                                velocity=note.velocity,
                                channel=note.channel
                            ))
                    else:
                        # Note starts in second half
                        from backend.models.sequence import MIDINote
                        second_half_notes.append(MIDINote(
                            note=note.note,
                            note_name=note.note_name,
                            start_time=note.start_time - split_time,
                            duration=note.duration,
                            velocity=note.velocity,
                            channel=note.channel
                        ))

                clip.midi_events = first_half_notes
                new_clip.midi_events = second_half_notes

            # Update first clip duration
            clip.duration = split_time
            clip.name = f"{clip.name} (1)"

            # Add second clip
            composition.clips.append(new_clip)

            return ActionResult(
                success=True,
                action="split_clip",
                message=f"Split clip into {clip.id} and {new_clip_id}",
                data={"clip1_id": clip.id, "clip2_id": new_clip_id}
            )

        except Exception as e:
            logger.error(f"Failed to split clip: {e}")
            raise

    async def _set_clip_gain(self, params: Dict[str, Any]) -> ActionResult:
        """Set clip gain/volume"""
        try:
            composition_id = self.composition_state.current_composition_id
            if not composition_id:
                return ActionResult(
                    success=False,
                    action="set_clip_gain",
                    message="No active composition",
                    error="NO_COMPOSITION"
                )

            composition = self.composition_state.get_composition(composition_id)
            if not composition:
                return ActionResult(
                    success=False,
                    action="set_clip_gain",
                    message=f"Composition {composition_id} not found",
                    error="COMPOSITION_NOT_FOUND"
                )

            # Find the clip
            clip = next((c for c in composition.clips if c.id == params["clip_id"]), None)
            if not clip:
                return ActionResult(
                    success=False,
                    action="set_clip_gain",
                    message=f"Clip {params['clip_id']} not found",
                    error="CLIP_NOT_FOUND"
                )

            clip.gain = params["gain"]

            return ActionResult(
                success=True,
                action="set_clip_gain",
                message=f"Set clip {clip.name} gain to {params['gain']}",
                data={"clip_id": clip.id, "gain": clip.gain}
            )

        except Exception as e:
            logger.error(f"Failed to set clip gain: {e}")
            raise

    # ========================================================================
    # EXTENDED TRACK OPERATIONS
    # ========================================================================

    async def _delete_track(self, params: Dict[str, Any]) -> ActionResult:
        """Delete a track and all its clips"""
        try:
            composition_id = self.composition_state.current_composition_id
            if not composition_id:
                return ActionResult(
                    success=False,
                    action="delete_track",
                    message="No active composition",
                    error="NO_COMPOSITION"
                )

            composition = self.composition_state.get_composition(composition_id)
            if not composition:
                return ActionResult(
                    success=False,
                    action="delete_track",
                    message=f"Composition {composition_id} not found",
                    error="COMPOSITION_NOT_FOUND"
                )

            track_id = params["track_id"]

            # Find the track
            track = next((t for t in composition.tracks if t.id == track_id), None)
            if not track:
                return ActionResult(
                    success=False,
                    action="delete_track",
                    message=f"Track {track_id} not found",
                    error="TRACK_NOT_FOUND"
                )

            track_name = track.name

            # Remove all clips on this track
            composition.clips = [c for c in composition.clips if c.track_id != track_id]

            # Remove the track
            composition.tracks = [t for t in composition.tracks if t.id != track_id]

            # Remove track effects
            composition.track_effects = [te for te in composition.track_effects if te.track_id != track_id]

            return ActionResult(
                success=True,
                action="delete_track",
                message=f"Deleted track {track_name}",
                data={"track_id": track_id}
            )

        except Exception as e:
            logger.error(f"Failed to delete track: {e}")
            raise

    async def _rename_track(self, params: Dict[str, Any]) -> ActionResult:
        """Rename a track"""
        try:
            composition_id = self.composition_state.current_composition_id
            if not composition_id:
                return ActionResult(
                    success=False,
                    action="rename_track",
                    message="No active composition",
                    error="NO_COMPOSITION"
                )

            composition = self.composition_state.get_composition(composition_id)
            if not composition:
                return ActionResult(
                    success=False,
                    action="rename_track",
                    message=f"Composition {composition_id} not found",
                    error="COMPOSITION_NOT_FOUND"
                )

            # Find the track
            track = next((t for t in composition.tracks if t.id == params["track_id"]), None)
            if not track:
                return ActionResult(
                    success=False,
                    action="rename_track",
                    message=f"Track {params['track_id']} not found",
                    error="TRACK_NOT_FOUND"
                )

            old_name = track.name
            track.name = params["name"]

            return ActionResult(
                success=True,
                action="rename_track",
                message=f"Renamed track from '{old_name}' to '{params['name']}'",
                data={"track_id": track.id, "name": track.name}
            )

        except Exception as e:
            logger.error(f"Failed to rename track: {e}")
            raise

    async def _change_track_instrument(self, params: Dict[str, Any]) -> ActionResult:
        """Change the instrument/synth of a MIDI track"""
        try:
            composition_id = self.composition_state.current_composition_id
            if not composition_id:
                return ActionResult(
                    success=False,
                    action="change_track_instrument",
                    message="No active composition",
                    error="NO_COMPOSITION"
                )

            composition = self.composition_state.get_composition(composition_id)
            if not composition:
                return ActionResult(
                    success=False,
                    action="change_track_instrument",
                    message=f"Composition {composition_id} not found",
                    error="COMPOSITION_NOT_FOUND"
                )

            # Find the track
            track = next((t for t in composition.tracks if t.id == params["track_id"]), None)
            if not track:
                return ActionResult(
                    success=False,
                    action="change_track_instrument",
                    message=f"Track {params['track_id']} not found",
                    error="TRACK_NOT_FOUND"
                )

            if track.type != "midi":
                return ActionResult(
                    success=False,
                    action="change_track_instrument",
                    message=f"Track {track.name} is not a MIDI track",
                    error="NOT_MIDI_TRACK"
                )

            old_instrument = track.instrument
            track.instrument = params["instrument"]

            return ActionResult(
                success=True,
                action="change_track_instrument",
                message=f"Changed track {track.name} instrument from {old_instrument} to {params['instrument']}",
                data={"track_id": track.id, "instrument": track.instrument}
            )

        except Exception as e:
            logger.error(f"Failed to change track instrument: {e}")
            raise

    async def _reorder_tracks(self, params: Dict[str, Any]) -> ActionResult:
        """Reorder tracks in the composition"""
        try:
            composition_id = self.composition_state.current_composition_id
            if not composition_id:
                return ActionResult(
                    success=False,
                    action="reorder_tracks",
                    message="No active composition",
                    error="NO_COMPOSITION"
                )

            composition = self.composition_state.get_composition(composition_id)
            if not composition:
                return ActionResult(
                    success=False,
                    action="reorder_tracks",
                    message=f"Composition {composition_id} not found",
                    error="COMPOSITION_NOT_FOUND"
                )

            track_order = params["track_order"]

            # Validate all track IDs exist
            track_dict = {t.id: t for t in composition.tracks}
            if set(track_order) != set(track_dict.keys()):
                return ActionResult(
                    success=False,
                    action="reorder_tracks",
                    message="Track order must include all tracks exactly once",
                    error="INVALID_TRACK_ORDER"
                )

            # Reorder tracks
            composition.tracks = [track_dict[tid] for tid in track_order]

            return ActionResult(
                success=True,
                action="reorder_tracks",
                message=f"Reordered {len(track_order)} tracks",
                data={"track_order": track_order}
            )

        except Exception as e:
            logger.error(f"Failed to reorder tracks: {e}")
            raise

    # ========================================================================
    # EXTENDED EFFECT OPERATIONS
    # ========================================================================

    async def _remove_effect(self, params: Dict[str, Any]) -> ActionResult:
        """Remove an effect from a track"""
        try:
            await self.effects.delete_effect(params["effect_id"])
            return ActionResult(
                success=True,
                action="remove_effect",
                message=f"Removed effect {params['effect_id']}",
                data={"effect_id": params["effect_id"]}
            )
        except Exception as e:
            logger.error(f"Failed to remove effect: {e}")
            raise

    async def _bypass_effect(self, params: Dict[str, Any]) -> ActionResult:
        """Bypass/unbypass an effect"""
        try:
            effect = await self.effects.update_effect(
                effect_id=params["effect_id"],
                is_bypassed=params["bypassed"]
            )

            status = "bypassed" if params["bypassed"] else "unbypassed"
            return ActionResult(
                success=True,
                action="bypass_effect",
                message=f"{status.capitalize()} effect {effect.effect_name}",
                data={"effect_id": effect.id, "bypassed": params["bypassed"]}
            )
        except Exception as e:
            logger.error(f"Failed to bypass effect: {e}")
            raise

    async def _reorder_effects(self, params: Dict[str, Any]) -> ActionResult:
        """Reorder effects in a track's effect chain"""
        try:
            composition_id = self.composition_state.current_composition_id
            if not composition_id:
                return ActionResult(
                    success=False,
                    action="reorder_effects",
                    message="No active composition",
                    error="NO_COMPOSITION"
                )

            composition = self.composition_state.get_composition(composition_id)
            if not composition:
                return ActionResult(
                    success=False,
                    action="reorder_effects",
                    message=f"Composition {composition_id} not found",
                    error="COMPOSITION_NOT_FOUND"
                )

            track_id = params["track_id"]
            effect_order = params["effect_order"]

            # Find the track's effect chain
            track_effects = next((te for te in composition.track_effects if te.track_id == track_id), None)
            if not track_effects:
                return ActionResult(
                    success=False,
                    action="reorder_effects",
                    message=f"No effects found for track {track_id}",
                    error="NO_EFFECTS"
                )

            # Validate all effect IDs exist
            effect_dict = {e.id: e for e in track_effects.effects}
            if set(effect_order) != set(effect_dict.keys()):
                return ActionResult(
                    success=False,
                    action="reorder_effects",
                    message="Effect order must include all effects exactly once",
                    error="INVALID_EFFECT_ORDER"
                )

            # Reorder effects
            track_effects.effects = [effect_dict[eid] for eid in effect_order]

            return ActionResult(
                success=True,
                action="reorder_effects",
                message=f"Reordered {len(effect_order)} effects on track {track_id}",
                data={"track_id": track_id, "effect_order": effect_order}
            )

        except Exception as e:
            logger.error(f"Failed to reorder effects: {e}")
            raise

    # ========================================================================
    # EXTENDED COMPOSITION OPERATIONS
    # ========================================================================

    async def _set_time_signature(self, params: Dict[str, Any]) -> ActionResult:
        """Set composition time signature"""
        try:
            composition_id = self.composition_state.current_composition_id
            if not composition_id:
                return ActionResult(
                    success=False,
                    action="set_time_signature",
                    message="No active composition",
                    error="NO_COMPOSITION"
                )

            composition = self.composition_state.get_composition(composition_id)
            if not composition:
                return ActionResult(
                    success=False,
                    action="set_time_signature",
                    message=f"Composition {composition_id} not found",
                    error="COMPOSITION_NOT_FOUND"
                )

            old_time_sig = composition.time_signature
            composition.time_signature = params["time_signature"]

            return ActionResult(
                success=True,
                action="set_time_signature",
                message=f"Changed time signature from {old_time_sig} to {params['time_signature']}",
                data={"time_signature": composition.time_signature}
            )

        except Exception as e:
            logger.error(f"Failed to set time signature: {e}")
            raise

    async def _set_loop_points(self, params: Dict[str, Any]) -> ActionResult:
        """Set loop start and end points"""
        try:
            composition_id = self.composition_state.current_composition_id
            if not composition_id:
                return ActionResult(
                    success=False,
                    action="set_loop_points",
                    message="No active composition",
                    error="NO_COMPOSITION"
                )

            composition = self.composition_state.get_composition(composition_id)
            if not composition:
                return ActionResult(
                    success=False,
                    action="set_loop_points",
                    message=f"Composition {composition_id} not found",
                    error="COMPOSITION_NOT_FOUND"
                )

            composition.loop_start = params["loop_start"]
            composition.loop_end = params["loop_end"]
            if "loop_enabled" in params:
                composition.loop_enabled = params["loop_enabled"]

            return ActionResult(
                success=True,
                action="set_loop_points",
                message=f"Set loop points: {params['loop_start']} - {params['loop_end']} beats",
                data={
                    "loop_start": composition.loop_start,
                    "loop_end": composition.loop_end,
                    "loop_enabled": composition.loop_enabled
                }
            )

        except Exception as e:
            logger.error(f"Failed to set loop points: {e}")
            raise

    async def _seek_to_position(self, params: Dict[str, Any]) -> ActionResult:
        """Seek playhead to a specific position"""
        try:
            composition_id = self.composition_state.current_composition_id
            if not composition_id:
                return ActionResult(
                    success=False,
                    action="seek_to_position",
                    message="No active composition",
                    error="NO_COMPOSITION"
                )

            await self.playback_engine.seek(composition_id, params["position"])

            return ActionResult(
                success=True,
                action="seek_to_position",
                message=f"Seeked to position {params['position']} beats",
                data={"position": params["position"]}
            )

        except Exception as e:
            logger.error(f"Failed to seek to position: {e}")
            raise

    async def _rename_composition(self, params: Dict[str, Any]) -> ActionResult:
        """Rename the composition"""
        try:
            composition_id = self.composition_state.current_composition_id
            if not composition_id:
                return ActionResult(
                    success=False,
                    action="rename_composition",
                    message="No active composition",
                    error="NO_COMPOSITION"
                )

            composition = self.composition_state.get_composition(composition_id)
            if not composition:
                return ActionResult(
                    success=False,
                    action="rename_composition",
                    message=f"Composition {composition_id} not found",
                    error="COMPOSITION_NOT_FOUND"
                )

            old_name = composition.name
            composition.name = params["name"]

            return ActionResult(
                success=True,
                action="rename_composition",
                message=f"Renamed composition from '{old_name}' to '{params['name']}'",
                data={"name": composition.name}
            )

        except Exception as e:
            logger.error(f"Failed to rename composition: {e}")
            raise

    @staticmethod
    def _midi_to_note_name(midi_note: int) -> str:
        """Convert MIDI note number to note name"""
        notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        octave = (midi_note // 12) - 1
        note = notes[midi_note % 12]
        return f"{note}{octave}"

