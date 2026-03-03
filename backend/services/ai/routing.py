"""
Intent Routing System — Maps user requests to appropriate tool sets.

Uses LLM-based classification for accurate intent detection.
Musical intents (CREATE_BEAT, CREATE_ARRANGEMENT) are first-class citizens.
Genre is detected in the same Haiku call as intent — zero extra latency/cost.
"""
import asyncio
import json
import logging
import anthropic
from dataclasses import dataclass
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


@dataclass
class RouteResult:
    """Result from a single Haiku routing call — intent + genre in one shot."""
    intent: Intent
    genre: Optional[str] = None      # One of the 14 GENRE_PROFILES keys, or None


class IntentRouter:
    """
    Routes user requests to appropriate tool sets using LLM classification.
    Uses Claude Haiku for fast, cheap intent + genre detection in one call.
    """

    _RETRYABLE_STATUS = (529, 429)
    _BACKOFF = [1.0, 2.0, 4.0]

    def __init__(self, api_key: Optional[str] = None):
        self.client = anthropic.AsyncAnthropic(api_key=api_key) if api_key else None
        self.model = "claude-haiku-4-5-20251001"

    @staticmethod
    def _keyword_fallback(message: str) -> Intent:
        """Last-resort keyword-based intent detection when LLM routing fails."""
        msg = message.lower()
        keywords: Dict[Intent, List[str]] = {
            Intent.CREATE_BEAT:        ["beat", "drum", "kick", "snare", "808", "hi-hat", "hihat", "percussion", "rhythm"],
            Intent.CREATE_CONTENT:     ["melody", "bass", "chord", "lead", "pad", "arp", "bassline", "synth"],
            Intent.CREATE_ARRANGEMENT: ["song", "arrangement", "full track", "verse", "chorus", "complete"],
            Intent.MODIFY_CONTENT:     ["change", "edit", "modify", "adjust", "fix", "update", "alter"],
            Intent.DELETE_CONTENT:     ["delete", "remove", "clear", "erase", "wipe"],
            Intent.ADD_EFFECTS:        ["reverb", "delay", "effect", "eq", "compress", "distort", "chorus", "phaser"],
            Intent.PLAYBACK_CONTROL:   ["play", "stop", "tempo", "bpm", "loop", "pause"],
            Intent.QUERY_STATE:        ["what", "how many", "which", "show me", "list", "tell me"],
        }
        for intent, words in keywords.items():
            if any(w in msg for w in words):
                return intent
        return Intent.GENERAL_CHAT

    # Valid genre keys — must match GENRE_PROFILES keys exactly
    _VALID_GENRES = {
        "trap", "house", "techno", "dnb", "boom_bap", "lofi", "hip_hop",
        "afrobeats", "uk_garage", "jazz", "funk", "rock", "ambient", "r_and_b",
    }

    # Artist → genre lookup for well-known producers (Haiku may still know these,
    # but this prevents any hallucination on canonical mappings)
    _ARTIST_GENRE_MAP = {
        "jai cuzco":      "house",       # melodic progressive house
        "bicep":          "house",       # melodic house/techno
        "four tet":       "ambient",     # experimental/ambient electronics
        "burial":         "ambient",     # UK garage / ambient
        "aphex twin":     "ambient",     # IDM / ambient techno
        "boards of canada": "ambient",   # downtempo / ambient
        "j dilla":        "boom_bap",
        "madlib":         "boom_bap",
        "pete rock":      "boom_bap",
        "dj premier":     "boom_bap",
        "flying lotus":   "hip_hop",     # future beats / LA beat scene
        "kendrick lamar": "hip_hop",
        "kanye west":     "hip_hop",
        "travis scott":   "trap",
        "metro boomin":   "trap",
        "future":         "trap",
        "carl cox":       "techno",
        "adam beyer":     "techno",
        "charlotte de witte": "techno",
        "amelie lens":    "techno",
        "andy c":         "dnb",
        "goldie":         "dnb",
        "netsky":         "dnb",
        "disclosure":     "house",
        "kaytranada":     "house",
        "fred again":     "house",
        "daft punk":      "house",
        "deadmau5":       "house",
        "solomun":        "house",
        "jamie xx":       "house",
        "erykah badu":    "r_and_b",
        "d'angelo":       "r_and_b",
        "frank ocean":    "r_and_b",
        "sade":           "r_and_b",
        "miles davis":    "jazz",
        "john coltrane":  "jazz",
        "herbie hancock": "jazz",
        "james brown":    "funk",
        "parliament":     "funk",
        "prince":         "funk",
    }

    async def route(self, user_message: str, daw_state_summary: Optional[str] = None) -> RouteResult:
        """
        Route user message → intent + genre using a single Haiku JSON call.
        Returns RouteResult(intent, genre). Falls back to keyword detection.
        Genre is detected with full LLM understanding: artist names, descriptors, context.
        """
        if not self.client:
            logger.warning("⚠️ No API key, defaulting to GENERAL_CHAT")
            return RouteResult(intent=Intent.GENERAL_CHAT)

        context = f"\n\nCurrent DAW state:\n{daw_state_summary}" if daw_state_summary else ""

        classification_prompt = f"""You are a music production assistant classifier. Analyze this request and return JSON.

TASK: Return exactly this JSON structure:
{{"intent": "INTENT_NAME", "genre": "genre_name_or_null"}}

─── INTENTS ───
CREATE_BEAT        – drum beat, percussion, rhythm track
                     e.g. "make a trap beat", "4-on-the-floor kick", "add hi-hats"
CREATE_ARRANGEMENT – full multi-track song/section with multiple parts
                     e.g. "full song", "complete arrangement", "build a track", "make something like [artist]"
CREATE_CONTENT     – single musical element (melody, bassline, chords, one track)
                     e.g. "add a bass line", "chord progression", "lead synth melody"
MODIFY_CONTENT     – edit existing notes/clips/tracks
                     e.g. "change the melody", "edit the bass", "make the snare harder"
DELETE_CONTENT     – remove tracks, clips, or content
                     e.g. "delete the drum track", "clear everything"
ADD_EFFECTS        – FX processing changes
                     e.g. "add reverb", "distortion on lead", "compress the bass"
PLAYBACK_CONTROL   – transport or tempo
                     e.g. "play", "stop", "set tempo to 140"
QUERY_STATE        – question about current project state
                     e.g. "what tracks do I have?", "what key am I in?"
GENERAL_CHAT       – general question, help, or unclear
                     e.g. "how do I...", "what is..."

─── GENRES (use null if no genre context) ───
Valid values: trap, house, techno, dnb, boom_bap, lofi, hip_hop, afrobeats, uk_garage, jazz, funk, rock, ambient, r_and_b

Genre detection rules (in priority order):
1. Artist name mentioned → use their primary genre (e.g. "Jai Cuzco"→house, "J Dilla"→boom_bap, "Aphex Twin"→ambient, "Carl Cox"→techno)
2. Explicit genre word → map to nearest valid genre ("progressive house"→house, "drum and bass"→dnb, "drill"→trap)
3. Musical descriptors → infer genre ("808 bass + hi-hats"→trap, "four-on-floor kick"→house, "walking bass"→jazz, "808s and melodic"→trap)
4. General "EDM" without specifics → null (not enough info to pick a genre)
5. No musical context → null

User request: "{user_message}"{context}

Respond with ONLY valid JSON. No markdown fences, no explanation."""

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

        last_exc: Exception = RuntimeError("No attempts made")
        raw = ""
        for attempt, wait in enumerate([0.0] + self._BACKOFF):
            if wait:
                logger.warning(f"⏳ Routing retry in {wait:.0f}s (attempt {attempt}/{len(self._BACKOFF)})…")
                await asyncio.sleep(wait)
            try:
                response = await self.client.messages.create(
                    model=self.model,
                    max_tokens=80,
                    messages=[{"role": "user", "content": classification_prompt}]
                )
                raw = response.content[0].text.strip()
                parsed = json.loads(raw)

                intent_str = str(parsed.get("intent", "")).strip().upper()
                intent = intent_map.get(intent_str, Intent.GENERAL_CHAT)

                genre_raw = parsed.get("genre")
                genre = self._resolve_genre(user_message, genre_raw)

                logger.info(f"🔀 LLM routed to {intent.value}" + (f" | genre: {genre}" if genre else ""))
                return RouteResult(intent=intent, genre=genre)

            except (json.JSONDecodeError, KeyError, AttributeError) as e:
                # Malformed JSON — try to salvage intent from raw text
                logger.warning(f"⚠️ Route JSON parse error: {e} | raw: {raw!r}")
                # Attempt plain-text intent parse (backwards-compat fallback)
                intent_str = raw.strip().upper().split()[0] if raw.strip() else ""
                if intent_str in intent_map:
                    intent = intent_map[intent_str]
                    genre = self._resolve_genre(user_message, None)
                    logger.info(f"🔀 Salvaged plain-text intent: {intent.value}")
                    return RouteResult(intent=intent, genre=genre)
                last_exc = e

            except anthropic.InternalServerError as exc:
                if exc.status_code in self._RETRYABLE_STATUS:
                    last_exc = exc
                else:
                    raise
            except anthropic.RateLimitError as exc:
                last_exc = exc
            except Exception as e:
                logger.error(f"❌ Intent routing failed: {e}")
                last_exc = e
                break  # Non-retryable — skip remaining attempts

        # All retries exhausted — full keyword fallback
        fallback_intent = self._keyword_fallback(user_message)
        fallback_genre = self._resolve_genre(user_message, None)
        logger.warning(
            f"⚠️ Routing failed after retries ({last_exc}), "
            f"keyword fallback → intent={fallback_intent.value}, genre={fallback_genre}"
        )
        return RouteResult(intent=fallback_intent, genre=fallback_genre)

    def _resolve_genre(self, user_message: str, llm_genre: Optional[str]) -> Optional[str]:
        """
        Validate + clean the LLM's genre output.
        Falls back to artist-map lookup, then keyword scan.
        Returns a valid GENRE_PROFILES key or None.
        """
        # 1. Trust the LLM if it returned a valid genre
        if llm_genre and str(llm_genre).lower() in self._VALID_GENRES:
            return str(llm_genre).lower()

        # 2. Artist name lookup (hardcoded canonical mappings)
        msg_lower = user_message.lower()
        for artist, genre in self._ARTIST_GENRE_MAP.items():
            if artist in msg_lower:
                logger.debug(f"🎨 Artist match: '{artist}' → {genre}")
                return genre

        # 3. Keyword scan (last resort)
        _KEYWORD_GENRE_MAP = [
            # More specific patterns before generic ones
            ("drum and bass", "dnb"), ("dnb", "dnb"), ("neurofunk", "dnb"), ("jungle", "dnb"),
            ("liquid dnb", "dnb"),
            ("techno", "techno"), ("industrial techno", "techno"), ("berlin", "techno"),
            ("boom bap", "boom_bap"), ("boom-bap", "boom_bap"), ("golden age hip hop", "boom_bap"),
            ("lo-fi", "lofi"), ("lofi", "lofi"), ("lo fi", "lofi"), ("study beats", "lofi"),
            ("afrobeats", "afrobeats"), ("amapiano", "afrobeats"), ("afro pop", "afrobeats"),
            ("uk garage", "uk_garage"), ("2-step", "uk_garage"), ("2step", "uk_garage"),
            ("r&b", "r_and_b"), ("rnb", "r_and_b"), ("neo soul", "r_and_b"),
            ("hip hop", "hip_hop"), ("hip-hop", "hip_hop"), ("rap", "hip_hop"),
            ("trap", "trap"), ("drill", "trap"), ("808", "trap"),
            ("house", "house"), ("deep house", "house"), ("tech house", "house"),
            ("progressive house", "house"), ("melodic house", "house"),
            ("ambient", "ambient"), ("drone", "ambient"), ("atmospheric", "ambient"),
            ("jazz", "jazz"), ("bebop", "jazz"), ("swing", "jazz"),
            ("funk", "funk"), ("funky", "funk"), ("groove", "funk"),
            ("rock", "rock"), ("punk", "rock"), ("guitar rock", "rock"),
        ]
        for keyword, genre in _KEYWORD_GENRE_MAP:
            if keyword in msg_lower:
                return genre

        return None

    def get_tools_for_intent(self, intent: Intent) -> List[str]:
        """Get relevant tool names for an intent — lean and focused."""
        tool_map = {
            Intent.CREATE_BEAT: [
                "compose_music",
                # NOTE: set_tempo intentionally omitted — use compose_music's `tempo` field instead
                # to avoid the model calling set_tempo first and compose_music never running
            ],
            Intent.CREATE_ARRANGEMENT: [
                "compose_music",
            ],
            Intent.CREATE_CONTENT: [
                "compose_music",
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

IMPORTANT: Use compose_music in a SINGLE call. Set tempo via compose_music's `tempo` field — do NOT call set_tempo separately first.

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

CRITICAL: Make ONE compose_music call that includes ALL tracks AND sets tempo in the `tempo` field.
Do NOT call set_tempo separately — put tempo inside compose_music.
Do NOT make multiple compose_music calls — put all tracks in one call.

CONTENT TYPE GUIDE — choose the best type per track:
  Drums:  kit_pattern (simplest) or drum_pattern (custom voices)
  Bass:   bass_line (best!) — styles: root_pulse/walking/syncopated/sub_pulse/octave_jump
  Chords: chord_pattern + optional rhythm field (block/off_beat/staccato/syncopated)
  Arp:    arp_pattern — styles: up/down/up_down, rhythms: 16th/8th/swing_8th
  Melody: scale_melody — contours: arch/rising/falling/wave, densities: sparse/medium/dense
  Custom: note_sequence — explicit note names (C4, F#3, Bb5) + beat positions

compose_music structure (use bass_line and chord_pattern over note_sequence):
{{
  "tempo": 128,
  "tracks": [
    {{ "name": "Drums", "drum_pattern": {{ "kit_id": "trap-kit", "voices": [...] }} }},
    {{ "name": "Bass", "instrument": "bass", "bass_line": {{ "chords": ["Am","F","C","G"], "style": "syncopated", "octave": 2 }} }},
    {{ "name": "Chords", "instrument": "pad", "chord_pattern": {{ "chords": ["Am","F","C","G"], "rhythm": "off_beat", "octave": 4 }} }},
    {{ "name": "Melody", "instrument": "lead", "scale_melody": {{ "root": "A", "scale": "pentatonic_minor", "contour": "arch", "density": "medium" }} }}
  ]
}}

{kit_catalog}
{NOTATION_GUIDE}
{instruments_catalog}

GENRE PROFILES (suggested settings by genre):
{genre_profiles_summary}

Always create at least drums + bass + chords. Add melody/arp if appropriate.
Prefer bass_line over note_sequence for bass tracks.
Prefer scale_melody or arp_pattern over note_sequence for melodies.""",

            Intent.CREATE_CONTENT: f"""You are a music production AI. Create musical content.

IMPORTANT: Use compose_music in a SINGLE call with tempo set via the `tempo` field. Do NOT call set_tempo first.

CONTENT TYPE SELECTION — pick the right generator for each track type:
  Bass track?    → bass_line (styles: root_pulse/walking/syncopated/sub_pulse/octave_jump)
                   Example: {{"bass_line": {{"chords": ["Am","F","C","G"], "style": "root_pulse", "octave": 2}}}}

  Arpeggio?      → arp_pattern (styles: up/down/up_down, rhythms: 16th/8th/dotted_8th/swing_8th)
                   Example: {{"arp_pattern": {{"chords": ["Am","F","C","G"], "style": "up", "rhythm": "16th"}}}}

  Chords w/feel? → chord_pattern + rhythm field (block/off_beat/staccato/on_beat/syncopated)
                   Example: {{"chord_pattern": {{"chords": ["Am","F","C","G"], "rhythm": "off_beat"}}}}

  Melodic shape? → scale_melody (contours: arch/rising/falling/wave/valley; sparse/medium/dense)
                   Example: {{"scale_melody": {{"root": "A", "scale": "pentatonic_minor", "contour": "arch", "density": "medium"}}}}

  Specific riff? → note_sequence with explicit note names (C4, F#3, Bb5) + beat positions

{kit_catalog}
{NOTATION_GUIDE}
{instruments_catalog}

Bass octaves: 1-3 (A2, C2, F2 for deep bass)
Melody octaves: 4-6 (C5, E4, G#4 for lead lines)
Chords: octave 3-5, voicing: "closed" / "open" / "spread"

Think: what key, what scale, what generator fits this part best?""",

            Intent.MODIFY_CONTENT: f"""You are a music production AI. Edit existing musical content.

Use edit_clip for ALL clip changes — notes, length, and position:

NOTE EDITING (use "mode" field):
  mode "add":     add new notes without removing existing ones
  mode "replace": completely replace all notes
  mode "remove":  remove specific notes by pitch+beat

RESIZING / REPOSITIONING (no "mode" needed — just set the field):
  duration_bars: change clip length in bars  (e.g. duration_bars=8 → 8-bar clip)
  start_bar:     move clip start position    (e.g. start_bar=4 → starts at bar 5)
  Both can be combined with note edits in the same call.

Examples:
  Extend clip to 16 bars:    {{"clip_id": "...", "duration_bars": 16}}
  Move clip to bar 8:        {{"clip_id": "...", "start_bar": 8}}
  Resize + replace notes:    {{"clip_id": "...", "duration_bars": 8, "mode": "replace", "notes": [...]}}

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

Use compose_music for all creation. CHOOSE THE RIGHT CONTENT TYPE:
  Drums:  kit_pattern or drum_pattern
  Bass:   bass_line (root_pulse/walking/syncopated/sub_pulse) — better than note_sequence for bass
  Chords: chord_pattern with optional rhythm (off_beat/staccato/syncopated) for feel
  Arp:    arp_pattern (up/down/up_down, 16th/8th/swing_8th) — great for lead synths + keys
  Melody: scale_melody (arch/rising/wave contour, sparse/medium/dense) — smooth melodic shapes
  Custom: note_sequence for specific riffs with explicit note names

Use edit_clip to modify existing content:
  - duration_bars: resize clip
  - start_bar: move clip
  - mode + notes: edit note content
Use add_effect / remove_effect for effects.

{kit_catalog}
{NOTATION_GUIDE}
{instruments_catalog}

Think like a producer: genre, key, tempo, arrangement, vibe.
Be bold and creative. Execute actions to make music happen.""",
        }

        return prompts.get(intent, prompts[Intent.GENERAL_CHAT])
