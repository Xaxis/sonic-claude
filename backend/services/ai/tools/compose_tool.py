"""
Compose Music Tool — the primary AI composition interface.

Instead of asking Claude to generate raw MIDI numbers, this tool accepts
high-level musical descriptions:

  - drum_pattern:   voices by name (kick/snare/hihat_closed) + beat positions
  - chord_pattern:  chord symbols (Am7, Cmaj7, G7) + voicing preference
  - note_sequence:  note names (C4, F#3, Bb5) + beat positions
  - kit_pattern:    use a named kit's built-in demo pattern

Python handles ALL MIDI conversion — the AI never sees raw note numbers.

Research basis: "MusicalKnowledgeService" from LLM-MUSIC-GENERATION-PLAN.md
Combined with the structured-JSON approach from the reality-check doc.
"""

import logging
from typing import Dict, Any, List, Optional

from backend.models.ai_actions import DAWAction, ActionResult

logger = logging.getLogger(__name__)

# Mapping from drum voice names (as AI uses in drum_pattern voices) to valid synthdef names.
# Lets the AI pass voice names as `instrument` on drum tracks without causing a validation error.
_DRUM_VOICE_TO_SYNTHDEF: Dict[str, str] = {
    "kick":          "kick808",
    "kick2":         "kick808",
    "bass_drum":     "kick808",
    "bd":            "kick808",
    "snare":         "snare808",
    "snare2":        "snare808",
    "sd":            "snare808",
    "clap":          "clap808",
    "rim":           "rimshot808",
    "rimshot":       "rimshot808",
    "hihat_closed":  "hihatClosed808",
    "hihat_open":    "hihatOpen808",
    "hihat_pedal":   "hihatClosed808",
    "hh":            "hihatClosed808",
    "hh_closed":     "hihatClosed808",
    "hh_open":       "hihatOpen808",
    "hat":           "hihatClosed808",
    "hat_closed":    "hihatClosed808",
    "hat_open":      "hihatOpen808",
    "open_hat":      "hihatOpen808",
    "tom_low":       "tomLow808",
    "tom_mid":       "tomMid808",
    "tom_high":      "tomHigh808",
    "tom":           "tomMid808",
    "crash":         "cymbalCrash",
    "ride":          "cymbalRide",
    "cowbell":       "cowbell808",
    "percussion":    "kick808",
    "perc":          "kick808",
}


# ── Tool definition schema (Anthropic function-calling format) ────────────────

