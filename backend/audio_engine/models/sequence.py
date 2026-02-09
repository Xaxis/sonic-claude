"""
Sequencer and timeline models
"""
from dataclasses import dataclass, field
from typing import List, Optional, Union


@dataclass
class MIDINote:
    """MIDI note event"""
    note: int  # 0-127
    velocity: float  # 0.0-1.0
    duration: float  # In beats
    time: float  # In beats
    channel: int = 0


@dataclass
class AudioClip:
    """Audio sample clip"""
    sample_id: str
    start_offset: float = 0.0  # Offset into sample (seconds)
    playback_rate: float = 1.0
    loop: bool = False
    loop_start: float = 0.0
    loop_end: Optional[float] = None


@dataclass
class MIDIClip:
    """MIDI note clip"""
    notes: List[MIDINote] = field(default_factory=list)
    synthdef: str = "default"
    
    def add_note(self, note: MIDINote):
        """Add note to clip"""
        self.notes.append(note)
    
    def remove_note(self, note: MIDINote):
        """Remove note from clip"""
        self.notes.remove(note)


@dataclass
class Clip:
    """Timeline clip"""
    id: str
    track_id: str
    start_time: float  # In beats
    duration: float  # In beats
    content: Union[MIDIClip, AudioClip]
    muted: bool = False
    color: str = "#3b82f6"


@dataclass
class Sequence:
    """Timeline sequence"""
    id: str
    name: str
    tempo: float = 120.0
    time_signature: str = "4/4"
    clips: List[Clip] = field(default_factory=list)
    is_playing: bool = False
    is_looping: bool = True
    loop_start: float = 0.0  # In beats
    loop_end: float = 16.0  # In beats
    playhead_position: float = 0.0  # In beats
    
    def add_clip(self, clip: Clip):
        """Add clip to sequence"""
        self.clips.append(clip)
    
    def remove_clip(self, clip_id: str):
        """Remove clip from sequence"""
        self.clips = [c for c in self.clips if c.id != clip_id]
    
    def get_clip(self, clip_id: str) -> Optional[Clip]:
        """Get clip by ID"""
        for clip in self.clips:
            if clip.id == clip_id:
                return clip
        return None

