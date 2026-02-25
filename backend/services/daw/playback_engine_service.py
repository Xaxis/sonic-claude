"""
Playback Engine Service - Manages playback execution and audio triggering

ARCHITECTURE:
- PlaybackEngineService handles playback execution (play/pause/stop/seek)
- Depends on CompositionStateService to access compositions
- Coordinates with SuperCollider for audio playback
- Manages playback state (is_playing, position, tempo)
- Does NOT manage composition state (that's CompositionStateService)
"""
import logging
import uuid
import asyncio
import time
from typing import Dict, List, Optional, Set
from datetime import datetime

from backend.models.composition import Composition
from backend.models.sequence import Clip, Track, MIDINote
from backend.models.types import ActiveMIDINote, PlaybackState
from backend.services.audio.buffer_manager_service import BufferManager
from backend.core.engine_manager import AudioEngineManager
from backend.services.websocket import WebSocketManager
from backend.services.audio.bus_manager_service import AudioBusManager
from backend.services.daw.mixer_channel_service import MixerChannelSynthManager

logger = logging.getLogger(__name__)


class PlaybackEngineService:
    """
    Manages playback execution and audio triggering

    Responsibilities:
    - Execute playback (play/pause/stop/seek)
    - Advance playhead and trigger clips
    - Coordinate with SuperCollider for audio
    - Manage playback state (is_playing, position, tempo)
    - Composition state managed by CompositionStateService
    """

    def __init__(
        self,
        composition_state_service: 'CompositionStateService',
        engine_manager: Optional[AudioEngineManager] = None,
        websocket_manager: Optional[WebSocketManager] = None,
        audio_bus_manager: Optional[AudioBusManager] = None,
        mixer_channel_service: Optional[MixerChannelSynthManager] = None
    ) -> None:
        """Initialize playback engine service"""
        # Dependencies
        self.composition_state_service = composition_state_service
        self.engine_manager = engine_manager
        self.websocket_manager = websocket_manager
        self.audio_bus_manager = audio_bus_manager
        self.mixer_channel_service = mixer_channel_service

        # Buffer manager for sample playback
        self.buffer_manager = BufferManager(engine_manager) if engine_manager else None

        # Timeline playback state
        self.is_playing = False
        self.is_paused = False
        self.playhead_position = 0.0  # beats
        self.tempo = 120.0  # BPM

        # Clip launcher playback state (INDEPENDENT from timeline)
        self.clip_launcher_active = False  # True if ANY clips are playing
        self.clip_launcher_task: Optional[asyncio.Task] = None  # Background loop for clip launcher
        self.clip_launcher_start_time = 0.0  # When clip launcher started (for timing)
        self.clip_launcher_beat_position = 0.0  # Current beat position in clip launcher

        # Metronome state
        self.metronome_enabled = False
        self.metronome_volume = 0.3
        self.last_metronome_beat = -1

        # Playback task tracking
        self.playback_task: Optional[asyncio.Task] = None

        # TIMELINE PLAYBACK STATE (sequencer mode)
        self.timeline_active_synths: Dict[str, int] = {}  # clip_id -> node_id (for timeline playback)
        self.timeline_active_midi_notes: Dict[int, ActiveMIDINote] = {}  # node_id -> note data
        self.timeline_midi_note_tasks: Set[asyncio.Task] = set()  # MIDI note tasks for timeline

        # CLIP LAUNCHER STATE (performance mode)
        self.launcher_active_synths: Dict[str, int] = {}  # clip_id -> node_id (for clip launcher)
        self.triggered_clips: Dict[str, asyncio.Task] = {}  # clip_id -> launch_task (waiting for quantization)

        logger.info("✅ PlaybackEngineService initialized")

    # ========================================================================
    # PLAYBACK CONTROL
    # ========================================================================

    async def play_composition(self, composition_id: str, position: float = 0.0):
        """Start playing a composition"""
        composition = self.composition_state_service.get_composition(composition_id)
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

        self.is_playing = True
        self.is_paused = False
        self.playhead_position = position
        self.tempo = composition.tempo

        composition.is_playing = True
        composition.current_position = position

        # Start playback loop task
        self.playback_task = asyncio.create_task(self._playback_loop(composition_id))
        logger.info("✅ Playback started successfully")

    async def _playback_loop(self, composition_id: str) -> None:
        """Background task that advances playhead and triggers clips"""
        composition = self.composition_state_service.get_composition(composition_id)
        if not composition:
            logger.error(f"❌ Playback loop: Composition {composition_id} not found!")
            return

        logger.info(f"🎵 Starting playback loop for composition {composition.name}")
        logger.info(f"   Tempo: {self.tempo} BPM, WebSocket: {'connected' if self.websocket_manager else 'not available'}")
        logger.info(f"   WebSocket has {len(self.websocket_manager.transport_clients) if self.websocket_manager else 0} connected clients")

        # Playback loop constants
        update_interval = 0.02  # 50 Hz update rate (20ms)

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

                # Recalculate beat duration on every iteration to respond to tempo changes in real-time
                beat_duration = 60.0 / self.tempo  # seconds per beat

                # Advance playhead
                delta_beats = (delta_time / beat_duration)
                self.playhead_position += delta_beats

                # Handle loop region: if loop is enabled and we've passed loop_end, jump back to loop_start
                if composition.loop_enabled and self.playhead_position >= composition.loop_end:
                    logger.info(f"🔁 Looping back: {composition.loop_end:.2f} → {composition.loop_start:.2f} beats")

                    # Free all active synths before looping back (TIMELINE ONLY)
                    if self.engine_manager:
                        for clip_id, node_id in list(self.timeline_active_synths.items()):
                            self.engine_manager.send_message("/n_free", node_id)
                        self.timeline_active_synths.clear()

                    # FIX: Cancel all MIDI note tasks before looping (TIMELINE ONLY)
                    logger.info(f"🔁 Cancelling {len(self.timeline_midi_note_tasks)} MIDI note tasks for loop")
                    for task in list(self.timeline_midi_note_tasks):
                        task.cancel()
                    # Wait for all tasks to be cancelled
                    if self.timeline_midi_note_tasks:
                        await asyncio.gather(*self.timeline_midi_note_tasks, return_exceptions=True)
                    self.timeline_midi_note_tasks.clear()

                    # FIX: Free all active MIDI notes (TIMELINE ONLY)
                    if self.engine_manager:
                        for node_id in list(self.timeline_active_midi_notes.keys()):
                            self.engine_manager.send_message("/n_free", node_id)
                    self.timeline_active_midi_notes.clear()

                    # Jump back to loop start
                    self.playhead_position = composition.loop_start

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

                    # Build active notes list for visual feedback (TIMELINE ONLY)
                    active_notes_list = [
                        {"clip_id": note_data["clip_id"], "note": note_data["note"], "start_time": note_data["start_time"]}
                        for note_data in self.timeline_active_midi_notes.values()
                    ]

                    transport_data = {
                        "type": "transport",
                        "is_playing": self.is_playing,
                        "is_paused": self.is_paused,
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
                        # Clip launcher state (for real-time UI updates) - SEPARATE from timeline
                        "playing_clips": list(self.launcher_active_synths.keys()),
                        "triggered_clips": list(self.triggered_clips.keys()),
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
        Check if any clips should be triggered at the current position (TIMELINE PLAYBACK)

        Args:
            composition: Composition being played
            position: Current playhead position in beats
        """
        # First, stop any clips that are playing but shouldn't be (playhead moved outside their range)
        clips_to_stop = []
        for clip_id, node_id in list(self.timeline_active_synths.items()):
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
            del self.timeline_active_synths[clip_id]

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
                if clip.id not in self.timeline_active_synths:
                    # Calculate offset within the clip
                    offset = position - clip_start
                    logger.info(f"🎯 Triggering clip {clip.id} at position {position:.2f} (clip range: {clip_start:.2f}-{clip_end:.2f})")
                    await self._trigger_clip(clip, track, offset)

    async def _trigger_clip(self, clip: Clip, track: Track, offset: float = 0.0) -> None:
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
                    # Go from backend/services/daw/playback_engine_service.py -> backend/services/daw -> backend/services -> backend -> project_root
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

                # Track active synth (TIMELINE PLAYBACK)
                self.timeline_active_synths[clip.id] = node_id

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

                # Track active synth (TIMELINE PLAYBACK)
                self.timeline_active_synths[clip.id] = node_id

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
                        # FIX: Pass note_start_time as parameter to avoid Python closure bug
                        async def play_note(nid, freq_val, amp_val, synth, delay, dur_beats, note_pitch, note_start_time, clip_id_val, out_bus):
                            try:
                                logger.info(f"⏰ MIDI Note Task Started: nid={nid}, delay={delay:.3f}s, synth={synth}, freq={freq_val:.2f}Hz, amp={amp_val:.3f}, bus={out_bus}")
                                await asyncio.sleep(delay)

                                if self.engine_manager and self.is_playing:
                                    logger.info(f"🎵 TRIGGERING MIDI NOTE: nid={nid}, synth={synth}, freq={freq_val:.2f}Hz, amp={amp_val:.3f}, gate=1, out={out_bus}")

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

                                    # Track active note for visual feedback (TIMELINE PLAYBACK)
                                    self.timeline_active_midi_notes[nid] = {
                                        "clip_id": clip_id_val,
                                        "note": note_pitch,
                                        "start_time": note_start_time,  # FIX: Use parameter instead of closure variable
                                        "wall_time": time.time()  # Wall clock time for debugging
                                    }
                                    logger.info(f"✅ MIDI note {nid} STARTED: pitch={note_pitch}, start_time={note_start_time}, clip={clip_id_val}")

                                    # Schedule release
                                    note_duration = dur_beats * (60.0 / self.tempo)
                                    logger.info(f"⏱️  MIDI note {nid} will release in {note_duration:.3f}s")
                                    await asyncio.sleep(note_duration)

                                    if self.engine_manager:
                                        logger.info(f"🔇 RELEASING MIDI note {nid}: sending gate=0")
                                        self.engine_manager.send_message("/n_set", nid, "gate", 0)

                                    # Remove from active notes (TIMELINE PLAYBACK)
                                    if nid in self.timeline_active_midi_notes:
                                        del self.timeline_active_midi_notes[nid]
                                    logger.info(f"✅ MIDI note {nid} RELEASED")
                                else:
                                    logger.warning(f"⚠️  MIDI note {nid} NOT triggered: engine_manager={self.engine_manager is not None}, is_playing={self.is_playing}")

                            except asyncio.CancelledError:
                                # Task was cancelled (pause/stop was called)
                                logger.info(f"🛑 MIDI note {nid} task CANCELLED")
                                # Free the synth if it was started (TIMELINE PLAYBACK)
                                if nid in self.timeline_active_midi_notes:
                                    if self.engine_manager:
                                        self.engine_manager.send_message("/n_free", nid)
                                    del self.timeline_active_midi_notes[nid]
                                raise  # Re-raise to mark task as cancelled
                            except Exception as e:
                                logger.error(f"❌ MIDI note {nid} task FAILED: {e}", exc_info=True)

                        task = asyncio.create_task(play_note(node_id, freq, amp, synthdef, delay_seconds, note.duration, note.note, note.start_time, clip.id, track_bus))
                        self.timeline_midi_note_tasks.add(task)
                        # Remove task from set when it completes
                        task.add_done_callback(self.timeline_midi_note_tasks.discard)
                    else:
                        logger.info(f"      ❌ SKIPPED (note already passed: offset={offset:.2f}, note_start={note.start_time:.2f})")

                logger.info(f"   Total notes scheduled: {triggered_count}/{len(clip.midi_events)}")

                # Track that this MIDI clip is active (for stopping when playhead leaves clip range) - TIMELINE PLAYBACK
                self.timeline_active_synths[clip.id] = self.engine_manager.allocate_node_id()  # Dummy node ID for tracking

        except Exception as e:
            logger.error(f"❌ Failed to trigger clip {clip.id}: {e}")

    async def stop_playback(self):
        """Stop playback"""
        # Get current composition to update its state
        if self.composition_state_service.current_composition_id:
            composition = self.composition_state_service.get_composition(
                self.composition_state_service.current_composition_id
            )
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

        # Stop all active synths (sample/audio clips) - TIMELINE PLAYBACK
        if self.engine_manager:
            for node_id in self.timeline_active_synths.values():
                self.engine_manager.send_message("/n_free", node_id)
        self.timeline_active_synths.clear()

        # Cancel all scheduled MIDI note tasks - TIMELINE PLAYBACK
        for task in self.timeline_midi_note_tasks:
            task.cancel()
        if self.timeline_midi_note_tasks:
            await asyncio.gather(*self.timeline_midi_note_tasks, return_exceptions=True)
        self.timeline_midi_note_tasks.clear()

        # Stop all active MIDI notes (use /n_free for immediate silence) - TIMELINE PLAYBACK
        if self.engine_manager:
            for node_id in self.timeline_active_midi_notes.keys():
                self.engine_manager.send_message("/n_free", node_id)
        self.timeline_active_midi_notes.clear()

        # Broadcast stopped state via WebSocket
        if self.websocket_manager and self.composition_state_service.current_composition_id:
            composition = self.composition_state_service.get_composition(
                self.composition_state_service.current_composition_id
            )
            if composition:
                time_sig_parts = composition.time_signature.split("/")
                time_sig_num = int(time_sig_parts[0]) if len(time_sig_parts) > 0 else 4
                time_sig_den = int(time_sig_parts[1]) if len(time_sig_parts) > 1 else 4

                transport_data = {
                    "type": "transport",
                    "is_playing": False,
                    "is_paused": False,
                    "position_beats": 0.0,
                    "position_seconds": 0.0,
                    "tempo": self.tempo,
                    "time_signature_num": time_sig_num,
                    "time_signature_den": time_sig_den,
                    "loop_enabled": composition.loop_enabled,
                    "loop_start": composition.loop_start,
                    "loop_end": composition.loop_end,
                    "metronome_enabled": self.metronome_enabled,
                    "active_notes": [],
                    "playing_clips": list(self.launcher_active_synths.keys()),
                    "triggered_clips": list(self.triggered_clips.keys()),
                }
                await self.websocket_manager.broadcast_transport(transport_data)

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

            # Stop all active synths (sample/audio clips) - TIMELINE PLAYBACK
            logger.info(f"🛑 Stopping {len(self.timeline_active_synths)} active sample/audio synths")
            if self.engine_manager:
                for clip_id, node_id in self.timeline_active_synths.items():
                    logger.info(f"🛑 Freeing synth node {node_id} for clip {clip_id}")
                    self.engine_manager.send_message("/n_free", node_id)
            else:
                logger.warning("⚠️ No engine_manager available to free synths!")
            self.timeline_active_synths.clear()

            # Cancel all scheduled MIDI note tasks - TIMELINE PLAYBACK
            logger.info(f"🛑 Cancelling {len(self.timeline_midi_note_tasks)} MIDI note tasks")
            for task in self.timeline_midi_note_tasks:
                task.cancel()
            # Wait for all tasks to be cancelled
            if self.timeline_midi_note_tasks:
                await asyncio.gather(*self.timeline_midi_note_tasks, return_exceptions=True)
            self.timeline_midi_note_tasks.clear()

            # Stop all active MIDI notes (use /n_free for immediate silence) - TIMELINE PLAYBACK
            logger.info(f"🛑 Stopping {len(self.timeline_active_midi_notes)} active MIDI notes")
            if self.engine_manager:
                for node_id, note_info in self.timeline_active_midi_notes.items():
                    logger.info(f"🛑 Freeing MIDI note node {node_id} (note={note_info['note']}, clip={note_info['clip_id']})")
                    self.engine_manager.send_message("/n_free", node_id)
            self.timeline_active_midi_notes.clear()

            # Broadcast paused state via WebSocket
            if self.websocket_manager and self.composition_state_service.current_composition_id:
                composition = self.composition_state_service.get_composition(
                    self.composition_state_service.current_composition_id
                )
                if composition:
                    time_sig_parts = composition.time_signature.split("/")
                    time_sig_num = int(time_sig_parts[0]) if len(time_sig_parts) > 0 else 4
                    time_sig_den = int(time_sig_parts[1]) if len(time_sig_parts) > 1 else 4

                    transport_data = {
                        "type": "transport",
                        "is_playing": False,
                        "is_paused": True,
                        "position_beats": self.playhead_position,
                        "position_seconds": self.playhead_position * (60.0 / self.tempo),
                        "tempo": self.tempo,
                        "time_signature_num": time_sig_num,
                        "time_signature_den": time_sig_den,
                        "loop_enabled": composition.loop_enabled,
                        "loop_start": composition.loop_start,
                        "loop_end": composition.loop_end,
                        "metronome_enabled": self.metronome_enabled,
                        "active_notes": [],
                        "playing_clips": list(self.active_synths.keys()),
                        "triggered_clips": list(self.triggered_clips.keys()),
                    }
                    await self.websocket_manager.broadcast_transport(transport_data)

            logger.info("⏸️  Paused playback")

    async def seek(self, position: float, trigger_audio: bool = True):
        """Seek to position"""
        self.playhead_position = position
        if self.composition_state_service.current_composition_id:
            composition = self.composition_state_service.get_composition(
                self.composition_state_service.current_composition_id
            )
            if composition:
                composition.current_position = position

        logger.info(f"⏩ Seek to position: {position:.2f} beats")

    def get_playback_state(self) -> PlaybackState:
        """Get current playback state"""
        return {
            "is_playing": self.is_playing,
            "current_sequence": self.composition_state_service.current_composition_id,  # Keep key name for backwards compatibility
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

    # ========================================================================
    # COMPOSITION SETTINGS (Tempo/Loop)
    # ========================================================================

    async def set_tempo(self, composition_id: str, tempo: float) -> None:
        """Set tempo for a composition"""
        composition = self.composition_state_service.get_composition(composition_id)
        if not composition:
            logger.error(f"❌ Composition {composition_id} not found")
            return

        composition.tempo = tempo
        self.tempo = tempo  # Update global tempo for playback
        composition.updated_at = datetime.now()
        logger.info(f"🎵 Set tempo to {tempo} BPM for composition {composition_id}")

    async def set_loop(
        self,
        composition_id: str,
        enabled: bool,
        start: Optional[float] = None,
        end: Optional[float] = None
    ) -> None:
        """Set loop settings for a composition"""
        composition = self.composition_state_service.get_composition(composition_id)
        if not composition:
            logger.error(f"❌ Composition {composition_id} not found")
            return

        composition.loop_enabled = enabled
        if start is not None:
            composition.loop_start = start
        if end is not None:
            composition.loop_end = end

        composition.updated_at = datetime.now()
        logger.info(f"🔁 Set loop: enabled={enabled}, start={composition.loop_start}, end={composition.loop_end}")

    # ========================================================================
    # CLIP LAUNCHER (PERFORMANCE MODE)
    # ========================================================================

    async def _clip_launcher_playback_loop(self, composition_id: str) -> None:
        """
        Independent playback loop for clip launcher

        This runs separately from timeline playback and manages:
        - Timing for quantized clip launches
        - WebSocket updates for playing clips
        - Tempo/clock for clip launcher

        Runs continuously as long as ANY clips are playing
        """
        try:
            logger.info("🎬 Starting clip launcher playback loop")
            self.clip_launcher_start_time = time.time()
            self.clip_launcher_beat_position = 0.0
            self.last_metronome_beat = -1  # Reset metronome
            loop_count = 0
            last_update_time = self.clip_launcher_start_time

            while self.clip_launcher_active:
                loop_start = time.time()
                loop_count += 1

                # Get composition
                composition = self.composition_state_service.get_composition(composition_id)
                if not composition:
                    logger.error(f"❌ Composition {composition_id} not found")
                    break

                # Use composition tempo
                self.tempo = composition.tempo

                # Update beat position based on elapsed time
                current_time = time.time()
                elapsed_seconds = current_time - last_update_time
                elapsed_beats = (elapsed_seconds / 60.0) * self.tempo
                self.clip_launcher_beat_position += elapsed_beats
                last_update_time = current_time

                # Log beat position every 4 beats (1 bar in 4/4)
                if loop_count % 60 == 0:  # Every ~1 second at 60Hz
                    logger.debug(f"🎵 Clip launcher beat: {self.clip_launcher_beat_position:.2f}")

                # Trigger metronome clicks on beat boundaries
                if self.metronome_enabled and self.engine_manager:
                    current_beat_int = int(self.clip_launcher_beat_position)
                    if current_beat_int != self.last_metronome_beat:
                        self.last_metronome_beat = current_beat_int

                        # Determine if this is a downbeat (first beat of bar)
                        is_downbeat = (current_beat_int % 4) == 0

                        # Trigger metronome click
                        node_id = self.engine_manager.allocate_node_id()
                        freq = 1200.0 if is_downbeat else 800.0  # Higher pitch for downbeat

                        self.engine_manager.send_message(
                            "/s_new",
                            "metronome",
                            node_id,
                            0,  # addAction
                            1,  # target
                            "freq", freq,
                            "amp", self.metronome_volume,
                            "out", 0  # Master output
                        )

                        logger.debug(f"🎵 Metronome click: beat {current_beat_int} {'(DOWNBEAT)' if is_downbeat else ''}")

                # Send WebSocket updates (every 60Hz = ~16ms)
                if self.websocket_manager and loop_count % 1 == 0:
                    transport_data = {
                        "type": "transport",
                        "is_playing": self.is_playing,  # Timeline playback
                        "is_paused": self.is_paused,
                        "position_beats": self.playhead_position,
                        "position_seconds": self.playhead_position * (60.0 / self.tempo),
                        "tempo": self.tempo,
                        "time_signature_num": 4,
                        "time_signature_den": 4,
                        "loop_enabled": composition.loop_enabled,
                        "loop_start": composition.loop_start,
                        "loop_end": composition.loop_end,
                        "metronome_enabled": self.metronome_enabled,
                        "active_notes": [],
                        # Clip launcher state (CRITICAL for UI updates)
                        "playing_clips": list(self.launcher_active_synths.keys()),
                        "triggered_clips": list(self.triggered_clips.keys()),
                    }
                    await self.websocket_manager.broadcast_transport(transport_data)

                # Check if we should stop the loop (no more active clips)
                if not self.launcher_active_synths and not self.triggered_clips:
                    logger.info("🛑 No more active clips - stopping clip launcher loop")
                    self.clip_launcher_active = False
                    self.clip_launcher_beat_position = 0.0  # Reset beat position
                    self.last_metronome_beat = -1  # Reset metronome
                    break

                # Sleep to maintain ~60Hz update rate
                loop_duration = time.time() - loop_start
                sleep_time = max(0.0, (1.0 / 60.0) - loop_duration)
                await asyncio.sleep(sleep_time)

        except asyncio.CancelledError:
            logger.info("🛑 Clip launcher playback loop cancelled")
            raise
        except Exception as e:
            logger.error(f"❌ Error in clip launcher playback loop: {e}", exc_info=True)
            self.clip_launcher_active = False

    def _calculate_next_quantization_boundary(
        self,
        current_position: float,
        quantization: str,
        tempo: float
    ) -> float:
        """
        Calculate the next quantization boundary in beats

        Args:
            current_position: Current playhead position in beats
            quantization: Quantization setting ('none', '1/4', '1/2', '1', '2', '4')
            tempo: Current tempo in BPM

        Returns:
            Next quantization boundary in beats
        """
        if quantization == 'none':
            return current_position  # Launch immediately

        # Parse quantization value to beats
        quantization_beats = {
            '1/4': 0.25,  # Quarter note
            '1/2': 0.5,   # Half note
            '1': 1.0,     # 1 bar (4 beats in 4/4 time)
            '2': 2.0,     # 2 bars
            '4': 4.0,     # 4 bars
        }.get(quantization, 1.0)  # Default to 1 bar

        # Calculate next boundary
        # Example: position=6.3, quantization=1.0 → next_boundary=7.0
        # Example: position=6.3, quantization=0.25 → next_boundary=6.5
        next_boundary = ((current_position // quantization_beats) + 1) * quantization_beats

        return next_boundary

    async def launch_clip(self, composition_id: str, clip_id: str) -> None:
        """
        Launch a clip in performance mode with quantization

        The clip will loop continuously until stopped.
        This is different from timeline playback - clips play independently.

        Respects composition.launch_quantization setting:
        - 'none': Launch immediately
        - '1/4', '1/2', '1', '2', '4': Wait for next beat/bar boundary

        IMPORTANT: Only one clip per track can play at a time (exclusive playback).
        Launching a new clip on a track will stop any other clips on that track.
        """
        composition = self.composition_state_service.get_composition(composition_id)
        if not composition:
            logger.error(f"❌ Composition {composition_id} not found")
            return

        # Find clip
        clip = next((c for c in composition.clips if c.id == clip_id), None)
        if not clip:
            logger.error(f"❌ Clip {clip_id} not found")
            return

        # EXCLUSIVE PLAYBACK: Stop all other clips on the same track
        # (Only one clip per column/track can play at a time)
        clips_to_stop = []
        for active_clip_id in list(self.active_synths.keys()):
            active_clip = next((c for c in composition.clips if c.id == active_clip_id), None)
            if active_clip and active_clip.track_id == clip.track_id and active_clip_id != clip_id:
                clips_to_stop.append(active_clip_id)

        # Also check triggered clips (waiting for quantization)
        for triggered_clip_id in list(self.triggered_clips.keys()):
            triggered_clip = next((c for c in composition.clips if c.id == triggered_clip_id), None)
            if triggered_clip and triggered_clip.track_id == clip.track_id and triggered_clip_id != clip_id:
                clips_to_stop.append(triggered_clip_id)

        # Stop all clips on this track
        for clip_id_to_stop in clips_to_stop:
            logger.info(f"🛑 Stopping clip {clip_id_to_stop} (exclusive playback - same track)")
            await self.stop_clip(clip_id_to_stop)

        # If this specific clip is already playing or triggered, cancel and restart - CLIP LAUNCHER
        if clip_id in self.launcher_active_synths:
            await self.stop_clip(clip_id)
        if clip_id in self.triggered_clips:
            self.triggered_clips[clip_id].cancel()
            del self.triggered_clips[clip_id]

        # Get quantization setting
        quantization = composition.launch_quantization or 'none'

        # Launch with quantization
        if quantization == 'none' or not self.clip_launcher_active:
            # Launch immediately if no quantization or clip launcher not running yet
            logger.info(f"🎬 Launching clip '{clip.name}' immediately (quantization: {quantization})")
            await self._launch_clip_immediately(composition_id, clip_id)
        else:
            # Schedule launch for next quantization boundary
            logger.info(f"⏱️  Scheduling clip '{clip.name}' for next {quantization} bar boundary")

            # Create a task that waits for the quantization boundary
            async def quantized_launch():
                # Wait for next quantization boundary
                await self._wait_for_quantization_boundary(composition_id, quantization)
                # Launch the clip
                if clip_id in self.triggered_clips:  # Check if still triggered
                    await self._launch_clip_immediately(composition_id, clip_id)
                    # Remove from triggered clips
                    if clip_id in self.triggered_clips:
                        del self.triggered_clips[clip_id]

            # Store the task in triggered_clips
            task = asyncio.create_task(quantized_launch())
            self.triggered_clips[clip_id] = task

        # Start clip launcher playback loop if not already running
        if not self.clip_launcher_active:
            logger.info("🚀 Starting clip launcher playback loop")
            self.clip_launcher_active = True
            self.clip_launcher_start_time = time.time()
            self.clip_launcher_task = asyncio.create_task(
                self._clip_launcher_playback_loop(composition_id)
            )

    async def _wait_for_quantization_boundary(self, composition_id: str, quantization: str) -> None:
        """
        Wait until the next quantization boundary

        Quantization values:
        - '1/4': Next quarter note (0.25 bars)
        - '1/2': Next half note (0.5 bars)
        - '1': Next bar (1 bar)
        - '2': Next 2 bars
        - '4': Next 4 bars
        """
        composition = self.composition_state_service.get_composition(composition_id)
        if not composition:
            return

        # Parse quantization value
        quant_bars = {
            '1/4': 0.25,
            '1/2': 0.5,
            '1': 1.0,
            '2': 2.0,
            '4': 4.0,
        }.get(quantization, 1.0)

        # Calculate next boundary using clip launcher beat position
        beats_per_bar = 4.0  # Assuming 4/4 time signature
        quant_beats = quant_bars * beats_per_bar

        # Find next boundary
        current_beat = self.clip_launcher_beat_position
        current_position_in_cycle = current_beat % quant_beats
        beats_until_boundary = quant_beats - current_position_in_cycle

        # Convert to seconds
        seconds_until_boundary = (beats_until_boundary / composition.tempo) * 60.0

        logger.info(f"⏱️  Current beat: {current_beat:.2f}, waiting {seconds_until_boundary:.3f}s ({beats_until_boundary:.2f} beats) until next {quantization} boundary")

        # Wait
        await asyncio.sleep(seconds_until_boundary)

    async def _launch_clip_immediately(self, composition_id: str, clip_id: str) -> None:
        """
        Launch a clip immediately without quantization

        Internal method called by launch_clip() after quantization delay
        """
        composition = self.composition_state_service.get_composition(composition_id)
        if not composition:
            logger.error(f"❌ Composition {composition_id} not found")
            return

        # Find clip
        clip = next((c for c in composition.clips if c.id == clip_id), None)
        if not clip:
            logger.error(f"❌ Clip {clip_id} not found")
            return

        logger.info(f"🎵 Launching clip '{clip.name}' NOW (ID: {clip_id}, type: {clip.type})")

        # Get track for bus routing
        track = next((t for t in composition.tracks if t.id == clip.track_id), None)
        if not track:
            logger.error(f"❌ Track {clip.track_id} not found for clip {clip_id}")
            return

        # Get track bus from mixer
        track_bus = 0  # Default to master bus
        if self.audio_bus_manager:
            bus = self.audio_bus_manager.get_track_bus(track.id)
            if bus is not None:
                track_bus = bus

        if clip.type == "audio":
            # Launch audio clip
            await self._launch_audio_clip(clip, track_bus)
        elif clip.type == "midi":
            # Launch MIDI clip
            await self._launch_midi_clip(clip, track_bus, composition.tempo)

        logger.info(f"✅ Clip '{clip.name}' launched successfully")

    async def _launch_audio_clip(self, clip, bus: int) -> None:
        """Launch an audio clip (sample playback with looping)"""
        try:
            # Allocate node ID
            node_id = self.engine_manager.allocate_node_id()

            # Get sample buffer ID
            # TODO: Implement buffer management for samples
            # For now, use a placeholder
            buffer_id = 0  # This should come from buffer manager

            # Create looping sample player synth
            # Using 'samplePlayer' SynthDef (should be defined in playback.scd)
            self.engine_manager.send_message(
                "/s_new",
                "samplePlayer",  # SynthDef name
                node_id,
                0,  # addAction: addToHead
                1,  # target: default group
                "bufnum", buffer_id,
                "rate", 1.0,
                "amp", 0.8,
                "loop", 1,  # Enable looping
                "out", bus
            )

            # Store active synth - CLIP LAUNCHER
            self.launcher_active_synths[clip.id] = node_id

            logger.info(f"🎵 Audio clip launched: node={node_id}, buffer={buffer_id}, bus={bus}")

        except Exception as e:
            logger.error(f"❌ Failed to launch audio clip: {e}")

    async def _launch_midi_clip(self, clip, bus: int, tempo: float) -> None:
        """Launch a MIDI clip (looping MIDI pattern)"""
        try:
            # For MIDI clips, we need to continuously trigger notes in a loop
            # This is more complex than audio - we'll schedule note events

            if not clip.midi_events:
                logger.warning(f"⚠️  MIDI clip {clip.id} has no MIDI events")
                return

            # Calculate clip duration in seconds
            clip_duration_beats = clip.duration
            clip_duration_seconds = (clip_duration_beats / tempo) * 60.0

            # Create a task that loops the MIDI pattern - CLIP LAUNCHER
            async def midi_loop_task():
                loop_count = 0
                while clip.id in self.launcher_active_synths:
                    loop_count += 1
                    logger.info(f"🔁 MIDI clip loop iteration {loop_count} for clip {clip.id}")

                    # Trigger all notes in the clip
                    for i, note in enumerate(clip.midi_events):
                        if clip.id not in self.launcher_active_synths:
                            logger.info(f"🛑 Clip {clip.id} stopped during loop")
                            break

                        # Calculate note timing relative to clip start (FIX: use note.start_time)
                        note_time_beats = note.start_time - clip.start_time
                        note_delay = (note_time_beats / tempo) * 60.0

                        logger.info(f"   Note {i+1}/{len(clip.midi_events)}: delay={note_delay:.2f}s")

                        # Schedule note
                        if note_delay > 0:
                            await asyncio.sleep(note_delay)

                        if clip.id in self.launcher_active_synths:
                            # Trigger note
                            await self._trigger_midi_note(note, bus, tempo)

                    # Wait for clip to finish, then loop
                    logger.info(f"🔁 Waiting {clip_duration_seconds:.2f}s before next loop")
                    await asyncio.sleep(clip_duration_seconds)

            # Start the loop task
            task = asyncio.create_task(midi_loop_task())
            self.timeline_midi_note_tasks.add(task)  # Note: MIDI clip launcher uses timeline tasks for now

            # Mark clip as active (use a placeholder node ID) - CLIP LAUNCHER
            self.launcher_active_synths[clip.id] = -1  # Negative ID for MIDI clips

            logger.info(f"🎹 MIDI clip loop started: duration={clip_duration_seconds:.2f}s, notes={len(clip.midi_events)}")

        except Exception as e:
            logger.error(f"❌ Failed to launch MIDI clip: {e}")

    async def _trigger_midi_note(self, note, bus: int, tempo: float) -> None:
        """Trigger a single MIDI note"""
        try:
            # Allocate node ID
            node_id = self.engine_manager.allocate_node_id()

            # Convert MIDI note to frequency (FIX: use note.note, not note.pitch)
            freq = 440.0 * (2.0 ** ((note.note - 69) / 12.0))

            # Calculate duration in seconds
            duration_seconds = (note.duration / tempo) * 60.0

            # Get synth name (default to sine wave)
            synth_name = "sine"  # TODO: Get from track instrument

            logger.info(f"🎵 Triggering MIDI note: note={note.note}, freq={freq:.2f}Hz, amp={note.velocity / 127.0:.2f}, dur={duration_seconds:.2f}s, bus={bus}")

            # Trigger note
            self.engine_manager.send_message(
                "/s_new",
                synth_name,
                node_id,
                0,  # addAction
                1,  # target
                "freq", freq,
                "amp", note.velocity / 127.0,
                "gate", 1,
                "out", bus
            )

            # Schedule note release
            await asyncio.sleep(duration_seconds)
            logger.info(f"🔇 Releasing MIDI note: node={node_id}")
            self.engine_manager.send_message("/n_set", node_id, "gate", 0)

        except Exception as e:
            logger.error(f"❌ Failed to trigger MIDI note: {e}", exc_info=True)

    async def stop_clip(self, clip_id: str) -> None:
        """Stop a playing or triggered clip - CLIP LAUNCHER"""
        # Cancel triggered clip if waiting for quantization
        if clip_id in self.triggered_clips:
            self.triggered_clips[clip_id].cancel()
            del self.triggered_clips[clip_id]
            logger.info(f"⏹️  Cancelled triggered clip {clip_id}")
            return

        # Stop playing clip
        if clip_id not in self.launcher_active_synths:
            logger.warning(f"⚠️  Clip {clip_id} is not playing or triggered")
            return

        node_id = self.launcher_active_synths[clip_id]

        # Free the synth (if it's an audio clip with positive node ID)
        if node_id > 0:
            self.engine_manager.send_message("/n_free", node_id)

        # Remove from active synths - CLIP LAUNCHER
        del self.launcher_active_synths[clip_id]

        logger.info(f"⏹️  Stopped clip {clip_id}")

    async def stop_all_clips(self) -> None:
        """Stop all playing and triggered clips - CLIP LAUNCHER"""
        # Cancel all triggered clips
        triggered_count = len(self.triggered_clips)
        for task in self.triggered_clips.values():
            task.cancel()
        self.triggered_clips.clear()

        # Stop all playing clips - CLIP LAUNCHER
        clip_ids = list(self.launcher_active_synths.keys())
        for clip_id in clip_ids:
            await self.stop_clip(clip_id)

        # Cancel all MIDI note tasks (timeline tasks used for clip launcher MIDI)
        for task in self.timeline_midi_note_tasks:
            task.cancel()
        self.timeline_midi_note_tasks.clear()

        total_stopped = len(clip_ids) + triggered_count
        logger.info(f"⏹️  Stopped all clips ({len(clip_ids)} playing, {triggered_count} triggered)")

