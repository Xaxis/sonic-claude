"""
Track and mixer models
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


class TrackType(str, Enum):
    """Track type enumeration"""
    AUDIO = "audio"
    MIDI = "midi"
    AUX = "aux"
    MASTER = "master"


@dataclass
class Effect:
    """Effect instance on a track"""
    id: int
    type: str  # reverb, delay, filter, compressor, etc.
    parameters: dict[str, float] = field(default_factory=dict)
    bypass: bool = False


@dataclass
class Track:
    """Mixer track"""
    id: str
    name: str
    type: TrackType
    bus: int
    volume: float = 1.0  # 0.0 to 2.0
    pan: float = 0.0  # -1.0 (left) to 1.0 (right)
    muted: bool = False
    soloed: bool = False
    effects: List[Effect] = field(default_factory=list)
    send_levels: dict[str, float] = field(default_factory=dict)  # aux_track_id -> level
    
    def add_effect(self, effect: Effect):
        """Add effect to track"""
        self.effects.append(effect)
    
    def remove_effect(self, effect_id: int):
        """Remove effect from track"""
        self.effects = [e for e in self.effects if e.id != effect_id]
    
    def set_send(self, aux_track_id: str, level: float):
        """Set send level to aux track"""
        self.send_levels[aux_track_id] = level

