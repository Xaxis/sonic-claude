"""
Dependency Injection - FastAPI dependency providers

Provides singleton instances of services for dependency injection.
This replaces the global service instances pattern with proper DI.

Architecture:
- Settings are loaded once and cached
- Services are initialized during app lifespan
- Dependencies are injected via FastAPI Depends()
- Proper lifecycle management with startup/shutdown

Usage:
    from fastapi import Depends
    from backend.core.dependencies import get_synthesis_service

    @router.post("/synth")
    async def create_synth(
        synthesis_service: SynthesisService = Depends(get_synthesis_service)
    ):
        return await synthesis_service.create_synth(...)
"""
import logging
from typing import Optional
from fastapi import Depends

from backend.core.config import Settings, get_settings
from backend.core.engine_manager import AudioEngineManager
from backend.services.audio_analyzer import AudioAnalyzerService
from backend.services.audio_input_service import AudioInputService
from backend.services.synthesis_service import SynthesisService
from backend.services.sequencer_service import SequencerService
from backend.services.websocket_manager import WebSocketManager
from backend.services.buffer_manager import BufferManager
from backend.services.mixer_service import MixerService
from backend.services.track_meter_service import TrackMeterService
from backend.services.audio_bus_manager import AudioBusManager
from backend.services.mixer_channel_service import MixerChannelService
from backend.services.track_effects_service import TrackEffectsService

logger = logging.getLogger(__name__)

# ============================================================================
# SERVICE SINGLETONS
# These are initialized during app startup and reused across requests
# ============================================================================

_engine_manager: Optional[AudioEngineManager] = None
_audio_analyzer: Optional[AudioAnalyzerService] = None
_audio_input_service: Optional[AudioInputService] = None
_synthesis_service: Optional[SynthesisService] = None
_sequencer_service: Optional[SequencerService] = None
_ws_manager: Optional[WebSocketManager] = None
_buffer_manager: Optional[BufferManager] = None
_mixer_service: Optional[MixerService] = None
_track_meter_service: Optional[TrackMeterService] = None
_audio_bus_manager: Optional[AudioBusManager] = None
_mixer_channel_service: Optional[MixerChannelService] = None
_track_effects_service: Optional[TrackEffectsService] = None


# ============================================================================
# INITIALIZATION FUNCTIONS
# Called during app lifespan startup
# ============================================================================

async def initialize_services(settings: Settings) -> None:
    """
    Initialize all services during app startup

    This function is called from the FastAPI lifespan context manager.
    It sets up the complete service dependency graph.

    Args:
        settings: Application settings
    """
    global _engine_manager, _audio_analyzer, _audio_input_service
    global _synthesis_service, _sequencer_service, _ws_manager, _buffer_manager, _mixer_service
    global _track_meter_service, _audio_bus_manager, _mixer_channel_service, _track_effects_service

    logger.info("🚀 Initializing services...")

    # Step 1: Initialize WebSocket manager (no dependencies)
    logger.info("📡 Initializing WebSocket manager...")
    _ws_manager = WebSocketManager()

    # Step 2: Initialize engine manager (depends on settings)
    logger.info("🔗 Connecting to SuperCollider...")
    _engine_manager = AudioEngineManager()
    await _engine_manager.connect()

    # Step 3: Initialize per-track metering and effects services
    logger.info("🎚️ Initializing per-track metering and effects...")
    _audio_bus_manager = AudioBusManager()
    _mixer_channel_service = MixerChannelService(_engine_manager, _audio_bus_manager)
    _track_meter_service = TrackMeterService(_engine_manager, _mixer_channel_service)
    _track_effects_service = TrackEffectsService(_engine_manager, _audio_bus_manager, _mixer_channel_service)

    # Step 4: Initialize audio services (depend on engine_manager and metering services)
    logger.info("🎵 Initializing audio services...")
    _audio_analyzer = AudioAnalyzerService(_engine_manager)
    _audio_input_service = AudioInputService(_engine_manager)
    _synthesis_service = SynthesisService(_engine_manager)
    _sequencer_service = SequencerService(_engine_manager, _ws_manager, _audio_bus_manager, _mixer_channel_service)
    _buffer_manager = BufferManager(_engine_manager)
    _mixer_service = MixerService(_engine_manager, _ws_manager, _audio_analyzer)

    # Step 5: Wire up callbacks (Audio Analyzer → WebSocket Manager)
    logger.info("🔌 Wiring up audio pipeline...")
    _audio_analyzer.on_waveform_update = _ws_manager.broadcast_waveform
    _audio_analyzer.on_spectrum_update = _ws_manager.broadcast_spectrum
    _audio_analyzer.on_meter_update = _ws_manager.broadcast_meters

    # Wire up input audio pipeline
    _audio_input_service.on_waveform_update = _ws_manager.broadcast_waveform
    _audio_input_service.on_spectrum_update = _ws_manager.broadcast_spectrum
    _audio_input_service.on_meter_update = _ws_manager.broadcast_meters

    # Wire up per-track meter pipeline
    _track_meter_service.on_meter_update = _ws_manager.broadcast_meters

    logger.info("✅ Services initialized successfully")


