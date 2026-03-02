"""
SynthDef Registry — aggregated catalog of all available synthesizer voices.

Organized by source SC file:
  basic.py      → instruments.scd  (basic waveforms)
  synth.py      → instruments.scd  (electronic synthesizers)
  drums.py      → drums.scd        (drum machine voices)
  percussion.py → drums.scd        (latin & world percussion)
  melodic.py    → melodic.scd      (GM standard instruments)

Adding a new SynthDef:
  1. Add the SynthDef(\name, {...}) block to the appropriate .scd file
  2. Add a metadata entry to the corresponding Python file here
  3. The entry will appear in the browser immediately on next server restart
"""

from .basic      import SYNTHDEFS as _BASIC
from .synth      import SYNTHDEFS as _SYNTH
from .drums      import SYNTHDEFS as _DRUMS
from .percussion import SYNTHDEFS as _PERCUSSION
from .melodic    import SYNTHDEFS as _MELODIC

# Complete ordered list — order determines browser display order within category
ALL_SYNTHDEFS = _BASIC + _SYNTH + _DRUMS + _PERCUSSION + _MELODIC


def get_all_synthdefs() -> list:
    """Return all SynthDef metadata entries."""
    return ALL_SYNTHDEFS


def get_synthdefs_by_category(category: str) -> list:
    """Return SynthDef entries for a single category."""
    return [s for s in ALL_SYNTHDEFS if s["category"] == category]


def get_categories() -> list:
    """Return sorted list of all category names."""
    return sorted({s["category"] for s in ALL_SYNTHDEFS})


__all__ = [
    "ALL_SYNTHDEFS",
    "get_all_synthdefs",
    "get_synthdefs_by_category",
    "get_categories",
]
