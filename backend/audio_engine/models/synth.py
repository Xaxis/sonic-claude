"""
Synth and SynthDef models
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class SynthDef:
    """SuperCollider SynthDef definition"""
    name: str
    parameters: Dict[str, float] = field(default_factory=dict)
    description: str = ""
    category: str = "general"  # drums, bass, lead, pad, fx, etc.
    
    # Parameter metadata for LLM control
    parameter_ranges: Dict[str, tuple[float, float]] = field(default_factory=dict)
    parameter_descriptions: Dict[str, str] = field(default_factory=dict)


@dataclass
class Synth:
    """Active synth instance"""
    id: int
    synthdef: str
    group: int
    parameters: Dict[str, float] = field(default_factory=dict)
    bus: Optional[int] = None
    is_playing: bool = True
    
    def set(self, param: str, value: float):
        """Update parameter value"""
        self.parameters[param] = value
    
    def get(self, param: str) -> Optional[float]:
        """Get parameter value"""
        return self.parameters.get(param)

