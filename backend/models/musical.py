"""
Musical state and decision models
"""
from pydantic import BaseModel, Field
from typing import Optional, Union


class MusicalState(BaseModel):
    """Current musical state of the system"""
    bpm: int = Field(..., ge=60, le=180, description="Beats per minute")
    key: str = Field(default="C", description="Musical key (A-G)")
    scale: str = Field(default="minor", description="Musical scale")
    intensity: float = Field(..., ge=0.0, le=10.0, description="Overall intensity (0-10)")
    complexity: float = Field(..., ge=0.0, le=10.0, description="Musical complexity (0-10)")
    energy_level: float = Field(default=0.0, ge=0.0, le=1.0, description="Current energy level")


class Decision(BaseModel):
    """AI decision about a parameter change"""
    parameter: str = Field(..., description="Parameter name that was changed")
    value: Union[int, float, str] = Field(..., description="New value for the parameter")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence in decision (0-1)")
    reason: str = Field(..., description="Human-readable explanation of the decision")
    timestamp: Optional[float] = Field(default=None, description="Unix timestamp of decision")

