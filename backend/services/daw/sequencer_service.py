"""
Sequencer Service - Manages compositions, clips, tracks, and playback

ARCHITECTURE:
- SequencerService stores compositions in memory (self.compositions dict)
- CompositionService handles persistence to disk
- ONE ID: composition_id (no separate sequence_id)
- Composition contains tracks, clips, tempo, time signature, loop settings
"""
import logging
import uuid
import asyncio
import time
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from backend.models.composition import Composition
from backend.models.sequence import (
    Clip,
    SequencerTrack,
    MIDINote,
    AddClipRequest,
    UpdateClipRequest,
)
from backend.models.types import ActiveMIDINote, PlaybackState
from backend.services.audio.buffer_manager_service import BufferManager
from backend.core.engine_manager import AudioEngineManager
from backend.services.websocket import WebSocketManager
from backend.services.audio.bus_manager_service import AudioBusManager
from backend.services.daw.mixer_channel_service import MixerChannelSynthManager

logger = logging.getLogger(__name__)


class SequencerService:
    """
    Manages composition state and playback

    Responsibilities:
    - Store compositions in memory (self.compositions dict)
    - Manage playback state (play/pause/stop/seek)
    - Handle tempo and time signature
    - Coordinate with SuperCollider for audio playback
    - Persistence handled by CompositionService
    """

    def __init__(
        self,
        engine_manager: Optional[AudioEngineManager] = None,
        websocket_manager: Optional[WebSocketManager] = None,
        audio_bus_manager: Optional[AudioBusManager] = None,
        mixer_channel_service: Optional[MixerChannelSynthManager] = None,
        composition_service: Optional['CompositionService'] = None
    ) -> None:
        """Initialize sequencer service"""
        self.engine_manager = engine_manager
        self.websocket_manager = websocket_manager
        self.audio_bus_manager = audio_bus_manager
        self.mixer_channel_service = mixer_channel_service
        self.composition_service = composition_service

        # Buffer manager for sample playback
        self.buffer_manager = BufferManager(engine_manager) if engine_manager else None

        # State storage (in-memory ONLY - persistence handled by CompositionService)
        self.compositions: Dict[str, Composition] = {}  # composition_id -> Composition

        # Global playback state
        self.is_playing = False
        self.is_paused = False
        self.current_composition_id: Optional[str] = None  # Active composition
        self.playhead_position = 0.0  # beats
        self.tempo = 120.0  # BPM

        # Metronome state
        self.metronome_enabled = False
        self.metronome_volume = 0.3
        self.last_metronome_beat = -1

        # Playback task tracking
        self.playback_task: Optional[asyncio.Task] = None
        self.active_synths: Dict[str, int] = {}  # clip_id -> node_id

        # Active MIDI notes (for visual feedback in piano roll)
        self.active_midi_notes: Dict[int, ActiveMIDINote] = {}

        # Callback for composition changes (for AI musical context analysis)
        self.on_composition_changed: Optional[callable] = None

        logger.info("✅ SequencerService initialized")

    # ========================================================================
    # COMPOSITION MANAGEMENT
    # ========================================================================

    def create_composition(self, name: str, tempo: float = 120.0, time_signature: str = "4/4") -> Composition:
        """
        Create a new composition

        NOTE: This is typically called by the compositions API, not directly.
        The API handles persistence via CompositionService.
        """
        composition_id = str(uuid.uuid4())
        composition = Composition(
            id=composition_id,
            name=name,
            tempo=tempo,
            time_signature=time_signature,
            tracks=[],
            clips=[],
            is_playing=False,
            current_position=0.0,
            loop_enabled=False,
            loop_start=0.0,
            loop_end=16.0,
        )
        self.compositions[composition_id] = composition
        logger.info(f"✅ Created composition: {name} (ID: {composition_id})")
        return composition

    def get_composition(self, composition_id: str) -> Optional[Composition]:
        """Get composition by ID"""
        return self.compositions.get(composition_id)

    def get_all_compositions(self) -> List[Composition]:
        """Get all compositions"""
        return list(self.compositions.values())

    def delete_composition(self, composition_id: str) -> bool:
        """Delete composition from memory"""
        if composition_id in self.compositions:
            del self.compositions[composition_id]
            if self.current_composition_id == composition_id:
                self.current_composition_id = None
            logger.info(f"🗑️ Deleted composition: {composition_id}")
            return True
        return False




    # ========================================================================
    # TRACK MANAGEMENT
    # ========================================================================

    def create_track(
        self,
        composition_id: str,
        name: str,
        track_type: str = "sample",
        color: str = "#3b82f6",
        sample_id: Optional[str] = None,
        sample_name: Optional[str] = None,
        sample_file_path: Optional[str] = None,
        instrument: Optional[str] = None
    ) -> Optional[SequencerTrack]:
        """Create a new track in a composition"""
        composition = self.compositions.get(composition_id)
        if not composition:
            logger.error(f"❌ Composition {composition_id} not found")
            return None

        track_id = str(uuid.uuid4())
        track = SequencerTrack(
            id=track_id,
            name=name,
            sequence_id=composition_id,  # For backwards compatibility with track model
            type=track_type,
            color=color,
            is_muted=False,
            is_solo=False,
            is_armed=False,
            volume=1.0,
            pan=0.0,
            sample_id=sample_id,
            sample_name=sample_name,
            sample_file_path=sample_file_path,
            instrument=instrument
        )

        # Add track to composition
        composition.tracks.append(track)
        composition.updated_at = datetime.now()

        logger.info(f"✅ Created track: {name} (ID: {track_id}) in composition {composition_id}")
        return track

    def get_tracks(self, composition_id: Optional[str] = None) -> List[SequencerTrack]:
        """Get all tracks, optionally filtered by composition"""
        if composition_id:
            composition = self.compositions.get(composition_id)
            return composition.tracks if composition else []

        # Return all tracks from all compositions
        all_tracks = []
        for composition in self.compositions.values():
            all_tracks.extend(composition.tracks)
        return all_tracks

    def get_track(self, track_id: str) -> Optional[SequencerTrack]:
        """Get track by ID (searches all compositions)"""
        for composition in self.compositions.values():
            for track in composition.tracks:
                if track.id == track_id:
                    return track
        return None

    def delete_track(self, track_id: str) -> bool:
        """Delete track from its composition"""
        for composition in self.compositions.values():
            for i, track in enumerate(composition.tracks):
                if track.id == track_id:
                    # Delete all clips on this track
                    composition.clips = [c for c in composition.clips if c.track_id != track_id]
                    # Delete the track
                    composition.tracks.pop(i)
                    composition.updated_at = datetime.now()
                    logger.info(f"🗑️ Deleted track: {track_id}")
                    return True
        return False

    def update_sample_references(self, sample_id: str, new_name: str) -> int:
        """Update sample references across all tracks"""
        count = 0
        for composition in self.compositions.values():
            for track in composition.tracks:
                if hasattr(track, 'sample_id') and track.sample_id == sample_id:
                    track.sample_name = new_name
                    count += 1
        if count > 0:
            logger.info(f"📝 Updated {count} sample references for sample {sample_id}")
        return count

    def check_sample_in_use(self, sample_id: str) -> Tuple[bool, List[str]]:
        """Check if sample is used in any tracks"""
        track_names = []
        for composition in self.compositions.values():
            for track in composition.tracks:
                if hasattr(track, 'sample_id') and track.sample_id == sample_id:
                    track_names.append(f"{track.name} (in {composition.name})")
        return len(track_names) > 0, track_names


    # ========================================================================
    # CLIP MANAGEMENT
    # ========================================================================

    def add_clip(self, composition_id: str, request: AddClipRequest) -> Optional[Clip]:
        """Add a clip to a composition"""
        composition = self.compositions.get(composition_id)
        if not composition:
            logger.error(f"❌ Composition {composition_id} not found")
            return None

        clip_id = str(uuid.uuid4())
        clip = Clip(
            id=clip_id,
            name=request.name or f"{request.clip_type.upper()} Clip",
            type=request.clip_type,
            track_id=request.track_id,
            start_time=request.start_time,
            duration=request.duration,
            is_muted=False,
            is_looped=False,
            gain=1.0,
            midi_events=request.midi_events if request.clip_type == "midi" else None,
            audio_file_path=request.audio_file_path if request.clip_type == "audio" else None,
            audio_offset=0.0 if request.clip_type == "audio" else None,
        )

        composition.clips.append(clip)
        composition.updated_at = datetime.now()

        logger.info(f"✅ Added {request.clip_type} clip to composition {composition_id}")
        return clip

    def get_clips(self, composition_id: str) -> Optional[List[Clip]]:
        """Get all clips in a composition"""
        composition = self.compositions.get(composition_id)
        return composition.clips if composition else None

    def update_clip(
        self,
        composition_id: str,
        clip_id: str,
        request: UpdateClipRequest
    ) -> Optional[Clip]:
        """Update a clip"""
        composition = self.compositions.get(composition_id)
        if not composition:
            return None

        for clip in composition.clips:
            if clip.id == clip_id:
                if request.name is not None:
                    clip.name = request.name
                if request.start_time is not None:
                    clip.start_time = request.start_time
                if request.duration is not None:
                    clip.duration = request.duration
                if request.is_muted is not None:
                    clip.is_muted = request.is_muted
                if request.is_looped is not None:
                    clip.is_looped = request.is_looped
                if request.gain is not None:
                    clip.gain = request.gain
                if request.midi_events is not None:
                    clip.midi_events = request.midi_events

                composition.updated_at = datetime.now()
                logger.info(f"📝 Updated clip {clip_id}")
                return clip

        return None

    def delete_clip(self, composition_id: str, clip_id: str) -> bool:
        """Delete a clip"""
        composition = self.compositions.get(composition_id)
        if not composition:
            return False

        for i, clip in enumerate(composition.clips):
            if clip.id == clip_id:
                composition.clips.pop(i)
                composition.updated_at = datetime.now()
                logger.info(f"🗑️ Deleted clip {clip_id}")
                return True

        return False

    def duplicate_clip(self, composition_id: str, clip_id: str) -> Optional[Clip]:
        """Duplicate a clip"""
        composition = self.compositions.get(composition_id)
        if not composition:
            return None

        for clip in composition.clips:
            if clip.id == clip_id:
                new_clip_id = str(uuid.uuid4())
                new_clip = clip.model_copy(update={
                    "id": new_clip_id,
                    "name": f"{clip.name} (Copy)",
                    "start_time": clip.start_time + clip.duration  # Place after original
                })
                composition.clips.append(new_clip)
                composition.updated_at = datetime.now()
                logger.info(f"📋 Duplicated clip {clip_id} -> {new_clip_id}")
                return new_clip

        return None


    # ========================================================================
    # PLAYBACK CONTROL
    # ========================================================================

    async def play_composition(self, composition_id: str, position: float = 0.0):
        """Start playing a composition"""
        composition = self.compositions.get(composition_id)
        if not composition:
            raise ValueError(f"Composition {composition_id} not found")

        # If loop is enabled and starting from position 0, start from loop_start instead
        if composition.loop_enabled and position == 0.0:
            position = composition.loop_start
            logger.info(f"🔁 Loop enabled - starting from loop_start: {position} beats")

        logger.info(f"▶️  Starting playback for composition '{composition.name}' (ID: {composition_id})")
        logger.info(f"   Tracks: {len(composition.tracks)}, Clips: {len(composition.clips)}")
        logger.info(f"   Tempo: {composition.tempo} BPM, Position: {position} beats")
        logger.info(f"   Loop: {'enabled' if composition.loop_enabled else 'disabled'} ({composition.loop_start} - {composition.loop_end} beats)")

        self.current_composition_id = composition_id
        self.is_playing = True
        self.is_paused = False
        self.playhead_position = position
        self.tempo = composition.tempo

        composition.is_playing = True
        composition.current_position = position

        # Start playback loop task
        self.playback_task = asyncio.create_task(self._playback_loop())
        logger.info("✅ Playback started successfully")

    async def _playback_loop(self) -> None:
        """Background task that advances playhead and triggers clips"""
        if not self.current_composition_id:
            logger.error("❌ Playback loop: No current_composition_id!")
            return

        composition = self.compositions.get(self.current_composition_id)
        if not composition:
            logger.error(f"❌ Playback loop: Composition {self.current_composition_id} not found!")
            return

        logger.info(f"🎵 Starting playback loop for composition {composition.name}")
        logger.info(f"   Tempo: {self.tempo} BPM, WebSocket: {'connected' if self.websocket_manager else 'not available'}")
        logger.info(f"   WebSocket has {len(self.websocket_manager.transport_clients) if self.websocket_manager else 0} connected clients")

        # Calculate time per beat in seconds
        beat_duration = 60.0 / self.tempo  # seconds per beat
        update_interval = 0.02  # 50 Hz update rate (20ms)
        beats_per_update = (update_interval / beat_duration)

        last_time = time.time()
        loop_count = 0

        try:
            logger.info("🔄 Entering playback loop...")
            while self.is_playing:
                loop_count += 1

                # Log every 50 iterations (once per second at 50Hz)
                if loop_count % 50 == 0:
                    logger.info(f"🔄 Playback loop running: position={self.playhead_position:.2f} beats, is_playing={self.is_playing}")

                current_time = time.time()
                delta_time = current_time - last_time
                last_time = current_time

                # Advance playhead
                delta_beats = (delta_time / beat_duration)
                self.playhead_position += delta_beats

                # Handle loop region: if loop is enabled and we've passed loop_end, jump back to loop_start
                if composition.loop_enabled and self.playhead_position >= composition.loop_end:
                    # Free all active synths before looping back
                    if self.engine_manager:
                        for clip_id, node_id in list(self.active_synths.items()):
                            self.engine_manager.send_message("/n_free", node_id)
                        self.active_synths.clear()

                    # Jump back to loop start
                    self.playhead_position = composition.loop_start
                    logger.info(f"🔁 Looping back: {composition.loop_end:.2f} → {composition.loop_start:.2f} beats")

                # Update composition position
                composition.current_position = self.playhead_position

                # Check for clips that need to be triggered
                await self._check_and_trigger_clips(composition, self.playhead_position)

                # Trigger metronome on every beat if enabled
                if self.metronome_enabled and self.engine_manager:
                    current_beat = int(self.playhead_position)
                    if current_beat != self.last_metronome_beat:
                        self.last_metronome_beat = current_beat
                        # Parse time signature to determine accent (downbeat)
                        time_sig_parts = composition.time_signature.split("/")
                        time_sig_num = int(time_sig_parts[0]) if len(time_sig_parts) > 0 else 4
                        # Accent on first beat of measure
                        beat_in_measure = current_beat % time_sig_num
                        accent = 1 if beat_in_measure == 0 else 0
                        # Trigger metronome click
                        node_id = self.engine_manager.allocate_node_id()
                        self.engine_manager.send_message(
                            "/s_new",
                            "metronome",
                            node_id,
                            0,  # addAction
                            1,  # target
                            "freq", 1000,
                            "amp", self.metronome_volume,
                            "accent", accent
                        )

                # Send position update to frontend via WebSocket
                if self.websocket_manager:
                    # Parse time signature (e.g., "4/4" -> num=4, den=4)
                    time_sig_parts = composition.time_signature.split("/")
                    time_sig_num = int(time_sig_parts[0]) if len(time_sig_parts) > 0 else 4
                    time_sig_den = int(time_sig_parts[1]) if len(time_sig_parts) > 1 else 4

                    # Build active notes list for visual feedback
                    active_notes_list = [
                        {"clip_id": note_data["clip_id"], "note": note_data["note"]}
                        for note_data in self.active_midi_notes.values()
                    ]

                    transport_data = {
                        "type": "transport",
                        "is_playing": self.is_playing,
                        "position_beats": self.playhead_position,
                        "position_seconds": self.playhead_position * (60.0 / self.tempo),
                        "tempo": self.tempo,
                        "time_signature_num": time_sig_num,
                        "time_signature_den": time_sig_den,
                        "loop_enabled": composition.loop_enabled,
                        "loop_start": composition.loop_start,
                        "loop_end": composition.loop_end,
                        "metronome_enabled": self.metronome_enabled,
                        "active_notes": active_notes_list,
                    }
                    if loop_count == 1:
                        logger.info(f"📡 Broadcasting first transport update: {transport_data}")
                    await self.websocket_manager.broadcast_transport(transport_data)

                # Sleep until next update
                await asyncio.sleep(update_interval)

            logger.info(f"🛑 Playback loop exited: is_playing={self.is_playing}, loop_count={loop_count}")

        except asyncio.CancelledError:
            logger.info("🛑 Playback loop cancelled")
            raise
        except Exception as e:
            logger.error(f"❌ Error in playback loop: {e}", exc_info=True)
            self.is_playing = False

    async def _check_and_trigger_clips(self, composition: Composition, position: float) -> None:
        """
        Check if any clips should be triggered at the current position

        Args:
            composition: Composition being played
            position: Current playhead position in beats
        """
        # First, stop any clips that are playing but shouldn't be (playhead moved outside their range)
        clips_to_stop = []
        for clip_id, node_id in list(self.active_synths.items()):
            # Find the clip
            clip = next((c for c in composition.clips if c.id == clip_id), None)
            if clip:
                clip_start = clip.start_time
                clip_end = clip.start_time + clip.duration

                # If playhead is outside clip range, stop it
                if not (clip_start <= position < clip_end):
                    clips_to_stop.append((clip_id, node_id))

        # Stop clips that are out of range
        for clip_id, node_id in clips_to_stop:
            logger.info(f"🛑 Stopping clip {clip_id} (node {node_id}) - playhead outside range")
            if self.engine_manager:
                self.engine_manager.send_message("/n_free", node_id)
            del self.active_synths[clip_id]

        # Now check for clips that should start playing
        for clip in composition.clips:
            # Skip muted clips
            if clip.is_muted:
                continue

            # Find the track for this clip
            track = next((t for t in composition.tracks if t.id == clip.track_id), None)
            if not track:
                logger.warning(f"⚠️ Clip {clip.id} has no matching track (track_id: {clip.track_id})")
                continue

            # Skip if track is muted
            if track.is_muted:
                continue

            # Check if clip should start playing
            clip_start = clip.start_time
            clip_end = clip.start_time + clip.duration

            # Check if playhead is within clip range
            if clip_start <= position < clip_end:
                # Check if this clip is already playing
                if clip.id not in self.active_synths:
                    # Calculate offset within the clip
                    offset = position - clip_start
                    logger.info(f"🎯 Triggering clip {clip.id} at position {position:.2f} (clip range: {clip_start:.2f}-{clip_end:.2f})")
                    await self._trigger_clip(clip, track, offset)

    async def _trigger_clip(self, clip: Clip, track: SequencerTrack, offset: float = 0.0) -> None:
        """
        Trigger a clip to start playing

        Args:
            clip: Clip to trigger
            track: Track containing the clip
            offset: Offset within the clip in beats
        """
        from pathlib import Path

        if not self.engine_manager or not self.buffer_manager:
            logger.warning("⚠️ Cannot trigger clip: engine_manager or buffer_manager not available")
            return

        try:
            # Handle sample-based clips (track has sample reference)
            if track.type == "sample" and track.sample_id:
                # Load sample into buffer if not already loaded
                sample_id = track.sample_id or track.id
                logger.info(f"🔍 Looking for sample: {sample_id}")

                # Resolve sample file path
                sample_path = None

                # If sample_file_path is set and exists, use it
                if track.sample_file_path:
                    potential_path = Path(track.sample_file_path)
                    logger.info(f"   Checking track.sample_file_path: {potential_path}")
                    if potential_path.exists():
                        sample_path = potential_path
                        logger.info(f"   ✅ Found at: {sample_path}")

                # If not found, search in data/samples/ directory
                if not sample_path:
                    # Go from backend/services/daw/sequencer_service.py -> backend/services/daw -> backend/services -> backend -> project_root
                    samples_dir = Path(__file__).parent.parent.parent / "data" / "samples"
                    logger.info(f"   Searching in: {samples_dir}")

                    # Try to find the file with any extension
                    for ext in ['.webm', '.wav', '.mp3', '.ogg', '.flac']:
                        potential_path = samples_dir / f"{sample_id}{ext}"
                        logger.info(f"   Trying: {potential_path}")
                        if potential_path.exists():
                            sample_path = potential_path
                            logger.info(f"   ✅ Found: {sample_path}")
                            break

                if not sample_path:
                    logger.error(f"❌ Sample file not found for track sample ID: {sample_id}")
                    logger.error(f"   Searched in: {samples_dir}")
                    logger.error(f"   track.sample_file_path was: {track.sample_file_path}")
                    return

                buffer_num = await self.buffer_manager.load_sample(sample_id, str(sample_path))

                # Allocate node ID for the synth
                node_id = self.engine_manager.allocate_node_id()

                # Get or allocate audio bus for this track
                track_bus = 0  # Default to master bus
                if self.audio_bus_manager and self.mixer_channel_service:
                    track_bus = self.audio_bus_manager.get_track_bus(track.id)
                    if track_bus is None:
                        # Allocate bus and create mixer channel for this track
                        track_bus = self.audio_bus_manager.allocate_track_bus(track.id)
                        await self.mixer_channel_service.create_mixer_channel(
                            track_id=track.id,
                            volume=track.volume,
                            pan=track.pan,
                            mute=track.is_muted,
                            solo=track.is_solo
                        )
                        logger.info(f"🎚️ Created mixer channel for track {track.id} on bus {track_bus}")

                # Calculate playback parameters
                # Add audio_offset to the start position (trim the sample)
                start_pos = (offset + (clip.audio_offset or 0.0)) / clip.duration if clip.duration > 0 else 0.0
                loop_enabled = 1 if clip.is_looped else 0

                # Send /s_new message to create samplePlayer synth
                self.engine_manager.send_message(
                    "/s_new",
                    "samplePlayer",  # synthdef name
                    node_id,
                    0,  # addAction (0 = add to head)
                    1,  # target (1 = default group)
                    "bufnum", buffer_num,
                    "rate", 1.0,
                    "amp", 0.8 * clip.gain,  # Apply clip gain only (track volume handled by mixer)
                    "pan", 0.0,  # Pan handled by mixer channel
                    "startPos", start_pos,
                    "loop", loop_enabled,
                    "gate", 1,
                    "out", track_bus  # Route to track bus
                )

                # Track active synth
                self.active_synths[clip.id] = node_id

                logger.info(f"🎵 Triggered sample clip {clip.id} (node {node_id}, buffer {buffer_num}, sample: {track.sample_name})")
                logger.info(f"   Volume: track={track.volume:.2f}, clip_gain={clip.gain:.2f}, final_amp={0.8 * clip.gain * track.volume:.2f}")
                logger.info(f"   Pan: {track.pan:.2f}")

            # Handle audio clips (clip has audio file reference)
            elif clip.type == "audio" and clip.audio_file_path:
                # Resolve audio file path
                audio_file_path = clip.audio_file_path
                audio_path = None

                # If it's just a sample ID (UUID), construct path to data/samples/
                if not audio_file_path.endswith(('.wav', '.mp3', '.webm', '.ogg', '.flac')):
                    # Assume it's a sample ID, construct full path
                    # Go from backend/services/daw/sequencer_service.py -> backend/services/daw -> backend/services -> backend -> project_root
                    samples_dir = Path(__file__).parent.parent.parent / "data" / "samples"

                    # Try to find the file with any extension
                    for ext in ['.webm', '.wav', '.mp3', '.ogg', '.flac']:
                        potential_path = samples_dir / f"{audio_file_path}{ext}"
                        if potential_path.exists():
                            audio_path = potential_path
                            break

                    if not audio_path:
                        logger.error(f"❌ Sample file not found for ID: {audio_file_path}")
                        return
                else:
                    # It's already a path, resolve it
                    audio_path = Path(audio_file_path)
                    if not audio_path.is_absolute():
                        # Make it relative to project root
                        audio_path = Path(__file__).parent.parent.parent / audio_path

                buffer_num = await self.buffer_manager.load_sample(clip.id, str(audio_path))

                # Allocate node ID for the synth
                node_id = self.engine_manager.allocate_node_id()

                # Get or allocate audio bus for this track
                track_bus = 0  # Default to master bus
                if self.audio_bus_manager and self.mixer_channel_service:
                    track_bus = self.audio_bus_manager.get_track_bus(track.id)
                    if track_bus is None:
                        # Allocate bus and create mixer channel for this track
                        track_bus = self.audio_bus_manager.allocate_track_bus(track.id)
                        await self.mixer_channel_service.create_mixer_channel(
                            track_id=track.id,
                            volume=track.volume,
                            pan=track.pan,
                            mute=track.is_muted,
                            solo=track.is_solo
                        )
                        logger.info(f"🎚️ Created mixer channel for track {track.id} on bus {track_bus}")

                # Calculate playback parameters
                start_pos = (offset + (clip.audio_offset or 0.0)) / clip.duration if clip.duration > 0 else 0.0
                loop_enabled = 1 if clip.is_looped else 0

                # Send /s_new message to create samplePlayer synth
                self.engine_manager.send_message(
                    "/s_new",
                    "samplePlayer",  # synthdef name
                    node_id,
                    0,  # addAction (0 = add to head)
                    1,  # target (1 = default group)
                    "bufnum", buffer_num,
                    "rate", 1.0,
                    "amp", 0.8 * clip.gain,  # Apply clip gain only (track volume handled by mixer)
                    "pan", 0.0,  # Pan handled by mixer channel
                    "startPos", start_pos,
                    "loop", loop_enabled,
                    "gate", 1,
                    "out", track_bus  # Route to track bus
                )

                # Track active synth
                self.active_synths[clip.id] = node_id

                logger.info(f"🎵 Triggered audio clip {clip.id} (node {node_id}, buffer {buffer_num})")
                logger.info(f"   Volume: track={track.volume:.2f}, clip_gain={clip.gain:.2f}, final_amp={0.8 * clip.gain * track.volume:.2f}")
                logger.info(f"   Pan: {track.pan:.2f}")

            # Handle MIDI clips
            elif clip.type == "midi" and clip.midi_events:
                logger.info(f"🎹 MIDI CLIP TRIGGERED:")
                logger.info(f"   Clip ID: {clip.id}")
                logger.info(f"   Clip type: {clip.type}")
                logger.info(f"   MIDI events count: {len(clip.midi_events)}")
                logger.info(f"   Offset: {offset:.2f} beats")

                # Get instrument synthdef from track
                synthdef = track.instrument or "sine"
                logger.info(f"   Instrument: {synthdef}")

                # Get or allocate audio bus for this track
                track_bus = 0  # Default to master bus
                if self.audio_bus_manager and self.mixer_channel_service:
                    track_bus = self.audio_bus_manager.get_track_bus(track.id)
                    if track_bus is None:
                        # Allocate bus and create mixer channel for this track
                        track_bus = self.audio_bus_manager.allocate_track_bus(track.id)
                        await self.mixer_channel_service.create_mixer_channel(
                            track_id=track.id,
                            volume=track.volume,
                            pan=track.pan,
                            mute=track.is_muted,
                            solo=track.is_solo
                        )
                        logger.info(f"🎚️ Created mixer channel for track {track.id} on bus {track_bus}")

                # Trigger each MIDI note with scheduled start time
                triggered_count = 0
                for note in clip.midi_events:
                    logger.info(f"   Checking note: {note.note_name} (start={note.start_time:.2f}, duration={note.duration:.2f}, end={note.start_time + note.duration:.2f})")

                    # Calculate when this note should start relative to now
                    # If offset is 6.0 and note starts at 1.0, we've already passed it - skip
                    # If offset is 6.0 and note starts at 8.0, schedule it for 2.0 beats from now
                    if note.start_time >= offset:
                        # Note hasn't started yet - schedule it
                        delay_beats = note.start_time - offset
                        delay_seconds = delay_beats * (60.0 / self.tempo)

                        node_id = self.engine_manager.allocate_node_id()

                        # Convert MIDI note to frequency
                        freq = 440.0 * (2.0 ** ((note.note - 69) / 12.0))

                        # Calculate amplitude (apply velocity and clip gain only - track volume handled by mixer)
                        amp = note.velocity / 127.0 * 0.8 * clip.gain

                        triggered_count += 1
                        logger.info(f"      ✅ SCHEDULED! node={node_id}, freq={freq:.2f}Hz, amp={amp:.2f}, delay={delay_seconds:.2f}s, bus={track_bus}")

                        # Schedule note start and release
                        async def play_note(nid, freq_val, amp_val, synth, delay, dur_beats, note_pitch, clip_id_val, out_bus):
                            await asyncio.sleep(delay)
                            if self.engine_manager:
                                # Start the note
                                self.engine_manager.send_message(
                                    "/s_new",
                                    synth,
                                    nid,
                                    0,  # addAction
                                    1,  # target
                                    "freq", freq_val,
                                    "amp", amp_val,
                                    "gate", 1,
                                    "out", out_bus  # Route to track bus
                                )
                                # Track active note for visual feedback
                                self.active_midi_notes[nid] = {
                                    "clip_id": clip_id_val,
                                    "note": note_pitch,
                                    "start_time": time.time()
                                }
                                # Schedule release
                                note_duration = dur_beats * (60.0 / self.tempo)
                                await asyncio.sleep(note_duration)
                                self.engine_manager.send_message("/n_set", nid, "gate", 0)
                                # Remove from active notes
                                if nid in self.active_midi_notes:
                                    del self.active_midi_notes[nid]
                                logger.debug(f"🔇 Released MIDI note {nid}")

                        asyncio.create_task(play_note(node_id, freq, amp, synthdef, delay_seconds, note.duration, note.note, clip.id, track_bus))
                    else:
                        logger.info(f"      ❌ SKIPPED (note already passed: offset={offset:.2f}, note_start={note.start_time:.2f})")

                logger.info(f"   Total notes scheduled: {triggered_count}/{len(clip.midi_events)}")

                # Track that this MIDI clip is active (for stopping when playhead leaves clip range)
                self.active_synths[clip.id] = self.engine_manager.allocate_node_id()  # Dummy node ID for tracking

        except Exception as e:
            logger.error(f"❌ Failed to trigger clip {clip.id}: {e}")




    async def stop_playback(self):
        """Stop playback"""
        if self.current_composition_id:
            composition = self.compositions.get(self.current_composition_id)
            if composition:
                composition.is_playing = False
                composition.current_position = 0.0

        self.is_playing = False
        self.is_paused = False
        self.playhead_position = 0.0

        # Cancel playback loop
        if self.playback_task:
            self.playback_task.cancel()
            try:
                await self.playback_task
            except asyncio.CancelledError:
                pass
            self.playback_task = None

        # Stop all active synths
        if self.engine_manager:
            for node_id in self.active_synths.values():
                self.engine_manager.send_message("/n_free", node_id)
        self.active_synths.clear()

        logger.info("⏹️  Stopped playback")

    async def pause_playback(self):
        """Pause playback"""
        if self.is_playing:
            self.is_playing = False
            self.is_paused = True

            # Cancel playback loop (but keep position)
            if self.playback_task:
                self.playback_task.cancel()
                try:
                    await self.playback_task
                except asyncio.CancelledError:
                    pass
                self.playback_task = None

            # Stop all active synths
            if self.engine_manager:
                for node_id in self.active_synths.values():
                    self.engine_manager.send_message("/n_free", node_id)
            self.active_synths.clear()

            logger.info("⏸️  Paused playback")

    async def seek(self, position: float, trigger_audio: bool = True):
        """Seek to position"""
        self.playhead_position = position
        if self.current_composition_id:
            composition = self.compositions.get(self.current_composition_id)
            if composition:
                composition.current_position = position

        logger.info(f"⏩ Seek to position: {position:.2f} beats")

    def get_playback_state(self) -> PlaybackState:
        """Get current playback state"""
        return {
            "is_playing": self.is_playing,
            "current_sequence": self.current_composition_id,  # Keep key name for backwards compatibility
            "playhead_position": self.playhead_position,
            "tempo": self.tempo,
            "is_paused": self.is_paused,
            "metronome_enabled": self.metronome_enabled
        }

    # ========================================================================
    # METRONOME
    # ========================================================================

    def toggle_metronome(self) -> bool:
        """Toggle metronome on/off"""
        self.metronome_enabled = not self.metronome_enabled
        logger.info(f"🎵 Metronome {'enabled' if self.metronome_enabled else 'disabled'}")
        return self.metronome_enabled

    def set_metronome_volume(self, volume: float) -> None:
        """Set metronome volume (0.0 to 1.0)"""
        self.metronome_volume = max(0.0, min(1.0, volume))
        logger.info(f"🔊 Metronome volume set to {self.metronome_volume:.2f}")
