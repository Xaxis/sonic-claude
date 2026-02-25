"""
Context Builder Service - Build focused context for specific entities

This service creates detailed, entity-specific context for inline AI editing.
It provides both the full composition context (for understanding the bigger picture)
and focused entity context (for precise editing).

Context Types:
- Track Context: Track properties, clips, effects, mixer settings
- Clip Context: Clip properties, MIDI notes, audio file, track context
- Effect Context: Effect parameters, track context, signal chain position
- Mixer Channel Context: Channel settings, metering, routing
"""
import logging
from typing import Dict, Any, Optional, List
from backend.services.daw.composition_state_service import CompositionStateService
from backend.services.daw.mixer_service import MixerService
from backend.services.daw.effects_service import TrackEffectsService

logger = logging.getLogger(__name__)


class ContextBuilderService:
    """
    Builds focused context for entity-specific AI interactions
    """
    
    def __init__(
        self,
        composition_state_service: CompositionStateService,
        mixer_service: MixerService,
        effects_service: TrackEffectsService
    ):
        self.composition_state = composition_state_service
        self.mixer = mixer_service
        self.effects = effects_service
    
    def build_track_context(
        self,
        composition_id: str,
        track_id: str
    ) -> Dict[str, Any]:
        """Build detailed context for a specific track"""
        composition = self.composition_state.get_composition(composition_id)
        if not composition:
            raise ValueError(f"Composition {composition_id} not found")
        
        # Find the track
        track = next((t for t in composition.tracks if t.id == track_id), None)
        if not track:
            raise ValueError(f"Track {track_id} not found")
        
        # Get clips on this track
        track_clips = [c for c in composition.clips if c.track_id == track_id]
        
        # Get effects on this track
        track_effects = self.effects.get_track_effects(track_id)
        
        # Get mixer channel for this track
        mixer_channel = next(
            (ch for ch in composition.mixer_state.channels if ch.id == track_id),
            None
        )
        
        return {
            "track": {
                "id": track.id,
                "name": track.name,
                "type": track.type,
                "instrument": track.instrument,
                "volume": track.volume,
                "pan": track.pan,
                "is_muted": track.is_muted,
                "is_solo": track.is_solo,
                "color": track.color
            },
            "clips": [
                {
                    "id": c.id,
                    "name": c.name,
                    "type": c.type,
                    "start_time": c.start_time,
                    "duration": c.duration,
                    "midi_events_count": len(c.midi_events) if c.midi_events else 0,
                    "is_muted": c.is_muted
                }
                for c in track_clips
            ],
            "effects": [
                {
                    "id": e.id,
                    "name": e.effect_name,
                    "display_name": e.display_name,
                    "parameters": e.parameters,
                    "is_bypassed": e.is_bypassed
                }
                for e in (track_effects.effects if track_effects else [])
            ],
            "mixer": {
                "fader": mixer_channel.fader if mixer_channel else 0.0,
                "pan": mixer_channel.pan if mixer_channel else 0.0,
                "mute": mixer_channel.mute if mixer_channel else False,
                "solo": mixer_channel.solo if mixer_channel else False
            } if mixer_channel else None,
            "composition_context": {
                "tempo": composition.tempo,
                "time_signature": composition.time_signature,
                "total_tracks": len(composition.tracks),
                "total_clips": len(composition.clips)
            }
        }
    
    def build_clip_context(
        self,
        composition_id: str,
        clip_id: str
    ) -> Dict[str, Any]:
        """Build detailed context for a specific clip"""
        composition = self.composition_state.get_composition(composition_id)
        if not composition:
            raise ValueError(f"Composition {composition_id} not found")
        
        # Find the clip
        clip = next((c for c in composition.clips if c.id == clip_id), None)
        if not clip:
            raise ValueError(f"Clip {clip_id} not found")
        
        # Find the parent track
        track = next((t for t in composition.tracks if t.id == clip.track_id), None)
        
        context = {
            "clip": {
                "id": clip.id,
                "name": clip.name,
                "type": clip.type,
                "start_time": clip.start_time,
                "duration": clip.duration,
                "gain": clip.gain,
                "is_muted": clip.is_muted,
                "is_looped": clip.is_looped
            },
            "track": {
                "id": track.id if track else None,
                "name": track.name if track else "Unknown",
                "type": track.type if track else "unknown",
                "instrument": track.instrument if track else None
            } if track else None,
            "composition_context": {
                "tempo": composition.tempo,
                "time_signature": composition.time_signature
            }
        }
        
        # Add MIDI-specific context
        if clip.type == "midi" and clip.midi_events:
            context["midi"] = {
                "note_count": len(clip.midi_events),
                "notes": [
                    {
                        "note": n.note,
                        "start": n.start,
                        "duration": n.duration,
                        "velocity": n.velocity
                    }
                    for n in clip.midi_events[:50]  # Limit to first 50 notes
                ]
            }
        
        # Add audio-specific context
        if clip.type == "audio":
            context["audio"] = {
                "file_path": clip.audio_file_path,
                "offset": clip.audio_offset
            }

        return context

    def build_effect_context(
        self,
        composition_id: str,
        effect_id: str
    ) -> Dict[str, Any]:
        """Build detailed context for a specific effect"""
        composition = self.composition_state.get_composition(composition_id)
        if not composition:
            raise ValueError(f"Composition {composition_id} not found")

        # Find the effect in track effect chains
        effect = None
        parent_track_id = None
        effect_chain = None

        for chain in composition.track_effects:
            for e in chain.effects:
                if e.id == effect_id:
                    effect = e
                    parent_track_id = chain.track_id
                    effect_chain = chain
                    break
            if effect:
                break

        if not effect:
            raise ValueError(f"Effect {effect_id} not found")

        # Find the parent track
        track = next((t for t in composition.tracks if t.id == parent_track_id), None)

        return {
            "effect": {
                "id": effect.id,
                "name": effect.effect_name,
                "display_name": effect.display_name,
                "parameters": effect.parameters,
                "is_bypassed": effect.is_bypassed,
                "slot_index": effect.slot_index
            },
            "effect_chain": {
                "total_effects": len(effect_chain.effects) if effect_chain else 0,
                "position": effect.slot_index + 1,
                "other_effects": [
                    {"name": e.effect_name, "slot": e.slot_index}
                    for e in (effect_chain.effects if effect_chain else [])
                    if e.id != effect_id
                ]
            },
            "track": {
                "id": track.id if track else None,
                "name": track.name if track else "Unknown",
                "type": track.type if track else "unknown"
            } if track else None,
            "composition_context": {
                "tempo": composition.tempo,
                "time_signature": composition.time_signature
            }
        }

    def build_mixer_channel_context(
        self,
        composition_id: str,
        channel_id: str
    ) -> Dict[str, Any]:
        """Build detailed context for a mixer channel"""
        composition = self.composition_state.get_composition(composition_id)
        if not composition:
            raise ValueError(f"Composition {composition_id} not found")

        # Find the mixer channel
        channel = next(
            (ch for ch in composition.mixer_state.channels if ch.id == channel_id),
            None
        )

        if not channel:
            # Check if it's the master channel
            if channel_id == "master":
                channel = composition.mixer_state.master
            else:
                raise ValueError(f"Mixer channel {channel_id} not found")

        # Find the corresponding track
        track = next((t for t in composition.tracks if t.id == channel_id), None)

        return {
            "channel": {
                "id": channel.id,
                "name": channel.name,
                "type": channel.type,
                "fader": channel.fader,
                "pan": getattr(channel, "pan", 0.0),
                "mute": channel.mute,
                "solo": getattr(channel, "solo", False),
                "input_gain": getattr(channel, "input_gain", 0.0),
                "meter_peak_left": channel.meter_peak_left,
                "meter_peak_right": channel.meter_peak_right
            },
            "track": {
                "id": track.id if track else None,
                "name": track.name if track else None,
                "type": track.type if track else None,
                "clips_count": len([c for c in composition.clips if c.track_id == track.id]) if track else 0
            } if track else None,
            "composition_context": {
                "tempo": composition.tempo,
                "total_channels": len(composition.mixer_state.channels),
                "any_solo": any(ch.solo for ch in composition.mixer_state.channels if hasattr(ch, "solo"))
            }
        }

    def build_composition_context(
        self,
        composition_id: str
    ) -> Dict[str, Any]:
        """Build full composition context (for general requests)"""
        composition = self.composition_state.get_composition(composition_id)
        if not composition:
            raise ValueError(f"Composition {composition_id} not found")

        return {
            "composition": {
                "id": composition.id,
                "name": composition.name,
                "tempo": composition.tempo,
                "time_signature": composition.time_signature,
                "is_playing": composition.is_playing,
                "current_position": composition.current_position
            },
            "tracks": [
                {
                    "id": t.id,
                    "name": t.name,
                    "type": t.type,
                    "instrument": t.instrument,
                    "clips_count": len([c for c in composition.clips if c.track_id == t.id])
                }
                for t in composition.tracks
            ],
            "clips": [
                {
                    "id": c.id,
                    "name": c.name,
                    "type": c.type,
                    "track_id": c.track_id,
                    "start_time": c.start_time,
                    "duration": c.duration
                }
                for c in composition.clips
            ],
            "mixer": {
                "channels_count": len(composition.mixer_state.channels),
                "master_fader": composition.mixer_state.master.fader
            }
        }

