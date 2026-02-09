"""
Sequencer service - Pattern sequencing and timeline playback
"""
import logging
import asyncio
from typing import Dict, List, Optional
from ..core.engine_manager import AudioEngineManager
from ..models.sequence import Sequence, Clip, MIDINote, MIDIClip, AudioClip
from ..services.synthesis_service import SynthesisService

logger = logging.getLogger(__name__)


class SequencerService:
    """
    Sequencer service
    Manages sequences, pattern playback, MIDI scheduling, and automation
    """

    def __init__(
        self,
        engine: AudioEngineManager,
        synthesis_service: SynthesisService
    ):
        """
        Initialize sequencer service

        Args:
            engine: Audio engine manager instance
            synthesis_service: Synthesis service for creating synths
        """
        self.engine = engine
        self.synthesis = synthesis_service

        # Sequence storage
        self.sequences: Dict[str, Sequence] = {}

        # Playback state
        self.current_sequence: Optional[str] = None
        self.is_playing = False
        self.playhead_position = 0.0  # In beats
        self.tempo = 120.0  # BPM

        # Scheduling
        self.scheduler_task: Optional[asyncio.Task] = None
        self.active_notes: Dict[int, int] = {}  # synth_id -> note

        logger.info("SequencerService initialized")

    # ===== SEQUENCE MANAGEMENT =====

    def create_sequence(
        self,
        name: str,
        tempo: float = 120.0,
        time_signature: str = "4/4"
    ) -> Sequence:
        """
        Create a new sequence

        Args:
            name: Sequence name
            tempo: Tempo in BPM
            time_signature: Time signature (e.g., "4/4")

        Returns:
            Sequence instance
        """
        sequence_id = f"seq_{len(self.sequences)}"

        sequence = Sequence(
            id=sequence_id,
            name=name,
            tempo=tempo,
            time_signature=time_signature
        )

        self.sequences[sequence_id] = sequence
        logger.info(f"Created sequence: {name} ({sequence_id})")

        return sequence

    def get_sequence(self, sequence_id: str) -> Optional[Sequence]:
        """Get sequence by ID"""
        return self.sequences.get(sequence_id)

    def delete_sequence(self, sequence_id: str):
        """Delete a sequence"""
        if sequence_id in self.sequences:
            # Stop if currently playing
            if self.current_sequence == sequence_id:
                asyncio.create_task(self.stop())

            del self.sequences[sequence_id]
            logger.info(f"Deleted sequence: {sequence_id}")

    def get_all_sequences(self) -> List[Sequence]:
        """Get all sequences"""
        return list(self.sequences.values())

    # ===== CLIP MANAGEMENT =====

    def add_clip(self, sequence_id: str, clip: Clip):
        """Add clip to sequence"""
        if sequence_id not in self.sequences:
            raise ValueError(f"Sequence {sequence_id} not found")

        sequence = self.sequences[sequence_id]
        sequence.add_clip(clip)
        logger.info(f"Added clip {clip.id} to sequence {sequence_id}")

    def remove_clip(self, sequence_id: str, clip_id: str):
        """Remove clip from sequence"""
        if sequence_id not in self.sequences:
            raise ValueError(f"Sequence {sequence_id} not found")

        sequence = self.sequences[sequence_id]
        sequence.remove_clip(clip_id)
        logger.info(f"Removed clip {clip_id} from sequence {sequence_id}")

    def update_clip(self, sequence_id: str, clip_id: str, **updates):
        """Update clip properties"""
        if sequence_id not in self.sequences:
            raise ValueError(f"Sequence {sequence_id} not found")

        sequence = self.sequences[sequence_id]
        clip = sequence.get_clip(clip_id)

        if not clip:
            raise ValueError(f"Clip {clip_id} not found")

        # Update clip properties
        for key, value in updates.items():
            if hasattr(clip, key):
                setattr(clip, key, value)

        logger.debug(f"Updated clip {clip_id} in sequence {sequence_id}")

    # ===== PLAYBACK CONTROL =====

    async def play(self, sequence_id: str, start_position: float = 0.0):
        """
        Start playing a sequence

        Args:
            sequence_id: Sequence ID to play
            start_position: Starting position in beats
        """
        if sequence_id not in self.sequences:
            raise ValueError(f"Sequence {sequence_id} not found")

        sequence = self.sequences[sequence_id]
        self.tempo = sequence.tempo

        # Start scheduler task
        self.scheduler_task = asyncio.create_task(self._scheduler_loop())

        logger.info(f"Started playback of sequence {sequence_id} at position {start_position}")

    async def stop(self):
        """Stop playback"""
        if not self.is_playing:
            return

        self.is_playing = False

        # Cancel scheduler task
        if self.scheduler_task:
            self.scheduler_task.cancel()
            try:
                await self.scheduler_task
            except asyncio.CancelledError:
                pass
            self.scheduler_task = None

        # Stop all active notes
        for synth_id in list(self.active_notes.keys()):
            await self.synthesis.free_synth(synth_id)
        self.active_notes.clear()

        logger.info("Stopped playback")

    async def pause(self):
        """Pause playback (maintains position)"""
        if self.is_playing:
            self.is_playing = False
            if self.scheduler_task:
                self.scheduler_task.cancel()
                try:
                    await self.scheduler_task
                except asyncio.CancelledError:
                    pass
                self.scheduler_task = None
            logger.info(f"Paused playback at position {self.playhead_position}")

    async def resume(self):
        """Resume playback from current position"""
        if not self.is_playing and self.current_sequence:
            self.is_playing = True
            self.scheduler_task = asyncio.create_task(self._scheduler_loop())
            logger.info(f"Resumed playback at position {self.playhead_position}")

    def set_tempo(self, tempo: float):
        """Set playback tempo"""
        self.tempo = max(20.0, min(300.0, tempo))
        if self.current_sequence:
            sequence = self.sequences[self.current_sequence]
            sequence.tempo = self.tempo
        logger.debug(f"Set tempo to {self.tempo} BPM")

    def seek(self, position: float):
        """Seek to position in beats"""
        self.playhead_position = max(0.0, position)
        logger.debug(f"Seeked to position {self.playhead_position}")

    # ===== SCHEDULER =====

    async def _scheduler_loop(self):
        """Main scheduler loop - schedules and triggers events"""
        try:
            while self.is_playing and self.current_sequence:
                sequence = self.sequences[self.current_sequence]

                # Calculate time per beat
                beat_duration = 60.0 / self.tempo

                # Process clips at current playhead position
                await self._process_clips_at_position(sequence, self.playhead_position)

                # Advance playhead
                # Use small time step for accuracy (1/16th note)
                time_step = beat_duration / 4.0
                self.playhead_position += 0.25  # 1/16th note

                # Handle looping
                if sequence.is_looping:
                    if self.playhead_position >= sequence.loop_end:
                        self.playhead_position = sequence.loop_start

                # Sleep until next step
                await asyncio.sleep(time_step)

        except asyncio.CancelledError:
            logger.debug("Scheduler loop cancelled")
            raise
        except Exception as e:
            logger.error(f"Error in scheduler loop: {e}")
            self.is_playing = False

    async def _process_clips_at_position(self, sequence: Sequence, position: float):
        """Process all clips at the current playhead position"""
        for clip in sequence.clips:
            # Skip muted clips
            if clip.muted:
                continue

            # Check if clip is active at this position
            clip_end = clip.start_time + clip.duration
            if clip.start_time <= position < clip_end:
                # Calculate position within clip
                clip_position = position - clip.start_time

                # Process based on clip type
                if isinstance(clip.content, MIDIClip):
                    await self._process_midi_clip(clip, clip_position)
                elif isinstance(clip.content, AudioClip):
                    await self._process_audio_clip(clip, clip_position)

    async def _process_midi_clip(self, clip: Clip, clip_position: float):
        """Process MIDI clip at given position"""
        midi_clip = clip.content

        # Find notes that should trigger at this position
        # Use small tolerance for timing (1/64th note)
        tolerance = 0.015625

        for note in midi_clip.notes:
            # Check if note should start now
            if abs(note.time - clip_position) < tolerance:
                # Trigger note
                await self._trigger_midi_note(note, midi_clip.synthdef, clip.track_id)

            # Check if note should end now
            note_end = note.time + note.duration
            if abs(note_end - clip_position) < tolerance:
                # Release note
                await self._release_midi_note(note)

    async def _trigger_midi_note(self, note: MIDINote, synthdef: str, track_id: str):
        """Trigger a MIDI note"""
        try:
            # Convert MIDI note to frequency
            freq = 440.0 * (2.0 ** ((note.note - 69) / 12.0))

            # Create synth
            synth = await self.synthesis.create_synth(
                synthdef=synthdef,
                parameters={
                    "freq": freq,
                    "amp": note.velocity,
                    "gate": 1.0
                }
            )

            # Track active note
            self.active_notes[synth.id] = note.note

            logger.debug(f"Triggered note {note.note} on track {track_id}")

        except Exception as e:
            logger.error(f"Failed to trigger MIDI note: {e}")

    async def _release_midi_note(self, note: MIDINote):
        """Release a MIDI note"""
        # Find and release synth for this note
        for synth_id, note_num in list(self.active_notes.items()):
            if note_num == note.note:
                await self.synthesis.free_synth(synth_id)
                del self.active_notes[synth_id]
                logger.debug(f"Released note {note.note}")
                break

    async def _process_audio_clip(self, clip: Clip, clip_position: float):
        """Process audio clip at given position"""
        # TODO: Implement audio clip playback
        # This would trigger sample playback from the sampler service
        pass

    # ===== UTILITY METHODS =====

    def get_playback_state(self) -> dict:
        """Get current playback state"""
        return {
            "is_playing": self.is_playing,
            "current_sequence": self.current_sequence,
            "playhead_position": self.playhead_position,
            "tempo": self.tempo,
            "active_notes": len(self.active_notes)
        }