COMPOSE_MUSIC_TOOL_SCHEMA = {
    "name": "compose_music",
    "description": (
        "Create one or more musical tracks. Use this for ALL music creation tasks.\n\n"
        "CRITICAL: Specify music symbolically — the system converts to MIDI automatically:\n"
        "  • Drums:        use drum_pattern (voice names) or kit_pattern (kit ID)\n"
        "  • Chords:       use chord_pattern — add 'rhythm' field for feel beyond block chords\n"
        "  • Arpeggio:     use arp_pattern — cycles chord tones rhythmically (best for leads/keys)\n"
        "  • Bass:         use bass_line — chord-root-aware bass (better than note_sequence for bass)\n"
        "  • Scale melody: use scale_melody — contour-guided (best for ambient/pad melodies)\n"
        "  • Custom notes: use note_sequence with note NAMES (C4, F#3, Bb5) — NOT MIDI numbers\n\n"
        "Never specify raw MIDI note numbers — always use note names or voice names.\n\n"
        "CHOOSE THE RIGHT CONTENT TYPE:\n"
        "  Bass track?   → bass_line (root_pulse/walking/syncopated/sub_pulse)\n"
        "  Arpeggio?     → arp_pattern (up/down/up_down, 16th/8th/swing_8th)\n"
        "  Chords w/feel?→ chord_pattern with rhythm field (off_beat/staccato/syncopated)\n"
        "  Melodic shape?→ scale_melody (arch/rising/wave contour, sparse/medium/dense)\n"
        "  Specific riff?→ note_sequence (explicit note names + beat positions)"
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "tracks": {
                "type": "array",
                "description": "List of tracks to create",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "Track name, e.g. 'Kick', '808 Bass', 'Pad Chords'"
                        },
                        "instrument": {
                            "type": "string",
                            "description": (
                                "Synthdef name from SYNTHDEF_REGISTRY (e.g. 'sine', 'bell', 'piano', 'kick808'). "
                                "REQUIRED for melodic/bass/chord tracks. "
                                "OPTIONAL for drum tracks — omit it and the kit or drum pattern will set the "
                                "correct instrument automatically. Do NOT use bare drum voice names like "
                                "'kick' or 'hihat_closed' here; those are for drum_pattern.voices only."
                            )
                        },
                        "bars": {
                            "type": "integer",
                            "description": "Length of the clip in bars (default: 4)",
                            "default": 4
                        },
                        "start_bar": {
                            "type": "integer",
                            "description": "Bar at which the clip starts (0-indexed, default: 0)",
                            "default": 0
                        },
                        "clip_name": {
                            "type": "string",
                            "description": "Optional clip name (defaults to track name + ' Pattern')"
                        },
                        "volume": {
                            "type": "number",
                            "description": "Track volume 0.0–2.0 (1.0 = unity)",
                            "default": 1.0
                        },
                        "effects": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Effect names to add (reverb, delay, lpf, hpf, distortion, etc.)"
                        },

                        # ── Content types (use exactly ONE per track) ────────
                        "drum_pattern": {
                            "type": "object",
                            "description": (
                                "Drum pattern specified by voice name + beat positions. "
                                "Voice names: kick, snare, clap, rim, hihat_closed, hihat_open, "
                                "hihat_pedal, tom_low, tom_mid, tom_high, crash, ride, cowbell, etc."
                            ),
                            "properties": {
                                "kit_id": {
                                    "type": "string",
                                    "description": "Kit ID from registry (e.g. 'trap-kit', '808-core', 'house-kit')"
                                },
                                "voices": {
                                    "type": "array",
                                    "description": "Per-voice rhythm entries",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "voice": {
                                                "type": "string",
                                                "description": "Voice name: kick/snare/clap/hihat_closed/etc."
                                            },
                                            "beats": {
                                                "type": "array",
                                                "items": {"type": "number"},
                                                "description": (
                                                    "Beat positions within one bar (0.0–3.75 for 4/4). "
                                                    "Pattern repeats each bar."
                                                )
                                            },
                                            "velocities": {
                                                "type": "array",
                                                "items": {"type": "integer"},
                                                "description": "Velocity per hit 0–127 (optional, cycles if shorter than beats)"
                                            }
                                        },
                                        "required": ["voice", "beats"]
                                    }
                                }
                            }
                        },

                        "kit_pattern": {
                            "type": "object",
                            "description": "Use a kit's built-in demo pattern directly. Simplest way to get a great-sounding beat.",
                            "properties": {
                                "kit_id": {
                                    "type": "string",
                                    "description": "Kit ID (e.g. 'trap-kit', '808-core', 'house-kit', 'boom-bap')"
                                }
                            },
                            "required": ["kit_id"]
                        },

                        "chord_pattern": {
                            "type": "object",
                            "description": "Chord progression using chord symbols. Python converts to MIDI automatically.",
                            "properties": {
                                "chords": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": (
                                        "Chord symbols. Examples: Am, Cmaj7, G7, Fm9, sus4, Bb, D#m, Ebmaj7. "
                                        "The list repeats to fill 'bars'."
                                    )
                                },
                                "beats_per_chord": {
                                    "type": "number",
                                    "description": "How many beats each chord lasts (default: 4 = one bar in 4/4)",
                                    "default": 4.0
                                },
                                "octave": {
                                    "type": "integer",
                                    "description": "Base octave for chord voicings (default: 4)",
                                    "default": 4
                                },
                                "voicing": {
                                    "type": "string",
                                    "enum": ["closed", "open", "spread"],
                                    "description": "Chord voicing style (default: closed)",
                                    "default": "closed"
                                },
                                "velocity": {
                                    "type": "integer",
                                    "description": "Note velocity 0–127 (default: 80)",
                                    "default": 80
                                },
                                "rhythm": {
                                    "type": "string",
                                    "enum": ["block", "off_beat", "staccato", "on_beat", "syncopated"],
                                    "description": (
                                        "Rhythmic pattern for chord placement (default: block = full duration). "
                                        "off_beat = hits on 'and' of beats (0.5/1.5/2.5/3.5). "
                                        "staccato = short hits on each beat. "
                                        "on_beat = one hit per beat, medium length. "
                                        "syncopated = hit on beat 1, then off-beat 16ths."
                                    ),
                                    "default": "block"
                                }
                            },
                            "required": ["chords"]
                        },

                        "arp_pattern": {
                            "type": "object",
                            "description": (
                                "Arpeggiated chord pattern — cycles through chord tones rhythmically. "
                                "Best for: lead synths over chords, piano arpeggios, melodic pluck patterns. "
                                "The system generates all notes from chord symbols."
                            ),
                            "properties": {
                                "chords": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "Chord symbols (Am, F, C, G). Repeats to fill bars."
                                },
                                "style": {
                                    "type": "string",
                                    "enum": ["up", "down", "up_down", "pinned"],
                                    "description": (
                                        "Arp direction: up (ascending cycle), down (descending), "
                                        "up_down (bounce A-C-E-C-A), pinned (root alternates with each tone)"
                                    ),
                                    "default": "up"
                                },
                                "rhythm": {
                                    "type": "string",
                                    "enum": ["16th", "8th", "dotted_8th", "triplet", "swing_8th"],
                                    "description": "Note spacing: 16th (0.25), 8th (0.5), dotted_8th (0.75), triplet (1/3), swing_8th",
                                    "default": "16th"
                                },
                                "octave": {
                                    "type": "integer",
                                    "description": "Base octave for chord tones (default: 4)",
                                    "default": 4
                                },
                                "octave_range": {
                                    "type": "integer",
                                    "description": "1 = single octave, 2 = span two octaves of chord tones",
                                    "default": 1
                                },
                                "beats_per_chord": {
                                    "type": "number",
                                    "description": "How many beats each chord lasts before the arp moves to the next chord (default: 4 = one bar). Use 2 for faster chord changes.",
                                    "default": 4.0
                                },
                                "velocity": {
                                    "type": "integer",
                                    "description": "Base velocity 0–127 (default: 90)",
                                    "default": 90
                                }
                            },
                            "required": ["chords"]
                        },

                        "bass_line": {
                            "type": "object",
                            "description": (
                                "Chord-root-aware bass pattern. Always harmonically correct. "
                                "Preferred over note_sequence for bass tracks — just pick a style."
                            ),
                            "properties": {
                                "chords": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "Chord progression (same as other content types)"
                                },
                                "style": {
                                    "type": "string",
                                    "enum": ["root_only", "root_pulse", "walking", "octave_jump", "syncopated", "sub_pulse"],
                                    "description": (
                                        "root_only = long root note per chord. "
                                        "root_pulse = root on every beat (house/techno). "
                                        "walking = jazz walking bass (root+5th+7th+approach). "
                                        "octave_jump = root alternates with upper octave. "
                                        "syncopated = off-beat ghost notes (hip-hop/R&B). "
                                        "sub_pulse = 8th-note sub-bass pulse (808/EDM)."
                                    ),
                                    "default": "root_pulse"
                                },
                                "octave": {
                                    "type": "integer",
                                    "description": "Bass octave: 1=very deep, 2=standard (default), 3=bass melody",
                                    "default": 2
                                },
                                "beats_per_chord": {
                                    "type": "number",
                                    "description": "Beats per chord change (default: 4.0)",
                                    "default": 4.0
                                },
                                "velocity": {
                                    "type": "integer",
                                    "description": "Base velocity 0–127 (default: 100)",
                                    "default": 100
                                }
                            },
                            "required": ["chords"]
                        },

                        "scale_melody": {
                            "type": "object",
                            "description": (
                                "Contour-guided scale melody. Python generates all notes — "
                                "you specify the shape and density. Best for ambient textures, "
                                "melodic fills, or when you want smooth melodic motion without "
                                "specifying every note."
                            ),
                            "properties": {
                                "root": {
                                    "type": "string",
                                    "description": "Root note of the scale (C, A, F#, Bb)"
                                },
                                "scale": {
                                    "type": "string",
                                    "description": "Scale name: minor, pentatonic_minor, pentatonic_major, major, dorian, mixolydian, blues, etc."
                                },
                                "octave": {
                                    "type": "integer",
                                    "description": "Starting octave (4 = middle C octave)",
                                    "default": 4
                                },
                                "octave_range": {
                                    "type": "integer",
                                    "description": "1 = single octave, 2 = two octaves for wider melodic range",
                                    "default": 1
                                },
                                "contour": {
                                    "type": "string",
                                    "enum": ["arch", "rising", "falling", "wave", "valley"],
                                    "description": (
                                        "Melodic shape: arch (rise→peak→fall), rising (ascent), "
                                        "falling (descent), wave (full oscillation), valley (fall→rise)"
                                    ),
                                    "default": "arch"
                                },
                                "density": {
                                    "type": "string",
                                    "enum": ["sparse", "medium", "dense"],
                                    "description": "Note spacing: sparse=quarter notes, medium=8th notes, dense=16th notes",
                                    "default": "medium"
                                },
                                "velocity": {
                                    "type": "integer",
                                    "description": "Base velocity 0–127 (default: 90)",
                                    "default": 90
                                }
                            },
                            "required": ["root", "scale"]
                        },

                        "note_sequence": {
                            "type": "array",
                            "description": (
                                "Melodic or bassline notes specified by NAME (C4, A3, F#5, Bb2). "
                                "Python converts to MIDI. Never use raw MIDI numbers here."
                            ),
                            "items": {
                                "type": "object",
                                "properties": {
                                    "pitch": {
                                        "type": "string",
                                        "description": "Note name: C4, A#3, Bb5, F#2, G3, Eb4, etc."
                                    },
                                    "beat": {
                                        "type": "number",
                                        "description": "Start beat (0-based, relative to clip start)"
                                    },
                                    "dur": {
                                        "type": "number",
                                        "description": "Duration in beats"
                                    },
                                    "vel": {
                                        "type": "integer",
                                        "description": "Velocity 0–127 (default: 100)",
                                        "default": 100
                                    }
                                },
                                "required": ["pitch", "beat", "dur"]
                            }
                        }
                    },
                    "required": ["name"]
                }
            },
            "tempo": {
                "type": "number",
                "description": "Set composition tempo in BPM (optional)"
            },
            "clear_existing": {
                "type": "boolean",
                "description": "Clear all existing tracks before creating new ones (default: false)",
                "default": False
            }
        },
        "required": ["tracks"]
    }
}


