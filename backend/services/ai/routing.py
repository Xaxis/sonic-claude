"""
Intent Routing System — Maps user requests to appropriate tool sets.

Uses LLM-based classification for accurate intent detection.
Musical intents (CREATE_BEAT, CREATE_ARRANGEMENT) are first-class citizens.
"""
import logging
import anthropic
from typing import Dict, Any, List, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class Intent(str, Enum):
    """User intent categories — musical intents are first-class."""
    CREATE_BEAT         = "create_beat"         # "make a trap beat", "add drums"
    CREATE_ARRANGEMENT  = "create_arrangement"  # "full song", "complete arrangement"
    CREATE_CONTENT      = "create_content"      # Single track/melody/chords
    MODIFY_CONTENT      = "modify_content"      # Edit existing notes/clips
    DELETE_CONTENT      = "delete_content"      # Remove tracks/clips
    ADD_EFFECTS         = "add_effects"         # FX chain modifications
    PLAYBACK_CONTROL    = "playback_control"    # Play/stop/tempo
    QUERY_STATE         = "query_state"         # Questions about the project
    GENERAL_CHAT        = "general_chat"        # Everything else


class IntentRouter:
    """
    Routes user requests to appropriate tool sets using LLM classification.
    Uses Claude Haiku for fast, cheap intent detection.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.client = anthropic.AsyncAnthropic(api_key=api_key) if api_key else None
        self.model = "claude-haiku-4-5-20251001"

    async def route(self, user_message: str, daw_state_summary: Optional[str] = None) -> Intent:
        """Route user message to intent category using LLM."""
        if not self.client:
            logger.warning("⚠️ No API key, defaulting to GENERAL_CHAT")
            return Intent.GENERAL_CHAT

        context = f"\n\nCurrent DAW state:\n{daw_state_summary}" if daw_state_summary else ""

        classification_prompt = f"""Classify this music production request into ONE category:

CREATE_BEAT: User wants a drum beat, percussion pattern, or rhythm track
  Examples: "make a trap beat", "add drums", "808 pattern", "4-on-the-floor", "drum loop"

CREATE_ARRANGEMENT: User wants a full multi-track song/section with multiple parts
  Examples: "full arrangement", "complete song", "verse and chorus", "start a track with everything"

CREATE_CONTENT: User wants one specific musical element (melody, bassline, chord pad, single track)
  Examples: "add a bass line", "create a chord progression", "add a lead synth", "make a piano melody"

MODIFY_CONTENT: User wants to edit existing content (change notes, add/remove notes, edit a clip)
  Examples: "change the melody", "add more notes", "edit the bass", "make the snare hit harder"

DELETE_CONTENT: User wants to remove something
  Examples: "delete the drum track", "remove the reverb", "clear everything"

ADD_EFFECTS: User wants to add/change FX processing
  Examples: "add reverb", "make it sound warmer", "add distortion", "put a delay on the lead"

PLAYBACK_CONTROL: User wants to control transport/tempo
  Examples: "play", "stop", "set tempo to 140", "loop this section"

QUERY_STATE: User is asking a question about the current project
  Examples: "what tracks do I have?", "what key is this in?", "how many bars?"

GENERAL_CHAT: General question, help request, or unclear
  Examples: "how do I...", "what is...", "can you explain"

User request: "{user_message}"{context}

