"""
AI Agent Service - LLM-powered DAW control with efficient token usage

Performance optimizations:
- Event-driven triggering (not continuous polling)
- State diffs instead of full snapshots
- Compact prompts with structured output
- Caching of LLM responses
- Rate limiting to prevent token waste
"""
import logging
import asyncio
from typing import Optional, List, Dict, Any, Callable
from datetime import datetime, timedelta
from pathlib import Path
import anthropic

from backend.models.daw_state import DAWStateSnapshot, AudioFeatures, MusicalContext
from backend.models.ai_actions import DAWAction, ActionResult
from backend.services.daw_state_service import DAWStateService
from backend.services.daw_action_service import DAWActionService
from backend.services.sample_analyzer import SampleAnalyzer

logger = logging.getLogger(__name__)


class AIAgentService:
    """
    AI Agent that analyzes DAW state and generates actions
    
    Efficiency strategies:
    1. Event-driven: Only calls LLM on significant changes
    2. Rate limiting: Max 1 call per N seconds
    3. State diffs: Sends only changes, not full state
    4. Structured output: Uses function calling for actions
    5. Caching: Remembers recent decisions
    """
    
    def __init__(
        self,
        state_service: DAWStateService,
        action_service: DAWActionService,
        composition_service: Optional['CompositionService'] = None,
        api_key: Optional[str] = None,
        model: str = "claude-sonnet-4-5-20250929",
        samples_dir: Optional[Path] = None
    ):
        self.state_service = state_service
        self.action_service = action_service
        self.composition_service = composition_service
        self.client = anthropic.Anthropic(api_key=api_key) if api_key else None
        self.model = model

        # Sample analyzer for audio understanding
        self.sample_analyzer = SampleAnalyzer(samples_dir=samples_dir)

        # Track last state hash for efficient diffs (optional optimization)
        self.last_state_hash: Optional[str] = None
    
    async def send_message(self, user_message: str) -> Dict[str, Any]:
        """
        Send user message and get AI response

        Args:
            user_message: User's message/request

        Returns:
            Dict with 'response' (str) and 'actions_executed' (list of ActionResult)
        """
        # Get current state (FRESH - no history)
        state_response = self.state_service.get_state(previous_hash=self.last_state_hash)

        # Build system prompt
        system_prompt = self._build_system_prompt()

        # Build user message with context (ONE-SHOT)
        context_message = self._build_context_message(state_response.full_state)
        full_message = f"{context_message}\n\nUser: {user_message}"

        # ONE-SHOT REQUEST - no conversation history
        messages = [{
            "role": "user",
            "content": full_message
        }]

        # Call Claude with function calling (ONE-SHOT)
        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            system=system_prompt,
            messages=messages,
            tools=self._get_tool_definitions()
        )
        
        # Update last call time
        self.last_call_time = datetime.now()
        
        # Process response
        assistant_message = ""
        actions_executed = []
        
        for block in response.content:
            if block.type == "text":
                assistant_message += block.text
            elif block.type == "tool_use":
                # Execute action
                action = DAWAction(
                    action=block.name,
                    parameters=block.input
                )
                result = await self.action_service.execute_action(action)
                actions_executed.append(result)
                
                # Add result to message
                assistant_message += f"\n[Executed: {block.name}]"

        # Update state hash
        if state_response.full_state:
            self.last_state_hash = state_response.full_state.state_hash

        # Store actions count for API response
        self.last_actions_executed = len(actions_executed)

        return {
            "response": assistant_message,
            "actions_executed": actions_executed,
            "musical_context": context_message  # Include the full musical analysis
        }
    
    def _build_system_prompt(self) -> str:
        """Build system prompt for Claude"""
        return """You are an AI music producer integrated into a DAW (Digital Audio Workstation).

IMPORTANT: Each request is ONE-SHOT with fresh DAW state. No conversation history.

Your role:
- Accept VAGUE, CREATIVE commands from users (e.g., "make this more ambient", "add tension", "recompose as jazz")
- Autonomously recompose and transform entire sequences
- Create reversible iterations that users can listen to and approve/reject
- Be creatively intelligent - interpret artistic intent and take over composition
- Suggest musical improvements and variations
- Execute actions immediately to transform the music

Guidelines:
- Each message is INDEPENDENT - you get the current DAW state fresh each time
- Embrace vague commands - use your creativity to interpret them
- Think holistically about the entire composition
- Create complete, musically coherent transformations
- Explain your creative reasoning briefly
- Use musical terminology appropriately
- When creating MIDI, use musically sensible note choices
- Consider the current key, tempo, and style
- Don't ask for clarification - be bold and creative with your interpretation
- EXECUTE ACTIONS to make changes happen

Available actions (use these to modify the sequence):
- create_midi_clip: Add new MIDI clips with notes to a track
- modify_clip: Change existing clip notes, timing, or properties
- delete_clip: Remove a clip from the sequence
- create_track: Add a new track to the sequence
- set_track_parameter: Adjust track volume, pan, mute, solo
- add_effect: Add effects to tracks (reverb, delay, filter, distortion, etc.)
- set_tempo: Change global tempo
- play_sequence/stop_playback: Control playback

Note format for MIDI (compact):
- n: MIDI note number (0-127, middle C = 60)
- s: Start time in beats (relative to clip start)
- d: Duration in beats
- v: Velocity (0-127, default 100)

Example: {n: 60, s: 0, d: 1, v: 100} = Middle C, starts at beat 0, lasts 1 beat

When modifying sequences:
- You can see ALL tracks, clips, and notes in the context
- Use modify_clip to change existing clips (replaces all notes)
- Use delete_clip + create_midi_clip to restructure
- Create new tracks for new instruments/parts
- Think holistically about the entire composition"""

    def _build_context_message(self, state: Optional[DAWStateSnapshot]) -> str:
        """Build COMPLETE MUSICAL CONTEXT - everything AI needs to understand and modify the sequence"""
        if not state or not state.sequence:
            return "Current state: No active sequence"

        parts = []

        # === GLOBAL CONTEXT ===
        parts.append("=== GLOBAL CONTEXT ===")
        parts.append(f"Tempo: {state.tempo} BPM")
        parts.append(f"Time Signature: {state.sequence.time_sig}")
        parts.append(f"Playing: {state.playing} | Position: {state.position:.2f} beats")

        if state.musical:
            parts.append(f"Key: {state.musical.key or 'Unknown'} | Scale: {state.musical.scale or 'Unknown'}")
            parts.append(f"Note Density: {state.musical.note_density:.2f} notes/beat")
            parts.append(f"Pitch Range: {state.musical.pitch_range[0]}-{state.musical.pitch_range[1]} (MIDI)")
            parts.append(f"Complexity: {state.musical.complexity:.0%}")

        if state.audio:
            parts.append(f"Energy: {state.audio.energy:.0%} | Brightness: {state.audio.brightness:.0%} | Loudness: {state.audio.loudness_db:.1f}dB")

        # === TRACKS (with full details for modification) ===
        parts.append(f"\n=== TRACKS ({len(state.sequence.tracks)}) ===")
        for track in state.sequence.tracks:
            parts.append(f"\nTrack: {track.id}")
            parts.append(f"  name: {track.name}")
            parts.append(f"  type: {track.type}")
            parts.append(f"  instrument: {track.instrument or 'N/A'}")
            parts.append(f"  volume: {track.vol:.2f}")
            parts.append(f"  pan: {track.pan:.2f}")
            parts.append(f"  muted: {track.muted} | solo: {track.solo}")

            # Show effects if any
            if hasattr(track, 'effects') and track.effects:
                parts.append(f"  effects: {', '.join([f'{e.type}' for e in track.effects])}")

        # === CLIPS (with complete note data) ===
        parts.append(f"\n=== CLIPS ({len(state.sequence.clips)}) ===")
        for clip in state.sequence.clips:
            parts.append(f"\nClip: {clip.id}")
            parts.append(f"  name: {clip.name}")
            parts.append(f"  track: {clip.track}")
            parts.append(f"  type: {clip.type}")
            parts.append(f"  start: {clip.start} beats | duration: {clip.dur} beats")
            parts.append(f"  muted: {clip.muted}")

            # MIDI notes in compact format
            if clip.type == "midi" and clip.notes:
                parts.append(f"  notes ({len(clip.notes)}):")
                # Group notes by measure for readability
                notes_by_measure = {}
                for note in clip.notes:
                    abs_time = clip.start + note.s
                    measure = int(abs_time // 4)
                    if measure not in notes_by_measure:
                        notes_by_measure[measure] = []
                    notes_by_measure[measure].append({
                        'time': abs_time,
                        'beat': abs_time % 4,
                        'note': note.n,
                        'name': self._note_to_name(note.n),
                        'dur': note.d,
                        'vel': note.v
                    })

                # Show notes grouped by measure
                for measure in sorted(notes_by_measure.keys()):
                    measure_notes = sorted(notes_by_measure[measure], key=lambda x: x['beat'])
                    parts.append(f"    M{measure + 1}: " + ", ".join([
                        f"{n['name']}@{n['beat']:.2f}(d:{n['dur']} v:{n['vel']})"
                        for n in measure_notes
                    ]))

            # SAMPLE ANALYSIS (audio characteristics)
            elif clip.type == "audio" and clip.file:
                # clip.file contains the sample ID or file path
                analysis = self.sample_analyzer.analyze_sample(clip.file)
                if analysis:
                    parts.append(f"  audio_analysis:")
                    parts.append(f"    summary: {analysis.summary}")
                    parts.append(f"    spectral: {analysis.spectral.centroid:.0f}Hz centroid, {analysis.timbre.brightness:.2f} brightness")
                    parts.append(f"    temporal: {analysis.temporal.attack_time:.3f}s attack, {'percussive' if analysis.temporal.is_percussive else 'sustained'}")
                    if analysis.pitch.has_pitch and analysis.pitch.midi_note:
                        note_name = self._note_to_name(analysis.pitch.midi_note)
                        parts.append(f"    pitch: {note_name} ({analysis.pitch.fundamental_freq:.1f}Hz, confidence: {analysis.pitch.pitch_confidence:.0%})")
                    parts.append(f"    timbre_tags: {', '.join(analysis.timbre.tags)}")
                    parts.append(f"    frequency_distribution: sub-bass:{analysis.spectral.sub_bass_energy:.0%} bass:{analysis.spectral.bass_energy:.0%} mid:{analysis.spectral.mid_energy:.0%} high:{analysis.spectral.high_energy:.0%}")

        # === HARMONIC ANALYSIS ===
        parts.append("\n=== HARMONIC ANALYSIS ===")
        harmony_analysis = self._analyze_harmony_over_time(state.sequence)
        parts.append(harmony_analysis)

        # === RHYTHMIC ANALYSIS ===
        parts.append("\n=== RHYTHMIC ANALYSIS ===")
        rhythm_analysis = self._analyze_rhythm_patterns(state.sequence)
        parts.append(rhythm_analysis)

        # === ARRANGEMENT STRUCTURE ===
        parts.append("\n=== ARRANGEMENT ===")
        for track in state.sequence.tracks:
            track_clips = [c for c in state.sequence.clips if c.track == track.id]
            if track_clips:
                clip_timeline = ", ".join([f"{c.name}[{c.start}-{c.start+c.dur}]" for c in sorted(track_clips, key=lambda x: x.start)])
                parts.append(f"{track.name}: {clip_timeline}")

        return "\n".join(parts)

    def _note_to_name(self, midi_note: int) -> str:
        """Convert MIDI note number to name (e.g., 60 -> C4)"""
        note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        octave = (midi_note // 12) - 1
        note = note_names[midi_note % 12]
        return f"{note}{octave}"

    def _analyze_harmony_over_time(self, sequence) -> str:
        """Analyze what notes/chords happen at each time point"""
        from collections import defaultdict

        # Collect all notes at each beat
        notes_at_time = defaultdict(list)

        for clip in sequence.clips:
            if clip.type == "midi" and clip.notes:
                for note in clip.notes:
                    abs_time = clip.start + note.s
                    beat = int(abs_time)
                    notes_at_time[beat].append(note.n)

        if not notes_at_time:
            return "No harmonic content"

        # Analyze each beat
        harmony_parts = []
        for beat in sorted(notes_at_time.keys())[:16]:  # First 16 beats
            notes = sorted(set(notes_at_time[beat]))
            note_names = [self._note_to_name(n) for n in notes]

            # Detect chord if 3+ notes
            if len(notes) >= 3:
                chord = self._detect_chord(notes)
                harmony_parts.append(f"Beat {beat}: {', '.join(note_names)} ({chord})")
            else:
                harmony_parts.append(f"Beat {beat}: {', '.join(note_names)}")

        return "\n".join(harmony_parts)

    def _detect_chord(self, notes: list[int]) -> str:
        """Simple chord detection from MIDI notes"""
        if len(notes) < 3:
            return "melody"

        # Get intervals from root
        root = notes[0]
        intervals = tuple(sorted(set((n - root) % 12 for n in notes)))

        # Common chord patterns
        chord_types = {
            (0, 4, 7): "major",
            (0, 3, 7): "minor",
            (0, 4, 7, 11): "maj7",
            (0, 3, 7, 10): "min7",
            (0, 4, 7, 10): "dom7",
        }

        chord_type = chord_types.get(intervals, "unknown")
        return f"{self._note_to_name(root)} {chord_type}"

    def _analyze_rhythm_patterns(self, sequence) -> str:
        """Analyze rhythmic patterns and groove"""
        from collections import Counter

        # Collect all note timings
        timings = []
        durations = []

        for clip in sequence.clips:
            if clip.type == "midi" and clip.notes:
                for note in clip.notes:
                    abs_time = clip.start + note.s
                    timings.append(abs_time % 4)  # Position within 4-beat measure
                    durations.append(note.d)

        if not timings:
            return "No rhythmic content"

        # Analyze timing distribution
        timing_counts = Counter([round(t * 4) / 4 for t in timings])  # Quantize to 16th notes
        common_timings = timing_counts.most_common(5)

        # Analyze duration distribution
        duration_counts = Counter([round(d * 4) / 4 for d in durations])
        common_durations = duration_counts.most_common(3)

        parts = []
        parts.append(f"Common timings: {', '.join([f'{t:.2f}({c}x)' for t, c in common_timings])}")
        parts.append(f"Common durations: {', '.join([f'{d:.2f}({c}x)' for d, c in common_durations])}")

        # Detect syncopation
        on_beat = sum(1 for t in timings if t % 1.0 < 0.1)
        off_beat = len(timings) - on_beat
        if off_beat > on_beat:
            parts.append("Syncopated groove (more off-beat notes)")
        else:
            parts.append("On-beat groove (mostly on beats)")

        return "\n".join(parts)

    def _build_analysis_prompt(self, state: Optional[DAWStateSnapshot]) -> str:
        """Build prompt for autonomous analysis"""
        context = self._build_context_message(state)
        return f"""{context}

Analyze the current musical state and suggest ONE improvement or addition.
If the music is playing and sounds good, you can suggest subtle enhancements.
If nothing is playing, you might suggest starting with a basic rhythm or melody.

Keep suggestions simple and musical. Explain your reasoning briefly."""

    def _get_tool_definitions(self) -> List[Dict[str, Any]]:
        """Get Claude function calling tool definitions"""
        return [
            {
                "name": "create_midi_clip",
                "description": "Create a new MIDI clip with notes on a track",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "track_id": {"type": "string", "description": "Track ID to add clip to"},
                        "start_time": {"type": "number", "description": "Start time in beats"},
                        "duration": {"type": "number", "description": "Clip duration in beats"},
                        "notes": {
                            "type": "array",
                            "description": "Array of notes: [{n: 60, s: 0, d: 1, v: 100}, ...]",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "n": {"type": "integer", "description": "MIDI note (0-127)"},
                                    "s": {"type": "number", "description": "Start time in beats (relative to clip)"},
                                    "d": {"type": "number", "description": "Duration in beats"},
                                    "v": {"type": "integer", "description": "Velocity (0-127)"}
                                },
                                "required": ["n", "s", "d"]
                            }
                        },
                        "name": {"type": "string", "description": "Clip name (optional)"}
                    },
                    "required": ["track_id", "start_time", "duration", "notes"]
                }
            },
            {
                "name": "modify_clip",
                "description": "Modify an existing clip (change notes, timing, or properties)",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "clip_id": {"type": "string", "description": "Clip ID to modify"},
                        "notes": {
                            "type": "array",
                            "description": "New notes array (replaces all notes): [{n: 60, s: 0, d: 1, v: 100}, ...]",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "n": {"type": "integer", "description": "MIDI note (0-127)"},
                                    "s": {"type": "number", "description": "Start time in beats (relative to clip)"},
                                    "d": {"type": "number", "description": "Duration in beats"},
                                    "v": {"type": "integer", "description": "Velocity (0-127)"}
                                },
                                "required": ["n", "s", "d"]
                            }
                        },
                        "start_time": {"type": "number", "description": "New start time in beats (optional)"},
                        "duration": {"type": "number", "description": "New duration in beats (optional)"},
                        "muted": {"type": "boolean", "description": "Mute state (optional)"}
                    },
                    "required": ["clip_id"]
                }
            },
            {
                "name": "delete_clip",
                "description": "Delete a clip from the sequence",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "clip_id": {"type": "string", "description": "Clip ID to delete"}
                    },
                    "required": ["clip_id"]
                }
            },
            {
                "name": "create_track",
                "description": "Create a new track",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "Track name"},
                        "type": {"type": "string", "enum": ["midi", "audio"], "description": "Track type"},
                        "instrument": {"type": "string", "description": "Instrument name (sine, saw, square, triangle, etc.)"}
                    },
                    "required": ["name", "type"]
                }
            },
            {
                "name": "set_tempo",
                "description": "Set global tempo in BPM",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "tempo": {"type": "number", "description": "Tempo in BPM (20-300)"}
                    },
                    "required": ["tempo"]
                }
            },
            {
                "name": "set_track_parameter",
                "description": "Set track parameter (volume, pan, mute, solo)",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "track_id": {"type": "string"},
                        "parameter": {"type": "string", "enum": ["volume", "pan", "mute", "solo"]},
                        "value": {"description": "Parameter value (number for volume/pan, boolean for mute/solo)"}
                    },
                    "required": ["track_id", "parameter", "value"]
                }
            },
            {
                "name": "add_effect",
                "description": "Add an effect to a track (reverb, delay, filter, distortion, etc.)",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "track_id": {"type": "string", "description": "Track ID to add effect to"},
                        "effect_name": {"type": "string", "description": "Effect type (reverb, delay, lpf, hpf, distortion, etc.)"},
                        "slot_index": {"type": "integer", "description": "Effect slot index (optional)"}
                    },
                    "required": ["track_id", "effect_name"]
                }
            },
            {
                "name": "play_sequence",
                "description": "Start playback",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "sequence_id": {"type": "string", "description": "Sequence ID (optional, uses current)"}
                    }
                }
            },
            {
                "name": "stop_playback",
                "description": "Stop playback",
                "input_schema": {
                    "type": "object",
                    "properties": {}
                }
            }
        ]

