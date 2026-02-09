"""
Timeline to Sonic Pi Converter
Converts timeline sequences to Sonic Pi code
"""
from typing import List, Dict
from backend.models.timeline import TimelineSequence, Track, Clip, MIDIEvent


class TimelineToSonicPiConverter:
    """Convert timeline sequences to Sonic Pi code"""
    
    def __init__(self):
        pass
    
    def convert_sequence(self, sequence: TimelineSequence) -> str:
        """Convert a complete timeline sequence to Sonic Pi code"""
        code_parts = []
        
        # Header
        code_parts.append(f"# {sequence.name}")
        code_parts.append(f"# Generated from Timeline Sequencer")
        code_parts.append("")
        code_parts.append(f"use_bpm {sequence.tempo}")
        code_parts.append("")
        
        # Generate live_loop for each track
        for track in sequence.tracks:
            if not track.clips or track.is_muted:
                continue
            
            track_code = self._generate_track_code(track, sequence)
            if track_code:
                code_parts.append(track_code)
                code_parts.append("")
        
        return "\n".join(code_parts)
    
    def _generate_track_code(self, track: Track, sequence: TimelineSequence) -> str:
        """Generate Sonic Pi code for a single track"""
        # Create safe loop name
        loop_name = track.name.lower().replace(" ", "_").replace("-", "_")
        loop_name = "".join(c for c in loop_name if c.isalnum() or c == "_")

        code_parts = []
        code_parts.append(f"live_loop :{loop_name} do")
        code_parts.append(f"  use_synth :{track.instrument}")

        # Apply track volume and pan
        if track.volume != 1.0:
            code_parts.append(f"  use_synth_defaults amp: {track.volume:.2f}")
        if track.pan != 0.0:
            code_parts.append(f"  use_synth_defaults pan: {track.pan:.2f}")

        code_parts.append("")

        # Sort clips by start time
        sorted_clips = sorted(track.clips, key=lambda c: c.start_time)

        # Calculate total loop duration (find the end of the last clip)
        loop_duration = 0.0
        for clip in sorted_clips:
            if not clip.is_muted:
                clip_end = clip.start_time + clip.duration
                loop_duration = max(loop_duration, clip_end)

        # If no clips or duration is 0, use a default of 4 beats
        if loop_duration == 0:
            loop_duration = 4.0

        # Round up to nearest bar for cleaner looping
        beats_per_bar = sequence.time_signature_numerator
        bars = int(loop_duration / beats_per_bar) + 1
        loop_duration = bars * beats_per_bar

        # Generate code for each clip
        current_time = 0.0
        for clip in sorted_clips:
            if clip.is_muted:
                continue

            # Add sleep to reach clip start time
            if clip.start_time > current_time:
                sleep_duration = clip.start_time - current_time
                code_parts.append(f"  sleep {sleep_duration:.2f}")
                current_time = clip.start_time

            # Generate clip code
            clip_code = self._generate_clip_code(clip, track)
            code_parts.extend([f"  {line}" for line in clip_code.split("\n") if line])

            current_time = clip.start_time + clip.duration

        # Sleep remaining time to complete the loop
        if current_time < loop_duration:
            code_parts.append(f"  sleep {loop_duration - current_time:.2f}")

        code_parts.append("end")

        return "\n".join(code_parts)
    
    def _generate_clip_code(self, clip: Clip, track: Track) -> str:
        """Generate Sonic Pi code for a single clip"""
        if clip.type == "midi" and clip.midi_events:
            return self._generate_midi_clip_code(clip)
        elif clip.type == "audio" and clip.audio_file_path:
            return self._generate_audio_clip_code(clip)
        else:
            return f"# Empty clip: {clip.name}"
    
    def _generate_midi_clip_code(self, clip: Clip) -> str:
        """Generate code for MIDI clip"""
        code_parts = []

        # Sort MIDI events by start time
        sorted_events = sorted(clip.midi_events, key=lambda e: e.start_time)

        if not sorted_events:
            return f"sleep {clip.duration:.2f}"

        current_time = 0.0
        for i, event in enumerate(sorted_events):
            # Sleep to event start
            if event.start_time > current_time:
                sleep_duration = event.start_time - current_time
                code_parts.append(f"sleep {sleep_duration:.2f}")
                current_time = event.start_time

            # Play note (non-blocking - release parameter controls sustain)
            velocity_amp = event.velocity / 127.0
            code_parts.append(
                f"play :{event.note_name.lower()}, "
                f"release: {event.duration:.2f}, "
                f"amp: {velocity_amp:.2f}"
            )

            # Move time forward to this note's start (not duration)
            # The next sleep will handle the gap to the next note
            # This allows notes to overlap/sustain while we move forward
            current_time = event.start_time

            # If this is the last note, sleep for its duration
            if i == len(sorted_events) - 1:
                code_parts.append(f"sleep {event.duration:.2f}")
                current_time += event.duration

        # Sleep remaining clip duration
        if current_time < clip.duration:
            code_parts.append(f"sleep {clip.duration - current_time:.2f}")

        return "\n".join(code_parts)
    
    def _generate_audio_clip_code(self, clip: Clip) -> str:
        """Generate code for audio clip"""
        code_parts = []
        
        # Extract sample name from path
        sample_name = clip.audio_file_path.split("/")[-1].replace(".wav", "")
        
        code_parts.append(f"sample '{clip.audio_file_path}'")
        
        if clip.audio_offset > 0:
            code_parts.append(f"  start: {clip.audio_offset:.2f}")
        
        code_parts.append(f"sleep {clip.duration:.2f}")
        
        return "\n".join(code_parts)
    
    def convert_transcription_to_timeline(
        self,
        transcription_result,
        sequence: TimelineSequence
    ) -> TimelineSequence:
        """Convert live transcription result to timeline tracks"""
        from backend.models.transcription import StemType
        
        # Map stem types to instruments
        stem_instruments = {
            StemType.DRUMS: "drum_heavy_kick",
            StemType.BASS: "bass_foundation",
            StemType.VOCALS: "prophet",
            StemType.OTHER: "blade",
        }
        
        # Create track for each stem
        for stem_analysis in transcription_result.stems:
            track_name = f"{stem_analysis.stem_type.value.title()} Track"
            instrument = stem_instruments.get(stem_analysis.stem_type, "piano")
            
            # Create track
            track = Track(
                id=f"track-{stem_analysis.stem_type.value}",
                name=track_name,
                color=self._get_stem_color(stem_analysis.stem_type),
                height=100,
                clips=[],
                instrument=instrument,
                midi_channel=len(sequence.tracks),
                volume=1.0,
                pan=0.0,
                is_muted=False,
                is_solo=False,
                is_armed=False,
            )
            
            # Create clip with MIDI events from notes
            if stem_analysis.notes:
                midi_events = [
                    MIDIEvent(
                        note=int(note.pitch),
                        note_name=note.note_name,
                        start_time=note.onset_time,
                        duration=note.duration,
                        velocity=int(note.velocity * 127),
                        channel=0,
                    )
                    for note in stem_analysis.notes
                ]
                
                # Calculate clip duration
                max_time = max((e.start_time + e.duration for e in midi_events), default=4.0)
                
                clip = Clip(
                    id=f"clip-{stem_analysis.stem_type.value}",
                    name=f"{stem_analysis.stem_type.value.title()} Clip",
                    type="midi",
                    track_id=track.id,
                    start_time=0.0,
                    duration=max_time,
                    color=self._get_stem_color(stem_analysis.stem_type),
                    midi_events=midi_events,
                    audio_offset=0.0,
                    is_muted=False,
                    is_looped=False,
                    loop_count=1,
                )
                
                track.clips.append(clip)
            
            sequence.tracks.append(track)
        
        return sequence
    
    def _get_stem_color(self, stem_type) -> str:
        """Get color for stem type"""
        from backend.models.transcription import StemType
        
        colors = {
            StemType.DRUMS: "#ef4444",  # red
            StemType.BASS: "#3b82f6",   # blue
            StemType.VOCALS: "#a855f7", # purple
            StemType.OTHER: "#10b981",  # green
        }
        return colors.get(stem_type, "#6b7280")