Respond with ONLY the category name. No explanation."""

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=50,
                messages=[{"role": "user", "content": classification_prompt}]
            )
            intent_str = response.content[0].text.strip().upper()
            intent_map = {
                "CREATE_BEAT":        Intent.CREATE_BEAT,
                "CREATE_ARRANGEMENT": Intent.CREATE_ARRANGEMENT,
                "CREATE_CONTENT":     Intent.CREATE_CONTENT,
                "MODIFY_CONTENT":     Intent.MODIFY_CONTENT,
                "DELETE_CONTENT":     Intent.DELETE_CONTENT,
                "ADD_EFFECTS":        Intent.ADD_EFFECTS,
                "PLAYBACK_CONTROL":   Intent.PLAYBACK_CONTROL,
                "QUERY_STATE":        Intent.QUERY_STATE,
                "GENERAL_CHAT":       Intent.GENERAL_CHAT,
            }
            intent = intent_map.get(intent_str, Intent.GENERAL_CHAT)
            logger.info(f"🔀 LLM routed to {intent.value}")
            return intent
        except Exception as e:
            logger.error(f"❌ Intent routing failed: {e}, defaulting to GENERAL_CHAT")
            return Intent.GENERAL_CHAT

    def get_tools_for_intent(self, intent: Intent) -> List[str]:
        """Get relevant tool names for an intent — lean and focused."""
        tool_map = {
            Intent.CREATE_BEAT: [
                "compose_music",
                "set_tempo",          # tempo often specified alongside beat style
            ],
            Intent.CREATE_ARRANGEMENT: [
                "compose_music",
                "set_tempo",
            ],
            Intent.CREATE_CONTENT: [
                "compose_music",
                "set_tempo",
            ],
            Intent.MODIFY_CONTENT: [
                "edit_clip",
                "modify_clip",
                "move_clip",
                "split_clip",
                "set_clip_gain",
                "duplicate_clip",
                "change_track_instrument",  # "change the bass to a saw synth"
                "set_track_parameter",      # "make the hi-hats quieter" / solo / mute
                "rename_track",             # "rename this track to Lead"
            ],
            Intent.DELETE_CONTENT: [
                "delete_track",
                "delete_clip",
                "clear_composition",
            ],
            Intent.ADD_EFFECTS: [
                "add_effect",
                "set_effect_parameter",
                "bypass_effect",
                "remove_effect",
                "reorder_effects",
            ],
            Intent.PLAYBACK_CONTROL: [
                "play_composition",
                "stop_playback",
                "set_tempo",
                "set_track_parameter",  # "turn down the bass" / mute / solo
                "set_time_signature",   # "change to 3/4"
                "set_loop_points",      # "loop bars 1-8"
                "seek_to_position",     # "go to bar 5"
            ],
            Intent.QUERY_STATE: [],  # No tools — just state info
            Intent.GENERAL_CHAT: [
                "compose_music",
                "edit_clip",
                "set_track_parameter",      # volume / pan / mute / solo
                "change_track_instrument",  # swap synths
                "delete_track",
                "delete_clip",
                "add_effect",
                "set_effect_parameter",
                "play_composition",
                "stop_playback",
                "set_tempo",
            ],
        }
        tools = tool_map.get(intent, [])
        logger.info(f"🛠️  Tools for {intent.value}: {tools}")
        return tools

    def get_system_prompt_for_intent(
        self,
        intent: Intent,
        instruments_catalog: str,
        effects_list: str,
        kit_catalog: str,
        genre_profiles_summary: str,
    ) -> str:
        """
        Get a focused system prompt for each intent.

        Key principle: Claude specifies music SYMBOLICALLY.
        - Note names:   C4, F#3, Bb5  (NOT MIDI numbers)
        - Chord symbols: Am7, Cmaj, G7  (NOT note arrays)
        - Drum voices:  kick, snare, hihat_closed  (NOT MIDI numbers)
        Python converts all of this to MIDI automatically.
        """

        # Shared musical notation guide (injected into all music-creation prompts)
        NOTATION_GUIDE = """
MUSICAL NOTATION (always use these — Python handles MIDI conversion):
  Note names:    C4=middle C, A3=A below middle C, F#5, Bb2, Eb4, G#3
  Chord symbols: Am (A minor), Cmaj7, G7, Dm9, sus4, Bb, F#m, Ebmaj7
  Drum voices:   kick, snare, clap, rim, hihat_closed, hihat_open, hihat_pedal,
                 tom_low, tom_mid, tom_high, crash, ride, cowbell, conga_hi, etc.

BEAT POSITIONS (4/4 time, beats 0–3.75 per bar):
  Beat 0.0 = downbeat   Beat 1.0 = beat 2   Beat 2.0 = beat 3   Beat 3.0 = beat 4
  16th notes: 0.0, 0.25, 0.5, 0.75, 1.0, 1.25 ...
  8th notes:  0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5
"""

        prompts = {

            Intent.CREATE_BEAT: f"""You are a music production AI. Create drum beats and percussion.

Use compose_music with drum_pattern or kit_pattern:
- kit_pattern: SIMPLEST — use a kit's built-in pattern directly
- drum_pattern: CUSTOM — specify voices + beat positions manually

