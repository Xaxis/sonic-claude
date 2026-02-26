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
    from backend.core.dependencies import get_playback_engine_service

    @router.post("/preview")
    async def preview_note(
        playback_engine_service: PlaybackEngineService = Depends(get_playback_engine_service)
    ):
        return await playback_engine_service.preview_note(...)
"""
import logging
from typing import Optional

from backend.core.config import Settings
from backend.core.engine_manager import AudioEngineManager

# Audio services (core audio infrastructure)
from backend.services.audio.realtime_analyzer_service import RealtimeAudioAnalyzer
from backend.services.audio.input_service import AudioInputService
from backend.services.audio.buffer_manager_service import BufferManager
from backend.services.audio.bus_manager_service import AudioBusManager

# Perception services (3-layer pipeline)
from backend.services.perception.audio_features import AudioFeaturesAnalyzer
from backend.services.perception.symbolic_analysis import SymbolicAnalyzer
from backend.services.perception.musical_perception import MusicalPerceptionAnalyzer
from backend.services.perception.composition_perception import CompositionPerceptionAnalyzer

# DAW services
from backend.services.daw.composition_state_service import CompositionStateService
from backend.services.daw.playback_engine_service import PlaybackEngineService
from backend.services.daw.mixer_service import MixerService
from backend.services.daw.mixer_track_channels_service import MixerTrackChannelsService
from backend.services.daw.track_meters_service import TrackMetersService
from backend.services.daw.track_effects_service import TrackEffectsService

# AI services
from backend.services.ai.state_collector_service import DAWStateService
from backend.services.ai.action_executor_service import DAWActionService
from backend.services.ai.agent_service import AIAgentService

# Persistence services
from backend.services.daw.composition_service import CompositionService

# WebSocket services
from backend.services.websocket import WebSocketManager

logger = logging.getLogger(__name__)

# ============================================================================
# SERVICE SINGLETONS
# These are initialized during app startup and reused across requests
# ============================================================================

_engine_manager: Optional[AudioEngineManager] = None
_audio_analyzer: Optional[RealtimeAudioAnalyzer] = None
_audio_input_service: Optional[AudioInputService] = None
_composition_state_service: Optional[CompositionStateService] = None
_playback_engine_service: Optional[PlaybackEngineService] = None
_ws_manager: Optional[WebSocketManager] = None
_buffer_manager: Optional[BufferManager] = None
_mixer_service: Optional[MixerService] = None
_track_meter_service: Optional[TrackMetersService] = None
_audio_bus_manager: Optional[AudioBusManager] = None
_mixer_channel_service: Optional[MixerTrackChannelsService] = None
_track_effects_service: Optional[TrackEffectsService] = None
_audio_features_analyzer: Optional[AudioFeaturesAnalyzer] = None
_symbolic_analyzer: Optional[SymbolicAnalyzer] = None
_musical_perception_analyzer: Optional[MusicalPerceptionAnalyzer] = None
_composition_perception_analyzer: Optional[CompositionPerceptionAnalyzer] = None
_daw_state_service: Optional[DAWStateService] = None
_daw_action_service: Optional[DAWActionService] = None
_composition_service: Optional[CompositionService] = None
_ai_agent_service: Optional[AIAgentService] = None


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
    global _composition_state_service, _playback_engine_service
    global _ws_manager, _buffer_manager, _mixer_service
    global _track_meter_service, _audio_bus_manager, _mixer_channel_service, _track_effects_service
    global _audio_features_analyzer, _symbolic_analyzer
    global _musical_perception_analyzer, _composition_perception_analyzer
    global _daw_state_service, _daw_action_service, _composition_service, _ai_agent_service

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
    _mixer_channel_service = MixerTrackChannelsService(_engine_manager, _audio_bus_manager)
    _track_meter_service = TrackMetersService(_engine_manager, _mixer_channel_service)
    _track_effects_service = TrackEffectsService(_engine_manager, _audio_bus_manager, _mixer_channel_service)

    # Step 4: Initialize unified composition service FIRST (needed by other services)
    logger.info("💾 Initializing unified composition service...")
    _composition_service = CompositionService(
        storage_dir=settings.storage.compositions_dir,
        samples_dir=settings.storage.samples_dir
    )

    # Step 5: Initialize audio services (depend on engine_manager and metering services)
    logger.info("🎵 Initializing audio services...")
    _audio_analyzer = RealtimeAudioAnalyzer(_engine_manager)
    _audio_input_service = AudioInputService(_engine_manager)

    # Initialize composition state service (no dependencies)
    logger.info("📦 Initializing composition state service...")
    _composition_state_service = CompositionStateService()

    # Initialize playback engine service (depends on composition state service)
    logger.info("▶️  Initializing playback engine service...")
    _playback_engine_service = PlaybackEngineService(
        composition_state_service=_composition_state_service,
        engine_manager=_engine_manager,
        websocket_manager=_ws_manager,
        audio_bus_manager=_audio_bus_manager,
        mixer_channel_service=_mixer_channel_service
    )



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

    # Step 6: Initialize AI services
    logger.info("🤖 Initializing AI services...")

    # Create perception pipeline (3 layers)
    logger.info("🎵 Initializing perception pipeline...")
    # Layer 1: Raw analysis
    _audio_features_analyzer = AudioFeaturesAnalyzer()
    _symbolic_analyzer = SymbolicAnalyzer()
    # Layer 2: Musical perception
    _musical_perception_analyzer = MusicalPerceptionAnalyzer()
    # Layer 3: Compositional intelligence
    _composition_perception_analyzer = CompositionPerceptionAnalyzer()

    # Create sample analyzer (shared between DAW state and AI agent)
    from backend.services.perception.sample_analysis import SampleAnalyzer
    _sample_analyzer = SampleAnalyzer(samples_dir=settings.storage.samples_dir)

    # Create DAW state and action services
    _daw_state_service = DAWStateService(
        composition_state_service=_composition_state_service,
        mixer_service=_mixer_service,
        engine_manager=_engine_manager,
        audio_feature_extractor=_audio_features_analyzer,
        musical_context_analyzer=_symbolic_analyzer,
        sample_analyzer=_sample_analyzer
    )

    _daw_action_service = DAWActionService(
        composition_state_service=_composition_state_service,
        playback_engine_service=_playback_engine_service,
        mixer_service=_mixer_service,
        track_effects_service=_track_effects_service
    )

    # Create AI agent service (always enabled, API key from env)
    api_key = settings.ai.anthropic_api_key
    if api_key:
        logger.info(f"🤖 AI API key loaded: {api_key[:10]}...")
    else:
        logger.warning("⚠️  No AI API key found! Set AI__ANTHROPIC_API_KEY in .env file (note: double underscore)")

    _ai_agent_service = AIAgentService(
        state_service=_daw_state_service,
        action_service=_daw_action_service,
        composition_service=_composition_service,
        api_key=api_key,
        model=settings.ai.model,
        samples_dir=settings.storage.samples_dir,
        musical_perception_analyzer=_musical_perception_analyzer,
        composition_perception_analyzer=_composition_perception_analyzer
    )

    # Configure AI settings
    _ai_agent_service.min_call_interval = settings.ai.min_call_interval

    # Wire up audio feature extraction pipeline
    # Hook into audio analyzer to extract features from spectrum/meter data
    def _extract_and_update_features(spectrum_data):
        """Extract features from spectrum data and update DAW state"""
        try:
            features = _audio_features_analyzer.extract_features(
                spectrum=spectrum_data.get("spectrum", []),
                peak_db=spectrum_data.get("peak_db"),
                rms_db=spectrum_data.get("rms_db"),
                is_playing=_playback_engine_service.is_playing if _playback_engine_service else False
            )
            _daw_state_service.update_audio_features(features)
        except Exception as e:
            logger.error(f"Error extracting audio features: {e}")

    # Register feature extraction callback (runs after spectrum broadcast)
    original_spectrum_callback = _audio_analyzer.on_spectrum_update
    async def _spectrum_with_features(data):
        # First broadcast to WebSocket
        if original_spectrum_callback:
            await original_spectrum_callback(data)
        # Then extract features for AI
        _extract_and_update_features(data)

    _audio_analyzer.on_spectrum_update = _spectrum_with_features

    # Wire up musical context analysis
    # Triggered automatically when MIDI content changes (add/update/delete clip)
    _composition_state_service.on_composition_changed = _daw_state_service.analyze_current_sequence

    logger.info("✅ AI services initialized")

    logger.info("✅ Services initialized successfully")


async def shutdown_services() -> None:
    """
    Shutdown all services during app shutdown

    This function is called from the FastAPI lifespan context manager.
    It ensures proper cleanup of resources.
    """
    global _engine_manager, _audio_analyzer, _audio_input_service
    global _ws_manager, _buffer_manager, _mixer_service
    global _track_meter_service, _audio_bus_manager, _mixer_channel_service

    logger.info("🛑 Shutting down services...")

    # NOTE: Autosave promotion now handled by CompositionService
    # No need to manually promote autosaves anymore

    # Stop monitoring services
    if _audio_analyzer:
        await _audio_analyzer.stop_monitoring()

    if _audio_input_service:
        await _audio_input_service.stop_monitoring()

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


def get_audio_analyzer() -> RealtimeAudioAnalyzer:
    """Get RealtimeAudioAnalyzer instance"""
    if _audio_analyzer is None:
        raise RuntimeError("RealtimeAudioAnalyzer not initialized")
    return _audio_analyzer


def get_audio_input_service() -> AudioInputService:
    """Get AudioInputService instance"""
    if _audio_input_service is None:
        raise RuntimeError("AudioInputService not initialized")
    return _audio_input_service


def get_composition_state_service() -> CompositionStateService:
    """Get CompositionStateService instance"""
    if _composition_state_service is None:
        raise RuntimeError("CompositionStateService not initialized")
    return _composition_state_service


def get_playback_engine_service() -> PlaybackEngineService:
    """Get PlaybackEngineService instance"""
    if _playback_engine_service is None:
        raise RuntimeError("PlaybackEngineService not initialized")
    return _playback_engine_service


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


def get_track_meter_service() -> TrackMetersService:
    """Get TrackMeterHandler instance"""
    if _track_meter_service is None:
        raise RuntimeError("TrackMeterHandler not initialized")
    return _track_meter_service


def get_audio_bus_manager() -> AudioBusManager:
    """Get AudioBusManager instance"""
    if _audio_bus_manager is None:
        raise RuntimeError("AudioBusManager not initialized")
    return _audio_bus_manager


def get_mixer_channel_service() -> MixerTrackChannelsService:
    """Get MixerChannelSynthManager instance"""
    if _mixer_channel_service is None:
        raise RuntimeError("MixerChannelSynthManager not initialized")
    return _mixer_channel_service


def get_track_effects_service() -> TrackEffectsService:
    """Get TrackEffectsService instance"""
    if _track_effects_service is None:
        raise RuntimeError("TrackEffectsService not initialized")
    return _track_effects_service


def get_audio_features_analyzer() -> AudioFeaturesAnalyzer:
    """Get AudioFeaturesAnalyzer instance"""
    if _audio_features_analyzer is None:
        raise RuntimeError("AudioFeaturesAnalyzer not initialized")
    return _audio_features_analyzer


def get_symbolic_analyzer() -> SymbolicAnalyzer:
    """Get SymbolicAnalyzer instance"""
    if _symbolic_analyzer is None:
        raise RuntimeError("SymbolicAnalyzer not initialized")
    return _symbolic_analyzer


def get_musical_perception_analyzer() -> MusicalPerceptionAnalyzer:
    """Get MusicalPerceptionAnalyzer instance (Layer 2)"""
    if _musical_perception_analyzer is None:
        raise RuntimeError("MusicalPerceptionAnalyzer not initialized")
    return _musical_perception_analyzer


def get_composition_perception_analyzer() -> CompositionPerceptionAnalyzer:
    """Get CompositionPerceptionAnalyzer instance (Layer 3)"""
    if _composition_perception_analyzer is None:
        raise RuntimeError("CompositionPerceptionAnalyzer not initialized")
    return _composition_perception_analyzer


def get_daw_state_service() -> DAWStateService:
    """Get DAWStateService instance"""
    if _daw_state_service is None:
        raise RuntimeError("DAWStateService not initialized")
    return _daw_state_service


def get_daw_action_service() -> DAWActionService:
    """Get DAWActionService instance"""
    if _daw_action_service is None:
        raise RuntimeError("DAWActionService not initialized")
    return _daw_action_service


def get_composition_service() -> CompositionService:
    """Get CompositionService instance"""
    if _composition_service is None:
        raise RuntimeError("CompositionService not initialized")
    return _composition_service


def get_ai_agent_service() -> AIAgentService:
    """Get AIAgentService instance"""
    if _ai_agent_service is None:
        raise RuntimeError("AIAgentService not initialized")
    return _ai_agent_service
