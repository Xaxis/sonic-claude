"""
Effect models
"""
from dataclasses import dataclass, field
from typing import Dict, Optional
from enum import Enum


class EffectType(str, Enum):
    """Effect types"""
    REVERB = "reverb"
    DELAY = "delay"
    FILTER = "filter"
    DISTORTION = "distortion"
    COMPRESSOR = "compressor"
    EQ = "eq"
    CHORUS = "chorus"
    FLANGER = "flanger"
    PHASER = "phaser"
    BITCRUSHER = "bitcrusher"


@dataclass
class EffectDef:
    """
    Effect definition with parameter metadata
    LLM-friendly design with ranges and descriptions
    """
    name: str
    effect_type: EffectType
    parameters: Dict[str, float] = field(default_factory=dict)
    description: str = ""
    parameter_ranges: Dict[str, tuple[float, float]] = field(default_factory=dict)
    parameter_descriptions: Dict[str, str] = field(default_factory=dict)


@dataclass
class Effect:
    """
    Active effect instance
    """
    id: int
    effect_def: str  # EffectDef name
    parameters: Dict[str, float] = field(default_factory=dict)
    group: int = 2  # Default to effects group
    bus_in: Optional[int] = None
    bus_out: Optional[int] = None
    bypass: bool = False
    
    def set(self, param: str, value: float):
        """Set parameter value"""
        self.parameters[param] = value

