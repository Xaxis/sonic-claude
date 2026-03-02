"""
Drum Kit Registry — 44 production-quality kits organized by style.

Each kit maps GM drum note numbers to SynthDef voices with per-pad parameter
overrides that shape the kit's character. Velocity (amp) is never stored here —
it is always derived from MIDI velocity at runtime by the playback engine.

Standard GM Drum Note Layout:
    36: Kick (C2)           38: Snare (D2)          37: Side Stick (C#2)
    39: Hand Clap (D#2)     40: Snare Tight (E2)    41: Floor Tom Low (F2)
    42: Closed Hi-Hat (F#2) 43: Floor Tom Hi (G2)   44: Pedal Hi-Hat (G#2)
    45: Tom Low (A2)        46: Open Hi-Hat (A#2)   47: Tom Mid-Low (B2)
    48: Tom Mid-Hi (C3)     49: Crash Cymbal (C#3)  50: Tom Hi (D3)
    51: Ride Cymbal (D#3)   54: Tambourine (F#3)    55: Splash Cymbal (G3)
    56: Cowbell (G#3)       60: Hi Bongo (C4)       61: Lo Bongo (C#4)
    64: Lo Conga (E4)       65: Hi Timbale (F4)     66: Lo Timbale (F#4)
    69: Shaker/Cabasa       70: Maracas

Adding a new kit:
  1. Add a kit dict to the appropriate category file
  2. It will appear in the browser and be available via kit_id in track creation
"""

from typing import Optional

from .classic    import KITS as _CLASSIC
from .electronic import KITS as _ELECTRONIC
from .acoustic   import KITS as _ACOUSTIC
from .creative   import KITS as _CREATIVE

# Complete ordered list — order determines browser display order within category
ALL_KITS = _CLASSIC + _ELECTRONIC + _ACOUSTIC + _CREATIVE


def get_all_kits() -> list:
    """Return all kit definitions."""
    return ALL_KITS


def get_kit_by_id(kit_id: str) -> Optional[dict]:
    """Return a kit by its ID, or None if not found."""
    for kit in ALL_KITS:
        if kit["id"] == kit_id:
            return kit
    return None


__all__ = [
    "ALL_KITS",
    "get_all_kits",
    "get_kit_by_id",
]