{kit_catalog}
{NOTATION_GUIDE}
Examples:
  Kit pattern (easiest): {{"kit_pattern": {{"kit_id": "trap-kit"}}}}
  Custom pattern: {{"drum_pattern": {{"kit_id": "trap-kit", "voices": [
    {{"voice": "kick", "beats": [0.0, 2.5], "velocities": [110, 95]}},
    {{"voice": "snare", "beats": [1.0, 3.0], "velocities": [100]}},
    {{"voice": "hihat_closed", "beats": [0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75], "velocities": [80, 50]}}
  ]}}}}

{genre_profiles_summary}

Be decisive. Pick an appropriate kit and create a musical pattern.""",

            Intent.CREATE_ARRANGEMENT: f"""You are a music production AI. Create complete multi-track arrangements.

Use compose_music with MULTIPLE tracks in a single call:
1. Drums: kit_pattern or drum_pattern
2. Bass: note_sequence in octave 2-3 (e.g. A2, C2, F2)
3. Chords: chord_pattern (Am, F, C, G etc.)
4. Lead/melody: note_sequence in octave 4-5

{kit_catalog}
{NOTATION_GUIDE}
{instruments_catalog}

GENRE PROFILES (suggested settings by genre):
{genre_profiles_summary}

Always create at least drums + bass + chords. Add a lead melody if appropriate.
All tracks in ONE compose_music call for a coherent result.""",

            Intent.CREATE_CONTENT: f"""You are a music production AI. Create musical content.

Use compose_music to create tracks. Specify content type:
- note_sequence: melodies, basslines, arpeggios (use note NAMES: C4, F#3, Bb5)
- chord_pattern: harmonic content (use chord symbols: Am7, Cmaj7, G7)
- drum_pattern or kit_pattern: rhythmic content

{kit_catalog}
{NOTATION_GUIDE}
{instruments_catalog}

Bass lines: use octaves 1-3 (A2, C2, F2, G2 etc.)
Melodies:   use octaves 4-6 (C5, E4, G#4 etc.)
Chords:     use octave 3-5 with voicing: "closed" / "open" / "spread"

Think about harmonic context. Ask: what key, what scale, what instrument?""",

            Intent.MODIFY_CONTENT: f"""You are a music production AI. Edit existing musical content.

Use edit_clip to modify clips:
  mode "add":     add new notes without removing existing ones
  mode "replace": completely replace notes (careful — destructive)
  mode "remove":  remove specific notes

{NOTATION_GUIDE}

For note edits, ALWAYS use note names (C4, A#3) — Python converts to MIDI.
For melodic context, consider the existing notes in the clip before changing.""",

            Intent.DELETE_CONTENT: """You are a music production AI. Delete content.

Use delete_track, delete_clip, or clear_composition.
Confirm what to delete if ambiguous. Warn if deletion would remove significant work.""",

            Intent.ADD_EFFECTS: f"""You are a music production AI. Add and configure effects.

Use add_effect / modify_effect / remove_effect.

{effects_list}

Effect guidance:
  reverb:     space, ambience, depth
  delay:      echo, rhythmic interest
  lpf:        warmth, remove harshness
  hpf:        clarity, remove muddiness
  distortion: grit, saturation, aggression
  compressor: tightness, punch
  chorus:     width, shimmer
  phaser:     movement, swirling""",

            Intent.PLAYBACK_CONTROL: """You are a music production AI. Control playback.

Available: play_composition, stop_playback, set_tempo.
Be direct and responsive.""",

            Intent.QUERY_STATE: """You are a music production AI. Answer questions about the current composition.

Analyze the DAW state and answer clearly:
- What tracks exist (names, instruments)
- What clips are present (position, content)
- Current settings (tempo, key, effects)
- Musical analysis (patterns, harmony, rhythm)

Be informative and specific.""",

            Intent.GENERAL_CHAT: f"""You are a music production AI with full creative control.

Use compose_music for all creation (tracks, beats, melodies, chords).
Use edit_clip to modify existing content.
Use add_effect / remove_effect for effects.

{kit_catalog}
{NOTATION_GUIDE}
{instruments_catalog}

Think like a producer: genre, key, tempo, arrangement, vibe.
Be bold and creative. Execute actions to make music happen.""",
        }

        return prompts.get(intent, prompts[Intent.GENERAL_CHAT])
