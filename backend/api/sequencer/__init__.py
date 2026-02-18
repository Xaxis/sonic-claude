"""
Sequencer API - Modular router combining all sequencer endpoints

This module organizes sequencer routes into logical groups:
- sequences: Sequence CRUD and version management
- clips: Clip operations within sequences
- tracks: Track management
- playback: Playback control and transport
- synthdefs: Available synthesizer definitions
- metronome: Metronome controls
- preview: Note preview for UI feedback
"""
from fastapi import APIRouter

from . import sequences, clips, tracks, playback, synthdefs, metronome, preview

# Create main router
router = APIRouter()

# Include all sub-routers
router.include_router(sequences.router, tags=["sequences"])
router.include_router(clips.router, tags=["clips"])
router.include_router(tracks.router, tags=["tracks"])
router.include_router(playback.router, tags=["playback"])
router.include_router(synthdefs.router, tags=["synthdefs"])
router.include_router(metronome.router, tags=["metronome"])
router.include_router(preview.router, tags=["preview"])

