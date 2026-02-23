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
from typing import Dict, List, Optional
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

        # Playback state
        self.is_playing = False
        self.is_paused = False
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

