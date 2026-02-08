"""
OSC message models
"""
from pydantic import BaseModel, Field, validator
from typing import Union, Literal


class OSCMessage(BaseModel):
    """OSC message to send to Sonic Pi"""
    parameter: str = Field(..., description="Parameter name (e.g., 'bpm', 'intensity', 'cutoff')")
    value: Union[int, float, str] = Field(..., description="Parameter value")
    
    @validator('parameter')
    def validate_parameter(cls, v):
        """Validate parameter name"""
        valid_params = {
            'bpm', 'intensity', 'cutoff', 'reverb', 'echo', 
            'key', 'scale', 'transport', 'complexity'
        }
        if v not in valid_params:
            raise ValueError(f"Invalid parameter: {v}. Must be one of {valid_params}")
        return v


class TransportCommand(BaseModel):
    """Transport control command"""
    action: Literal['play', 'stop'] = Field(..., description="Transport action")

