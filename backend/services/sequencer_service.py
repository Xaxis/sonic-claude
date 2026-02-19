"""
Sequencer Service - Manages sequences, clips, tracks, and playback
"""
import logging
import uuid
import asyncio
import time
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from pathlib import Path

from backend.models.sequence import (
    Sequence,
    Clip,
    SequencerTrack,
    MIDINote,
    CreateSequenceRequest,
    AddClipRequest,
    UpdateClipRequest,
)
from backend.models.types import ActiveMIDINote, PlaybackState
from backend.services.sequence_storage import SequenceStorage
from backend.services.buffer_manager import BufferManager
from backend.core.engine_manager import AudioEngineManager
from backend.services.websocket_manager import WebSocketManager
from backend.services.audio_bus_manager import AudioBusManager
from backend.services.mixer_channel_service import MixerChannelService

logger = logging.getLogger(__name__)


class SequencerService:
    """
    Manages sequencer state and playback

    Responsibilities:
    - Store sequences, clips, and tracks
    - Manage playback state (play/pause/stop/seek)
    - Handle tempo and time signature
    - Coordinate with SuperCollider for audio playback
    - Persist sequences to disk with autosave and versioning
    """

    def __init__(
        self,
        engine_manager: Optional[AudioEngineManager] = None,
        websocket_manager: Optional[WebSocketManager] = None,
        audio_bus_manager: Optional[AudioBusManager] = None,
        mixer_channel_service: Optional[MixerChannelService] = None
    ) -> None:
        """
        Initialize sequencer service

        Args:
            engine_manager: Audio engine manager for OSC communication
            websocket_manager: WebSocket manager for real-time updates
            audio_bus_manager: Audio bus manager for track routing
            mixer_channel_service: Mixer channel service for per-track metering
        """
        self.engine_manager = engine_manager
        self.websocket_manager = websocket_manager
        self.audio_bus_manager = audio_bus_manager
        self.mixer_channel_service = mixer_channel_service

        # Persistent storage
        self.storage = SequenceStorage()

        # Buffer manager for sample playback
        self.buffer_manager = BufferManager(engine_manager) if engine_manager else None

        # State storage (in-memory cache)
        self.sequences: Dict[str, Sequence] = {}
        self.tracks: Dict[str, SequencerTrack] = {}

        # Global playback state
        self.is_playing = False
        self.is_paused = False
        self.current_sequence_id: Optional[str] = None
        self.playhead_position = 0.0  # beats
        self.tempo = 120.0  # BPM

        # Metronome state
        self.metronome_enabled = False
        self.metronome_volume = 0.3
        self.last_metronome_beat = -1  # Track last beat we triggered metronome on

        # Playback task tracking
        self.playback_task: Optional[asyncio.Task] = None
        self.active_synths: Dict[str, int] = {}  # clip_id -> node_id

        # Active MIDI notes (for visual feedback in piano roll)
        self.active_midi_notes: Dict[int, ActiveMIDINote] = {}

        # Callback for MIDI content changes (for AI musical context analysis)
        self.on_sequence_changed: Optional[callable] = None

        # Load sequences from disk
        self._load_sequences_from_disk()

        logger.info("✅ SequencerService initialized")

    def _load_sequences_from_disk(self) -> None:
        """Load all sequences from persistent storage"""
        try:
            sequences = self.storage.load_all_sequences()
            for sequence in sequences:
                # Migration: Add sequence_id to tracks if missing
                for track in sequence.tracks:
                    if not hasattr(track, 'sequence_id') or track.sequence_id is None:
                        track.sequence_id = sequence.id
                        logger.info(f"🔄 Migrated track {track.id} to include sequence_id")

                self.sequences[sequence.id] = sequence
                # Also populate global tracks dict for backwards compatibility
                for track in sequence.tracks:
                    self.tracks[track.id] = track

                # Save migrated sequence
                if any(not hasattr(t, 'sequence_id') or t.sequence_id is None for t in sequence.tracks):
                    self.storage.save_sequence(sequence)

            logger.info(f"✅ Loaded {len(sequences)} sequences from disk")
        except Exception as e:
            logger.error(f"❌ Failed to load sequences from disk: {e}")

    # ========================================================================
    # PLAYBACK ENGINE
    # ========================================================================

    async def _playback_loop(self) -> None:
        """Background task that advances playhead and triggers clips"""
        if not self.current_sequence_id:
            logger.error("❌ Playback loop: No current_sequence_id!")
            return

        sequence = self.sequences.get(self.current_sequence_id)
        if not sequence:
            logger.error(f"❌ Playback loop: Sequence {self.current_sequence_id} not found!")
            return

        logger.info(f"🎵 Starting playback loop for sequence {sequence.name}")
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
                if sequence.loop_enabled and self.playhead_position >= sequence.loop_end:
                    # Free all active synths before looping back
                    if self.engine_manager:
                        for clip_id, node_id in list(self.active_synths.items()):
                            self.engine_manager.send_message("/n_free", node_id)
                        self.active_synths.clear()

                    # Jump back to loop start
                    self.playhead_position = sequence.loop_start
                    logger.info(f"🔁 Looping back: {sequence.loop_end:.2f} → {sequence.loop_start:.2f} beats")

                # Update sequence position
                sequence.current_position = self.playhead_position

                # Check for clips that need to be triggered
                await self._check_and_trigger_clips(sequence, self.playhead_position)

                # Trigger metronome on every beat if enabled
                if self.metronome_enabled and self.engine_manager:
                    current_beat = int(self.playhead_position)
                    if current_beat != self.last_metronome_beat:
                        self.last_metronome_beat = current_beat
                        # Parse time signature to determine accent (downbeat)
                        time_sig_parts = sequence.time_signature.split("/")
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
                    time_sig_parts = sequence.time_signature.split("/")
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
                        "loop_enabled": sequence.loop_enabled,
                        "loop_start": sequence.loop_start,
                        "loop_end": sequence.loop_end,
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

    async def _check_and_trigger_clips(self, sequence: Sequence, position: float) -> None:
        """
        Check if any clips should be triggered at the current position

        Args:
            sequence: Sequence being played
            position: Current playhead position in beats
        """
        # First, stop any clips that are playing but shouldn't be (playhead moved outside their range)
        clips_to_stop = []
        for clip_id, node_id in list(self.active_synths.items()):
            # Find the clip
            clip = next((c for c in sequence.clips if c.id == clip_id), None)
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
        for clip in sequence.clips:
            # Skip muted clips
            if clip.is_muted:
                continue

            # Find the track for this clip
            track = next((t for t in sequence.tracks if t.id == clip.track_id), None)
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
                    # Go from backend/services/sequencer_service.py -> backend/services -> backend -> project_root
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
                    # Go from backend/services/sequencer_service.py -> backend/services -> backend -> project_root
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

    # ========================================================================
    # SEQUENCE MANAGEMENT
    # ========================================================================

    def create_sequence(self, request: CreateSequenceRequest) -> Sequence:
        """Create a new sequence and save to disk"""
        sequence_id = str(uuid.uuid4())
        sequence = Sequence(
            id=sequence_id,
            name=request.name,
            tempo=request.tempo or 120.0,
            time_signature=request.time_signature or "4/4",
            clips=[],
            is_playing=False,
            current_position=0.0,
        )
        self.sequences[sequence_id] = sequence

        # Save to disk
        self.storage.save_sequence(sequence, create_version=True)

        logger.info(f"✅ Created sequence: {request.name} (ID: {sequence_id})")
        return sequence

    def get_sequences(self) -> List[Sequence]:
        """Get all sequences"""
        return list(self.sequences.values())

    def get_sequence(self, sequence_id: str) -> Optional[Sequence]:
        """Get sequence by ID"""
        return self.sequences.get(sequence_id)

    def delete_sequence(self, sequence_id: str) -> bool:
        """Delete a sequence from memory and disk"""
        if sequence_id in self.sequences:
            # Stop playback if this sequence is playing
            if self.current_sequence_id == sequence_id:
                self.stop_playback()

            # Get the sequence to access its tracks
            sequence = self.sequences[sequence_id]

            # Remove all tracks belonging to this sequence from global tracks dict
            track_ids_to_remove = [track.id for track in sequence.tracks]
            for track_id in track_ids_to_remove:
                if track_id in self.tracks:
                    del self.tracks[track_id]
                    logger.info(f"  ✅ Removed track {track_id} from global tracks dict")

            # Delete sequence from memory
            del self.sequences[sequence_id]

            # Delete from disk
            self.storage.delete_sequence(sequence_id)

            logger.info(f"✅ Deleted sequence: {sequence_id} (removed {len(track_ids_to_remove)} tracks)")
            return True
        return False

    def update_sample_references(self, sample_id: str, new_name: str) -> int:
        """
        Update sample_name in all tracks that reference this sample.
        Called when a sample is renamed in the Input panel.

        Args:
            sample_id: The ID of the sample that was updated
            new_name: The new name for the sample

        Returns:
            Number of tracks updated
        """
        updated_count = 0

        for sequence in self.sequences.values():
            sequence_modified = False

            for track in sequence.tracks:
                if track.sample_id == sample_id:
                    logger.info(f"📝 Updating track '{track.name}' sample name: '{track.sample_name}' -> '{new_name}'")
                    track.sample_name = new_name
                    updated_count += 1
                    sequence_modified = True

            # Save sequence if any tracks were updated
            if sequence_modified:
                self.storage.save_sequence(sequence)
                logger.info(f"💾 Saved sequence '{sequence.name}' with updated sample references")

        return updated_count

    def check_sample_in_use(self, sample_id: str) -> Tuple[bool, List[str]]:
        """
        Check if a sample is being used in any sequencer tracks.

        Args:
            sample_id: The ID of the sample to check

        Returns:
            Tuple of (is_in_use, list_of_track_names)
        """
        tracks_using_sample = []

        for sequence in self.sequences.values():
            for track in sequence.tracks:
                if track.sample_id == sample_id:
                    tracks_using_sample.append(f"{sequence.name} / {track.name}")

        return len(tracks_using_sample) > 0, tracks_using_sample

    # ========================================================================
    # CLIP MANAGEMENT
    # ========================================================================

    def add_clip(self, sequence_id: str, request: AddClipRequest) -> Optional[Clip]:
        """Add a clip to a sequence and autosave"""
        sequence = self.sequences.get(sequence_id)
        if not sequence:
            return None

        clip_id = str(uuid.uuid4())
        clip = Clip(
            id=clip_id,
            name=request.name or f"Clip {len(sequence.clips) + 1}",
            type=request.clip_type,
            track_id=request.track_id,
            start_time=request.start_time,
            duration=request.duration,
            midi_events=request.midi_events,
            audio_file_path=request.audio_file_path,
            is_muted=False,
            # Audio clips should loop by default (standard DAW behavior)
            # When clip duration > sample length, the sample repeats
            is_looped=True if request.clip_type == "audio" else False,
            gain=1.0,
        )

        sequence.clips.append(clip)
        sequence.updated_at = datetime.now()

        # Autosave sequence
        self.storage.autosave_sequence(sequence)

        # Trigger musical context analysis (async, non-blocking)
        if self.on_sequence_changed:
            asyncio.create_task(asyncio.to_thread(self.on_sequence_changed))

        logger.info(f"✅ Added clip to sequence {sequence_id}: {clip.name}")
        return clip

    def get_clips(self, sequence_id: str) -> Optional[List[Clip]]:
        """Get all clips in a sequence"""
        sequence = self.sequences.get(sequence_id)
        return sequence.clips if sequence else None

    def update_clip(
        self, sequence_id: str, clip_id: str, request: UpdateClipRequest
    ) -> Optional[Clip]:
        """Update a clip and autosave"""
        sequence = self.sequences.get(sequence_id)
        if not sequence:
            return None

        clip = next((c for c in sequence.clips if c.id == clip_id), None)
        if not clip:
            return None

        # Update fields
        if request.start_time is not None:
            clip.start_time = request.start_time
        if request.duration is not None:
            clip.duration = request.duration
        if request.midi_events is not None:
            clip.midi_events = request.midi_events
        if request.is_muted is not None:
            clip.is_muted = request.is_muted
        if request.is_looped is not None:
            clip.is_looped = request.is_looped
        if request.gain is not None:
            clip.gain = request.gain
        if request.audio_offset is not None:
            clip.audio_offset = request.audio_offset

        sequence.updated_at = datetime.now()

        # Autosave sequence
        self.storage.autosave_sequence(sequence)

        # Trigger musical context analysis (async, non-blocking)
        if self.on_sequence_changed:
            asyncio.create_task(asyncio.to_thread(self.on_sequence_changed))

        logger.info(f"✅ Updated clip {clip_id} in sequence {sequence_id}")
        return clip

    def delete_clip(self, sequence_id: str, clip_id: str) -> bool:
        """Delete a clip from a sequence and autosave"""
        sequence = self.sequences.get(sequence_id)
        if not sequence:
            return False

        clip = next((c for c in sequence.clips if c.id == clip_id), None)
        if not clip:
            return False

        sequence.clips.remove(clip)
        sequence.updated_at = datetime.now()

        # Autosave sequence
        self.storage.autosave_sequence(sequence)

        # Trigger musical context analysis (async, non-blocking)
        if self.on_sequence_changed:
            asyncio.create_task(asyncio.to_thread(self.on_sequence_changed))

        logger.info(f"✅ Deleted clip {clip_id} from sequence {sequence_id}")
        return True

    def duplicate_clip(self, sequence_id: str, clip_id: str) -> Optional[Clip]:
        """Duplicate a clip and autosave"""
        sequence = self.sequences.get(sequence_id)
        if not sequence:
            return None

        original_clip = next((c for c in sequence.clips if c.id == clip_id), None)
        if not original_clip:
            return None

        # Create duplicate with new ID and offset position
        new_clip_id = str(uuid.uuid4())
        new_clip = Clip(
            id=new_clip_id,
            name=f"{original_clip.name} (copy)",
            type=original_clip.type,
            track_id=original_clip.track_id,
            start_time=original_clip.start_time + original_clip.duration,  # Place after original
            duration=original_clip.duration,
            midi_events=original_clip.midi_events.copy() if original_clip.midi_events else None,
            audio_file_path=original_clip.audio_file_path,
            audio_offset=original_clip.audio_offset,
            is_muted=original_clip.is_muted,
            is_looped=original_clip.is_looped,
        )

        sequence.clips.append(new_clip)
        sequence.updated_at = datetime.now()

        # Autosave sequence
        self.storage.autosave_sequence(sequence)

        logger.info(f"✅ Duplicated clip {clip_id} → {new_clip_id}")
        return new_clip

    # ========================================================================
    # TRACK MANAGEMENT
    # ========================================================================

    def create_track(
        self,
        sequence_id: str,
        name: str,
        track_type: str = "sample",
        color: str = "#3b82f6",
        sample_id: Optional[str] = None,
        sample_name: Optional[str] = None,
        sample_file_path: Optional[str] = None
    ) -> Optional[SequencerTrack]:
        """Create a new track in a sequence"""
        sequence = self.sequences.get(sequence_id)
        if not sequence:
            logger.error(f"Sequence {sequence_id} not found")
            return None

        track_id = str(uuid.uuid4())
        track = SequencerTrack(
            id=track_id,
            name=name,
            sequence_id=sequence_id,  # Set parent sequence ID
            type=track_type,
            color=color,
            is_muted=False,
            is_solo=False,
            is_armed=False,
            volume=1.0,  # Unity gain
            pan=0.0,  # Center
            sample_id=sample_id,
            sample_name=sample_name,
            sample_file_path=sample_file_path
        )

        # Add track to sequence
        sequence.tracks.append(track)

        # Also keep in global dict for backwards compatibility
        self.tracks[track_id] = track

        # Auto-save sequence
        self.storage.autosave_sequence(sequence)

        logger.info(f"✅ Created track: {name} (ID: {track_id}, Type: {track_type}, Sample: {sample_name}) in sequence {sequence_id}")
        return track

    def get_tracks(self, sequence_id: Optional[str] = None) -> List[SequencerTrack]:
        """Get all tracks (optionally filtered by sequence)"""
        if sequence_id:
            sequence = self.sequences.get(sequence_id)
            return sequence.tracks if sequence else []
        return list(self.tracks.values())

    def get_track(self, track_id: str) -> Optional[SequencerTrack]:
        """Get track by ID"""
        return self.tracks.get(track_id)

    async def update_track_mute(self, track_id: str, is_muted: bool) -> Optional[SequencerTrack]:
        """Toggle track mute"""
        track = self.tracks.get(track_id)
        if track:
            track.is_muted = is_muted
            # Find and auto-save the sequence containing this track
            for sequence in self.sequences.values():
                if any(t.id == track_id for t in sequence.tracks):
                    self.storage.autosave_sequence(sequence)
                    break

            # Update mixer channel synth
            if self.mixer_channel_service:
                await self.mixer_channel_service.update_mixer_channel(
                    track_id=track_id,
                    mute=is_muted
                )

            logger.info(f"✅ Track {track_id} mute: {is_muted}")
        return track

    async def update_track_solo(self, track_id: str, is_solo: bool) -> Optional[SequencerTrack]:
        """Toggle track solo"""
        track = self.tracks.get(track_id)
        if track:
            track.is_solo = is_solo
            # Find and auto-save the sequence containing this track
            for sequence in self.sequences.values():
                if any(t.id == track_id for t in sequence.tracks):
                    self.storage.autosave_sequence(sequence)
                    break

            # Update mixer channel synth
            if self.mixer_channel_service:
                await self.mixer_channel_service.update_mixer_channel(
                    track_id=track_id,
                    solo=is_solo
                )

            logger.info(f"✅ Track {track_id} solo: {is_solo}")
        return track

    async def update_track(self, track_id: str, volume: Optional[float] = None, pan: Optional[float] = None) -> Optional[SequencerTrack]:
        """
        Update track volume and/or pan, and apply changes to currently playing synths.

        Args:
            track_id: ID of the track to update
            volume: New volume (0.0-2.0), or None to keep current
            pan: New pan (-1.0 to 1.0), or None to keep current

        Returns:
            Updated track, or None if track not found
        """
        track = self.tracks.get(track_id)
        if not track:
            return None

        # Update track properties
        if volume is not None:
            track.volume = volume
        if pan is not None:
            track.pan = pan

        # Find and auto-save the sequence containing this track
        for sequence in self.sequences.values():
            if any(t.id == track_id for t in sequence.tracks):
                self.storage.autosave_sequence(sequence)
                break

        # Update mixer channel synth (create if it doesn't exist)
        if self.mixer_channel_service and (volume is not None or pan is not None):
            # Check if mixer channel exists, create if not
            if track_id not in self.mixer_channel_service.mixer_channels:
                # Allocate bus and create mixer channel
                if self.audio_bus_manager:
                    track_bus = self.audio_bus_manager.get_track_bus(track_id)
                    if track_bus is None:
                        track_bus = self.audio_bus_manager.allocate_track_bus(track_id)
                    await self.mixer_channel_service.create_mixer_channel(
                        track_id=track_id,
                        volume=track.volume,
                        pan=track.pan,
                        mute=track.is_muted,
                        solo=track.is_solo
                    )
                    logger.info(f"🎚️ Created mixer channel for track {track_id} on bus {track_bus}")
            else:
                # Update existing mixer channel
                await self.mixer_channel_service.update_mixer_channel(
                    track_id=track_id,
                    volume=volume,
                    pan=pan
                )

        # Update all currently playing synths for this track
        if self.engine_manager and (volume is not None or pan is not None):
            # Find all clips belonging to this track that are currently playing
            for clip_id, node_id in self.active_synths.items():
                # Find the clip
                clip = None
                for seq in self.sequences.values():
                    clip = next((c for c in seq.clips if c.id == clip_id), None)
                    if clip:
                        break

                # Check if this clip belongs to the track we're updating
                if clip and clip.track_id == track_id:
                    # Update volume (amp) if changed
                    if volume is not None:
                        # Calculate final amplitude (same formula as when creating synth)
                        final_amp = 0.8 * clip.gain * track.volume
                        self.engine_manager.send_message("/n_set", node_id, "amp", final_amp)
                        logger.info(f"🔊 Updated synth {node_id} volume: {final_amp:.2f}")

                    # Update pan if changed
                    if pan is not None:
                        self.engine_manager.send_message("/n_set", node_id, "pan", track.pan)
                        logger.info(f"🎚️  Updated synth {node_id} pan: {track.pan:.2f}")

        logger.info(f"✅ Track {track_id} updated - volume: {track.volume:.2f}, pan: {track.pan:.2f}")
        return track

    def delete_track(self, track_id: str) -> bool:
        """Delete a track from its sequence"""
        track = self.tracks.get(track_id)
        if not track:
            logger.warning(f"Track {track_id} not found in tracks dict")
            return False

        # Find the sequence containing this track
        sequence = self.sequences.get(track.sequence_id)
        if not sequence:
            logger.warning(f"Sequence {track.sequence_id} not found for track {track_id}")
            return False

        # Remove track from sequence
        sequence.tracks = [t for t in sequence.tracks if t.id != track_id]

        # Remove track from global tracks dict
        del self.tracks[track_id]

        # Remove all clips belonging to this track
        sequence.clips = [c for c in sequence.clips if c.track_id != track_id]

        # Update timestamp
        sequence.updated_at = datetime.now()

        # Auto-save the sequence
        self.storage.autosave_sequence(sequence)

        logger.info(f"✅ Deleted track {track_id} from sequence {track.sequence_id}")
        return True

    # ========================================================================
    # PLAYBACK CONTROL
    # ========================================================================

    async def play_sequence(self, sequence_id: str, position: float = 0.0):
        """Start playing a sequence"""
        sequence = self.sequences.get(sequence_id)
        if not sequence:
            raise ValueError(f"Sequence {sequence_id} not found")

        # If loop is enabled and starting from position 0, start from loop_start instead
        if sequence.loop_enabled and position == 0.0:
            position = sequence.loop_start
            logger.info(f"🔁 Loop enabled - starting from loop_start: {position} beats")

        logger.info(f"▶️  Starting playback for sequence '{sequence.name}' (ID: {sequence_id})")
        logger.info(f"   Tracks: {len(sequence.tracks)}, Clips: {len(sequence.clips)}")
        logger.info(f"   Tempo: {sequence.tempo} BPM, Position: {position} beats")
        logger.info(f"   Loop: {'enabled' if sequence.loop_enabled else 'disabled'} ({sequence.loop_start} - {sequence.loop_end} beats)")

        self.current_sequence_id = sequence_id
        self.playhead_position = position
        self.is_playing = True
        self.is_paused = False
        self.tempo = sequence.tempo

        sequence.is_playing = True
        sequence.current_position = position

        # Start playback loop
        if self.playback_task:
            logger.info("   Cancelling existing playback task...")
            self.playback_task.cancel()
            try:
                await self.playback_task
            except asyncio.CancelledError:
                pass

        logger.info("   Creating new playback task...")
        self.playback_task = asyncio.create_task(self._playback_loop())
        logger.info("✅ Playback started successfully")

    async def stop_playback(self):
        """Stop playback"""
        if self.current_sequence_id:
            sequence = self.sequences.get(self.current_sequence_id)
            if sequence:
                sequence.is_playing = False
                sequence.current_position = 0.0

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

        # Free all active synths
        if self.engine_manager:
            for clip_id, node_id in self.active_synths.items():
                self.engine_manager.send_message("/n_free", node_id)
            self.active_synths.clear()

        logger.info("⏹️  Stopped playback")

    async def pause_playback(self):
        """Pause playback and stop all active audio"""
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

            # CRITICAL: Stop all active synths immediately when pausing
            if self.engine_manager:
                for clip_id, node_id in self.active_synths.items():
                    self.engine_manager.send_message("/n_free", node_id)
                self.active_synths.clear()
                logger.info(f"🔇 Stopped all active audio on pause")

            logger.info("⏸️  Paused playback")

    async def resume_playback(self):
        """Resume playback"""
        if self.is_paused:
            self.is_playing = True
            self.is_paused = False

            # Restart playback loop from current position
            if self.playback_task:
                self.playback_task.cancel()

            self.playback_task = asyncio.create_task(self._playback_loop())

            logger.info("▶️  Resumed playback")

    async def set_tempo(self, tempo: float):
        """
        Set global tempo and restart playback loop if playing.

        The playback loop calculates beat_duration from tempo at startup,
        so we need to restart it to apply the new tempo immediately.
        """
        old_tempo = self.tempo
        self.tempo = tempo

        if self.current_sequence_id:
            sequence = self.sequences.get(self.current_sequence_id)
            if sequence:
                sequence.tempo = tempo
                # Save the sequence with new tempo
                self.storage.autosave_sequence(sequence)

        logger.info(f"🎵 Set tempo: {old_tempo} → {tempo} BPM")

        # If currently playing, restart the playback loop to apply new tempo
        if self.is_playing and not self.is_paused:
            logger.info("   Restarting playback loop to apply new tempo...")
            if self.playback_task:
                self.playback_task.cancel()
            self.playback_task = asyncio.create_task(self._playback_loop())
            logger.info("✅ Tempo applied to playback")

    async def seek(self, position: float, trigger_audio: bool = True):
        """
        Seek to position and optionally trigger audio for scrubbing effect.

        Args:
            position: Position in beats to seek to
            trigger_audio: If True, trigger clips at the new position (for scrubbing)
        """
        self.playhead_position = position
        if self.current_sequence_id:
            sequence = self.sequences.get(self.current_sequence_id)
            if sequence:
                sequence.current_position = position

                # For audio scrubbing: stop all active clips and trigger clips at new position
                if trigger_audio and self.engine_manager:
                    # Stop all currently playing clips
                    for clip_id, node_id in list(self.active_synths.items()):
                        self.engine_manager.send_message("/n_free", node_id)
                    self.active_synths.clear()

                    # Trigger clips at the new position
                    await self._check_and_trigger_clips(sequence, position)

                # Broadcast position update via WebSocket so frontend updates immediately
                if self.websocket_manager:
                    # Parse time signature (e.g., "4/4" -> num=4, den=4)
                    time_sig_parts = sequence.time_signature.split("/")
                    time_sig_num = int(time_sig_parts[0]) if len(time_sig_parts) > 0 else 4
                    time_sig_den = int(time_sig_parts[1]) if len(time_sig_parts) > 1 else 4

                    transport_data = {
                        "type": "transport",
                        "is_playing": self.is_playing,
                        "position_beats": self.playhead_position,
                        "position_seconds": self.playhead_position * (60.0 / self.tempo),
                        "tempo": self.tempo,
                        "time_signature_num": time_sig_num,
                        "time_signature_den": time_sig_den,
                        "loop_enabled": sequence.loop_enabled,
                        "loop_start": sequence.loop_start,
                        "loop_end": sequence.loop_end,
                    }
                    await self.websocket_manager.broadcast_transport(transport_data)

        logger.info(f"⏩ Seek to position: {position:.2f} beats (trigger_audio={trigger_audio})")

    def get_playback_state(self) -> PlaybackState:
        """
        Get current playback state

        Returns:
            Current playback state including position, tempo, and flags
        """
        return {
            "is_playing": self.is_playing,
            "current_sequence": self.current_sequence_id,
            "playhead_position": self.playhead_position,
            "tempo": self.tempo,
            "is_paused": self.is_paused,
            "metronome_enabled": self.metronome_enabled
        }



    # ========================================================================
    # METRONOME CONTROL
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

    # ========================================================================
    # NOTE PREVIEW
    # ========================================================================

    async def preview_note(self, note: int, velocity: int, duration: float, instrument: str):
        """
        Preview a MIDI note with one-shot playback

        Args:
            note: MIDI note number (0-127)
            velocity: Note velocity (1-127)
            duration: Note duration in seconds
            instrument: Instrument/synthdef to use
        """
        if not self.engine_manager:
            logger.error("❌ Cannot preview note: engine_manager not available")
            return

        if not self.engine_manager.is_connected:
            logger.error("❌ Cannot preview note: engine_manager not connected to SuperCollider")
            return

        # Allocate node ID
        node_id = self.engine_manager.allocate_node_id()

        # Convert MIDI note to frequency
        freq = 440.0 * (2.0 ** ((note - 69) / 12.0))

        # Calculate amplitude from velocity
        amp = (velocity / 127.0) * 0.8

        logger.info(f"🎹 PREVIEW NOTE REQUEST:")
        logger.info(f"   Note: {note} → Freq: {freq:.2f}Hz")
        logger.info(f"   Velocity: {velocity} → Amp: {amp:.2f}")
        logger.info(f"   Instrument: {instrument}")
        logger.info(f"   Node ID: {node_id}")
        logger.info(f"   Duration: {duration}s")

        # Send /s_new message to create synth
        try:
            self.engine_manager.send_message(
                "/s_new",
                instrument,
                node_id,
                0,  # addAction (0 = add to head)
                1,  # target (1 = default group)
                "freq", freq,
                "amp", amp,
                "gate", 1
            )
            logger.info(f"✅ Sent /s_new message to SuperCollider")
        except Exception as e:
            logger.error(f"❌ Failed to send /s_new message: {e}")
            return

        # Schedule note release after duration
        async def release_note():
            await asyncio.sleep(duration)
            try:
                self.engine_manager.send_message("/n_set", node_id, "gate", 0)
                logger.info(f"🔇 Released preview note {node_id}")
            except Exception as e:
                logger.error(f"❌ Failed to release note {node_id}: {e}")

        # Run release in background
        asyncio.create_task(release_note())