async def shutdown_services() -> None:
    """
    Shutdown all services during app shutdown

    This function is called from the FastAPI lifespan context manager.
    It ensures proper cleanup of resources.
    """
    global _engine_manager, _audio_analyzer, _audio_input_service
    global _synthesis_service, _sequencer_service, _ws_manager, _buffer_manager, _mixer_service
    global _track_meter_service, _audio_bus_manager, _mixer_channel_service

    logger.info("🛑 Shutting down services...")

    # Promote all autosaves before shutdown
    if _sequencer_service and _sequencer_service.storage:
        logger.info("💾 Promoting autosaves to main sequence files...")
        _sequencer_service.storage.promote_all_autosaves()

    # Stop monitoring services
    if _audio_analyzer:
        await _audio_analyzer.stop_monitoring()

    if _audio_input_service:
        await _audio_input_service.stop_monitoring()

    # Free all synths
    if _synthesis_service:
        await _synthesis_service.free_all_synths()

    # Disconnect engine
    if _engine_manager:
        await _engine_manager.disconnect()

    logger.info("✅ Services shut down successfully")


# ============================================================================
# DEPENDENCY PROVIDERS
# These functions are used with FastAPI Depends()
# ============================================================================

def get_engine_manager() -> AudioEngineManager:
    """Get AudioEngineManager instance"""
    if _engine_manager is None:
        raise RuntimeError("AudioEngineManager not initialized")
    return _engine_manager


def get_audio_analyzer() -> AudioAnalyzerService:
    """Get AudioAnalyzerService instance"""
    if _audio_analyzer is None:
        raise RuntimeError("AudioAnalyzerService not initialized")
    return _audio_analyzer


def get_audio_input_service() -> AudioInputService:
    """Get AudioInputService instance"""
    if _audio_input_service is None:
        raise RuntimeError("AudioInputService not initialized")
    return _audio_input_service


def get_synthesis_service() -> SynthesisService:
    """Get SynthesisService instance"""
    if _synthesis_service is None:
        raise RuntimeError("SynthesisService not initialized")
    return _synthesis_service


def get_sequencer_service() -> SequencerService:
    """Get SequencerService instance"""
    if _sequencer_service is None:
        raise RuntimeError("SequencerService not initialized")
    return _sequencer_service


def get_ws_manager() -> WebSocketManager:
    """Get WebSocketManager instance"""
    if _ws_manager is None:
        raise RuntimeError("WebSocketManager not initialized")
    return _ws_manager


def get_buffer_manager() -> BufferManager:
    """Get BufferManager instance"""
    if _buffer_manager is None:
        raise RuntimeError("BufferManager not initialized")
    return _buffer_manager


def get_mixer_service() -> MixerService:
    """Get MixerService instance"""
    if _mixer_service is None:
        raise RuntimeError("MixerService not initialized")
    return _mixer_service


def get_track_meter_service() -> TrackMeterService:
    """Get TrackMeterService instance"""
    if _track_meter_service is None:
        raise RuntimeError("TrackMeterService not initialized")
    return _track_meter_service


def get_audio_bus_manager() -> AudioBusManager:
    """Get AudioBusManager instance"""
    if _audio_bus_manager is None:
        raise RuntimeError("AudioBusManager not initialized")
    return _audio_bus_manager


def get_mixer_channel_service() -> MixerChannelService:
    """Get MixerChannelService instance"""
    if _mixer_channel_service is None:
        raise RuntimeError("MixerChannelService not initialized")
    return _mixer_channel_service


def get_track_effects_service() -> TrackEffectsService:
    """Get TrackEffectsService instance"""
    if _track_effects_service is None:
        raise RuntimeError("TrackEffectsService not initialized")
    return _track_effects_service