# ── ComposeTool executor ──────────────────────────────────────────────────────

class ComposeTool:
    """
    Executes the compose_music tool.

    Accepts musical descriptions from Claude and converts them to MIDI events
    using the music theory library. Creates tracks + clips in the DAW.
    """

    def __init__(self, action_service):
        self.action_service = action_service

    async def execute(self, params: Dict[str, Any]) -> ActionResult:
        """
        Execute a compose_music call from the AI.

        Args:
            params: Tool input matching COMPOSE_MUSIC_TOOL_SCHEMA

        Returns:
            ActionResult with created track/clip IDs and summary
        """
        try:
            return await self._execute_inner(params)
        except Exception as e:
            logger.exception("compose_music failed")
            return ActionResult(
                action="compose_music",
                success=False,
                error=f"Unexpected error in compose_music: {e}",
                message=str(e),
            )

    async def _execute_inner(self, params: Dict[str, Any]) -> ActionResult:
        tracks_spec = params.get("tracks", [])
        tempo = params.get("tempo")
        clear_existing = params.get("clear_existing", False)

        if not tracks_spec:
            logger.error(f"❌ compose_music called with empty/missing tracks. Full params keys: {list(params.keys())}")
            return ActionResult(
                action="compose_music",
                success=False,
                error="'tracks' array is required and must not be empty.",
                message="No tracks specified.",
            )

        # Optionally set tempo first
        if tempo:
            await self.action_service.execute_action(
                DAWAction(action="set_tempo", parameters={"tempo": float(tempo)})
            )

        # Optionally clear
        if clear_existing:
            await self.action_service.execute_action(
                DAWAction(action="clear_composition", parameters={})
            )

        created = []
        errors = []

        for spec in tracks_spec:
            result = await self._create_track_from_spec(spec)
            if result.get("success"):
                created.append(result)
            else:
                errors.append(result)
                logger.warning(f"Track creation partial failure: {result}")

        if not created:
            return ActionResult(
                action="compose_music",
                success=False,
                error=f"All {len(tracks_spec)} tracks failed. First error: {errors[0].get('error') if errors else 'unknown'}",
                message="No tracks were created.",
                data={"errors": errors},
            )

        summary = ", ".join(f"{r['name']} ({r.get('notes_count', 0)} notes)" for r in created)
        return ActionResult(
            action="compose_music",
            success=True,
            message=f"Created {len(created)} track(s): {summary}",
            data={"tracks": created, "errors": errors},
        )

    async def _create_track_from_spec(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Create a single track + clip from a track specification dict."""
        name = spec.get("name", "Untitled")
        instrument = spec.get("instrument") or ""
        bars = max(1, min(256, int(spec.get("bars", 4))))
        start_bar = max(0, int(spec.get("start_bar", 0)))
        clip_name = spec.get("clip_name") or f"{name} Pattern"
        volume = spec.get("volume", 1.0)
        effects = spec.get("effects") or []
        start_beats = start_bar * 4
        dur_beats = bars * 4

        # ── Pre-resolve instrument before track creation ──────────────────────
        # Extract kit_id early so we can use it to pick a valid synthdef name.
        # This must happen before Step 1 because create_track validates instrument.
        pre_kit_id = None
        is_drum_track = "drum_pattern" in spec or "kit_pattern" in spec
        if "kit_pattern" in spec:
            pre_kit_id = spec["kit_pattern"].get("kit_id")
        elif "drum_pattern" in spec:
            pre_kit_id = spec["drum_pattern"].get("kit_id")

        from backend.models.instrument_types import get_valid_instruments
        valid_synthdefs = get_valid_instruments()

        if instrument not in valid_synthdefs:
            # Instrument is missing, a drum voice name, or hallucinated — resolve it:
            resolved = None
            # 1. Try to get the kick synthdef from the kit
            if pre_kit_id:
                resolved = self._get_kit_default_instrument(pre_kit_id)
            # 2. Try drum voice name → synthdef mapping
            if not resolved and instrument:
                resolved = _DRUM_VOICE_TO_SYNTHDEF.get(instrument.lower())
            # 3. Sensible defaults by track type
            if not resolved:
                resolved = "kick808" if is_drum_track else "sine"
            instrument = resolved

        # ── Step 1: Create track ─────────────────────────────────────────────
        track_result = await self.action_service.execute_action(
            DAWAction(action="create_track", parameters={
                "name": name,
                "type": "midi",
                "instrument": instrument,
            })
        )
        if not track_result.success:
            logger.error(f"❌ create_track FAILED for '{name}': error={track_result.error!r}, message={track_result.message!r}")
            return {"success": False, "name": name, "error": track_result.error or track_result.message}

        track_id = track_result.data["track_id"]

        # ── Step 1b: Set volume if non-default ───────────────────────────────
        if volume != 1.0:
            await self.action_service.execute_action(
                DAWAction(action="set_track_parameter", parameters={
                    "track_id": track_id, "parameter": "volume", "value": volume
                })
            )

        # ── Step 2: Generate MIDI notes ──────────────────────────────────────
        notes = []
        kit_id = pre_kit_id  # already extracted above

        if "kit_pattern" in spec:
            notes = self._generate_kit_pattern_notes(kit_id, bars)

        elif "drum_pattern" in spec:
            notes = self._generate_drum_pattern_notes(spec["drum_pattern"], bars)

        elif "chord_pattern" in spec:
            notes = self._generate_chord_notes(spec["chord_pattern"], bars)

        elif "arp_pattern" in spec:
            notes = self._generate_arp_notes(spec["arp_pattern"], bars)

        elif "bass_line" in spec:
            notes = self._generate_bass_line(spec["bass_line"], bars)

        elif "scale_melody" in spec:
            notes = self._generate_scale_melody(spec["scale_melody"], bars)

        elif "note_sequence" in spec:
            notes = self._parse_note_sequence(spec["note_sequence"])

        else:
            # No content type specified — warn but still create the track
            logger.warning(f"Track '{name}' has no content (no drum_pattern/chord_pattern/arp_pattern/bass_line/scale_melody/note_sequence/kit_pattern)")

        # ── Step 3: Apply kit to track (if kit specified) ────────────────────
        if kit_id:
            kit_result = await self.action_service.execute_action(
                DAWAction(action="set_drum_kit", parameters={
                    "track_id": track_id,
                    "kit_id": kit_id,
                })
            )
            if not kit_result.success:
                logger.warning(f"Failed to apply kit '{kit_id}': {kit_result.error}")

        # ── Step 4: Create clip with notes ───────────────────────────────────
        clip_result = await self.action_service.execute_action(
            DAWAction(action="create_midi_clip", parameters={
                "track_id": track_id,
                "start_time": float(start_beats),
                "duration": float(dur_beats),
                "notes": notes,
                "name": clip_name,
            })
        )
        if not clip_result.success:
            return {
                "success": False, "name": name, "track_id": track_id,
                "error": f"Track created but clip failed: {clip_result.error}",
            }

        clip_id = clip_result.data.get("clip_id")

        # ── Step 5: Add effects ──────────────────────────────────────────────
        effects_added = []
        for effect_name in effects:
            fx_result = await self.action_service.execute_action(
                DAWAction(action="add_effect", parameters={
                    "track_id": track_id, "effect_name": effect_name
                })
            )
            if fx_result.success:
                effects_added.append(effect_name)
            else:
                logger.warning(f"Failed to add effect '{effect_name}': {fx_result.error}")

        return {
            "success": True,
            "name": name,
            "track_id": track_id,
            "clip_id": clip_id,
            "notes_count": len(notes),
            "kit_id": kit_id,
            "effects_added": effects_added,
        }

    # ── MIDI generation helpers ───────────────────────────────────────────────

    def _generate_kit_pattern_notes(self, kit_id: str, bars: int) -> List[Dict]:
        """Use the kit's built-in demo pattern, scaled to N bars."""
        from backend.services.daw.registry import get_kit_by_id
        from backend.services.music.patterns import (
            generate_drum_notes_from_pattern,
            GENRE_PATTERNS,
        )

        kit = get_kit_by_id(kit_id)
        if not kit:
            logger.warning(f"Kit '{kit_id}' not found — using empty pattern")
            return []

        # Kit demo patterns use the same format as voice-based patterns
        demo = kit.get("demo", [])
        if demo:
            # Convert kit demo format: [beat, midi_note, velocity, duration_beats]
            notes = []
            beats_per_bar = 4
            for bar in range(bars):
                for item in demo:
                    beat, midi_note, velocity, dur = item
                    abs_beat = bar * beats_per_bar + beat
                    notes.append({"n": int(midi_note), "s": abs_beat, "d": dur, "v": int(velocity)})
            return sorted(notes, key=lambda e: e["s"])

        # Fallback: try to match kit category to genre pattern
        category = kit.get("category", "").lower()
        fallback_genre = {
            "classic": "trap",
            "electronic": "trap",
            "acoustic": "rock",
            "creative": "techno",
        }.get(category, "trap")
        logger.warning(f"Kit '{kit_id}' has no demo pattern — using '{fallback_genre}' genre fallback")
        pattern = GENRE_PATTERNS.get(fallback_genre, [])
        if not pattern:
            logger.error(f"No pattern found for fallback genre '{fallback_genre}' — returning empty notes")
        return generate_drum_notes_from_pattern(pattern, bars=bars)

    def _get_kit_default_instrument(self, kit_id: str) -> Optional[str]:
        """Return the kick synthdef from the kit as the track instrument."""
        from backend.services.daw.registry import get_kit_by_id
        kit = get_kit_by_id(kit_id)
        if kit and kit.get("pads"):
            kick_pad = kit["pads"].get(36)
            if kick_pad:
                return kick_pad["synthdef"]
        return None

    def _generate_drum_pattern_notes(self, drum_pattern: Dict, bars: int) -> List[Dict]:
        """Generate MIDI notes from a voice-based drum_pattern spec."""
        from backend.services.music.patterns import (
            voice_to_midi_note,
            generate_drum_notes_from_pattern,
        )

        voices = drum_pattern.get("voices", [])
        if not voices:
            return []

        return generate_drum_notes_from_pattern(voices, bars=bars)

    def _generate_chord_notes(self, chord_pattern: Dict, bars: int) -> List[Dict]:
        """Generate MIDI notes from a chord_pattern spec."""
        from backend.services.music.theory import chord_progression_to_notes

        chords = chord_pattern.get("chords", [])
        if not chords:
            return []

        beats_per_chord = float(chord_pattern.get("beats_per_chord", 4.0))
        octave = int(chord_pattern.get("octave", 4))
        voicing = chord_pattern.get("voicing", "closed")
        velocity = int(chord_pattern.get("velocity", 80))
        rhythm = chord_pattern.get("rhythm", "block")
        total_beats = bars * 4

        # Use rhythmic generator for non-block rhythms
        if rhythm and rhythm != "block":
            from backend.services.music.generators import generate_chord_rhythm
            return generate_chord_rhythm(
                chords=chords,
                rhythm=rhythm,
                beats_per_chord=beats_per_chord,
                octave=octave,
                voicing=voicing,
                velocity=velocity,
                bars=bars,
            )

        # Default: full-duration block chords
        full_chords = []
        while len(full_chords) * beats_per_chord < total_beats:
            full_chords.extend(chords)

        notes = chord_progression_to_notes(
            full_chords,
            octave=octave,
            voicing=voicing,
            beats_per_chord=beats_per_chord,
            velocity=velocity,
        )

        # Trim to bar length
        return [n for n in notes if n["s"] < total_beats]

    def _generate_arp_notes(self, arp_pattern: Dict, bars: int) -> List[Dict]:
        """Generate MIDI notes from an arp_pattern spec."""
        from backend.services.music.generators import generate_arp_notes

        chords = arp_pattern.get("chords", [])
        if not chords:
            return []

        return generate_arp_notes(
            chords=chords,
            style=arp_pattern.get("style", "up"),
            rhythm=arp_pattern.get("rhythm", "16th"),
            octave=int(arp_pattern.get("octave", 4)),
            octave_range=int(arp_pattern.get("octave_range", 1)),
            bars=bars,
            beats_per_chord=float(arp_pattern.get("beats_per_chord", 4.0)),
            velocity=int(arp_pattern.get("velocity", 90)),
        )

    def _generate_bass_line(self, bass_line: Dict, bars: int) -> List[Dict]:
        """Generate MIDI notes from a bass_line spec."""
        from backend.services.music.generators import generate_bass_line

        chords = bass_line.get("chords", [])
        if not chords:
            return []

        return generate_bass_line(
            chords=chords,
            style=bass_line.get("style", "root_pulse"),
            octave=int(bass_line.get("octave", 2)),
            bars=bars,
            beats_per_chord=float(bass_line.get("beats_per_chord", 4.0)),
            velocity=int(bass_line.get("velocity", 100)),
        )

    def _generate_scale_melody(self, scale_melody: Dict, bars: int) -> List[Dict]:
        """Generate MIDI notes from a scale_melody spec."""
        from backend.services.music.generators import generate_scale_melody

        root = scale_melody.get("root", "C")
        scale = scale_melody.get("scale", "minor")
        if not root or not scale:
            return []

        return generate_scale_melody(
            root=root,
            scale=scale,
            octave=int(scale_melody.get("octave", 4)),
            octave_range=int(scale_melody.get("octave_range", 1)),
            contour=scale_melody.get("contour", "arch"),
            bars=bars,
            density=scale_melody.get("density", "medium"),
            velocity=int(scale_melody.get("velocity", 90)),
        )

    def _parse_note_sequence(self, note_sequence: List[Dict]) -> List[Dict]:
        """Convert note-name sequence to compact MIDI dicts."""
        from backend.services.music.theory import note_name_to_midi

        result = []
        for note in note_sequence:
            pitch = note.get("pitch", "")
            if not pitch:
                continue
            try:
                midi_note = note_name_to_midi(pitch)
            except ValueError as e:
                logger.warning(f"Cannot parse note name '{pitch}': {e} — skipping")
                continue

            result.append({
                "n": midi_note,
                "s": float(note.get("beat", 0)),
                "d": float(note.get("dur", 0.5)),
                "v": int(note.get("vel", 100)),
            })

        return result


# ── Tool schema for edit operations ──────────────────────────────────────────

EDIT_CLIP_TOOL_SCHEMA = {
    "name": "edit_clip",
    "description": (
        "Edit an existing clip — change its notes, length, or position.\n\n"
        "Note editing modes (optional — omit if only resizing):\n"
        "  replace: completely replace all notes (default)\n"
        "  add:     add notes without removing existing ones\n"
        "  remove:  remove specific notes by pitch+beat position\n\n"
        "Use note names (C4, F#3, etc.) or compact {n,s,d,v} dicts.\n\n"
        "Resizing: use duration_bars to change clip length, start_bar to move it."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "clip_id": {
                "type": "string",
                "description": "ID of the clip to edit"
            },
            "duration_bars": {
                "type": "integer",
                "description": (
                    "Resize the clip to this many bars. "
                    "Use this to extend or shorten a clip. "
                    "Example: duration_bars=8 makes the clip 8 bars long."
                )
            },
            "start_bar": {
                "type": "integer",
                "description": (
                    "Move the clip to start at this bar (0-indexed). "
                    "Example: start_bar=4 starts the clip at bar 5."
                )
            },
            "mode": {
                "type": "string",
                "enum": ["replace", "add", "remove"],
                "description": "Note edit mode (default: replace). Omit if only resizing/moving.",
                "default": "replace"
            },
            "notes": {
                "type": "array",
                "description": (
                    "Notes to add/replace/remove. Use note names OR compact MIDI dicts.\n"
                    "Note name format: {pitch: 'C4', beat: 0.0, dur: 1.0, vel: 100}\n"
                    "Compact format:   {n: 60, s: 0.0, d: 1.0, v: 100}"
                ),
                "items": {
                    "type": "object",
                    "properties": {
                        "pitch": {"type": "string", "description": "Note name (C4, F#3, etc.)"},
                        "beat":  {"type": "number"},
                        "dur":   {"type": "number"},
                        "vel":   {"type": "integer", "default": 100},
                        "n":     {"type": "integer", "description": "MIDI note number (alternative to pitch)"},
                        "s":     {"type": "number",  "description": "Start beat (alternative to beat)"},
                        "d":     {"type": "number",  "description": "Duration (alternative to dur)"},
                        "v":     {"type": "integer", "description": "Velocity (alternative to vel)"},
                    }
                }
            },
            "transpose_semitones": {
                "type": "integer",
                "description": "Transpose all notes by N semitones (applied after add/replace)"
            },
            "velocity_scale": {
                "type": "number",
                "description": "Multiply all velocities by this factor (e.g. 0.8 = 80%)"
            },
        },
        "required": ["clip_id"]
    }
}
