"""
DAW Sound Registry — single entry point for all catalog definitions.

Directory layout:
  registry/
    synthdefs/        ← Python metadata for every SC SynthDef voice
      basic.py        → instruments.scd  (sine, saw, square, triangle)
      synth.py        → instruments.scd  (fm, pad, bass, lead, pluck, bell, organ)
      drums.py        → drums.scd        (808/909 drum machine voices)
      percussion.py   → drums.scd        (latin & world percussion)
      melodic.py      → melodic.scd      (GM standard instruments)
    kits/             ← Drum kit presets composing SynthDefs + per-pad tuning
      classic.py      → 808, 909, 606, 707, 505, Linn (6 kits)
      electronic.py   → Trap, House, Techno, DnB, BoomBap, LoFi, UKGarage, Afrobeats (8 kits)
      acoustic.py     → Rock, Jazz, Funk, Latin, R&B, Brush (6 kits)
      creative.py     → Hot Rod, Coma, Minimal, Industrial, Ambient, World Fusion (6 kits)

Correspondence rule:
  Every SC SynthDef(\name, {...}) in a .scd file must have a matching entry
  in the Python registry here with the same name. Python provides discovery
  metadata (display_name, category, description, parameters); SC provides
  the actual audio synthesis.

Usage:
  from backend.services.daw.registry import (
      get_all_synthdefs, get_synthdefs_by_category, get_categories,
      SYNTHDEF_REGISTRY,
      get_all_kits, get_kit_by_id,
  )
"""

from .synthdefs import (
    get_all_synthdefs,
    get_synthdefs_by_category,
    get_categories,
    ALL_SYNTHDEFS,
)
from .kits import (
    get_all_kits,
    get_kit_by_id,
    ALL_KITS,
)

# Legacy alias — kept for callers that reference SYNTHDEF_REGISTRY directly
SYNTHDEF_REGISTRY = ALL_SYNTHDEFS

__all__ = [
    # SynthDef API
    "get_all_synthdefs",
    "get_synthdefs_by_category",
    "get_categories",
    "ALL_SYNTHDEFS",
    "SYNTHDEF_REGISTRY",    # legacy alias
    # Kit API
    "get_all_kits",
    "get_kit_by_id",
    "ALL_KITS",
]
