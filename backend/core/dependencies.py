"""
FastAPI Dependency Injection
Provides clean dependency injection for all services
"""
import asyncio
from typing import Optional
from fastapi import Depends, HTTPException

from backend.core import get_logger
from backend.core.engine_manager import AudioEngineManager
from backend.services.synthesis_service import SynthesisService
from backend.services.effects_service import EffectsService
from backend.services.mixer_service import MixerService
from backend.services.sequencer_service import SequencerService
from backend.services.websocket_service import WebSocketService
from backend.services.sample_service import SampleService
from backend.services.audio_analyzer import AudioAnalyzer
from backend.services.audio_input_service import AudioInputService
from backend.services.synthdef_loader import load_essential_synthdefs

logger = get_logger(__name__)


# ============================================================================
# SERVICE CONTAINER
# ============================================================================

class ServiceContainer:
    """
    Global service container
    Initialized once at startup, accessed via dependency injection
    """
    def __init__(self):
        # Audio Engine
        self.audio_engine: Optional[AudioEngineManager] = None

        # Audio Engine Services
        self.synthesis_service: Optional[SynthesisService] = None
        self.effects_service: Optional[EffectsService] = None
        self.mixer_service: Optional[MixerService] = None
        self.sequencer_service: Optional[SequencerService] = None

        # Real-time Services
        self.audio_analyzer: Optional[AudioAnalyzer] = None
        self.audio_input_service: Optional[AudioInputService] = None
        self.websocket_service: Optional[WebSocketService] = None

        # Sample Library Service
        self.sample_service: Optional[SampleService] = None

        logger.info("Service container initialized")

    async def initialize(self):
        """Initialize all services"""
        logger.info("🎵 Initializing services...")

        # Initialize audio engine
        self.audio_engine = AudioEngineManager(
            host="127.0.0.1",
            port=57110,
            sample_rate=48000,
            block_size=64
        )
        logger.info("🎛️  Audio engine initialized")

        # Start audio engine
        engine_started = await self.audio_engine.start()
        if engine_started:
            logger.info("✅ Audio engine started successfully")

            # Load essential SynthDefs
            await load_essential_synthdefs()

            # Wait a moment for SynthDefs to be stored
            await asyncio.sleep(1)
        else:
            logger.warning("⚠️  Audio engine failed to start (SuperCollider may not be running)")

        # Initialize audio engine services
        self.synthesis_service = SynthesisService(self.audio_engine)
        self.effects_service = EffectsService(self.audio_engine)
        self.mixer_service = MixerService(self.audio_engine)
        self.sequencer_service = SequencerService(self.audio_engine, self.synthesis_service)
        logger.info("🎹 Audio engine services initialized")

        # Initialize audio analyzer
        # Port 57121 - receives OSC messages from sclang relay (sclang listens on 57120)
        self.audio_analyzer = AudioAnalyzer(
            sc_host="127.0.0.1",
            sc_port=57110,
            listen_port=57121,  # Changed from 57120 to 57121 (sclang relay forwards to this port)
            sample_rate=48000
        )
        await self.audio_analyzer.start()
        logger.info("🎤 Audio analyzer initialized")

        # Initialize audio input service
        self.audio_input_service = AudioInputService(
            sc_host="127.0.0.1",
            sc_port=57110
        )
        await self.audio_input_service.start()
        logger.info("🎙️  Audio input service initialized")

        # Initialize WebSocket service with sequencer and audio analyzer dependencies
        self.websocket_service = WebSocketService(
            sequencer_service=self.sequencer_service,
            audio_analyzer=self.audio_analyzer
        )
        await self.websocket_service.start()
        logger.info("🔌 WebSocket service initialized")

        # Initialize sample library service
        self.sample_service = SampleService()
        logger.info("📚 Sample library service initialized")

        logger.info("✅ All services initialized")

    async def shutdown(self):
        """Cleanup all services"""
        logger.info("Shutting down services...")

        if self.websocket_service:
            await self.websocket_service.stop()

        if self.audio_input_service:
            await self.audio_input_service.stop()

        if self.audio_analyzer:
            await self.audio_analyzer.stop()

        if self.audio_engine:
            await self.audio_engine.stop()

        logger.info("✅ Services shut down")


# Global service container instance
_container: Optional[ServiceContainer] = None


def get_container() -> ServiceContainer:
    """Get the global service container"""
    if _container is None:
        raise RuntimeError("Service container not initialized")
    return _container


def set_container(container: ServiceContainer):
    """Set the global service container"""
    global _container
    _container = container


# ============================================================================
# DEPENDENCY INJECTION FUNCTIONS
# ============================================================================

def get_audio_engine(container: ServiceContainer = Depends(get_container)) -> AudioEngineManager:
    """Get audio engine instance"""
    if container.audio_engine is None:
        raise HTTPException(status_code=503, detail="Audio engine not initialized")
    return container.audio_engine


def get_synthesis_service(container: ServiceContainer = Depends(get_container)) -> SynthesisService:
    """Get synthesis service instance"""
    if container.synthesis_service is None:
        raise HTTPException(status_code=503, detail="Synthesis service not initialized")
    return container.synthesis_service


def get_effects_service(container: ServiceContainer = Depends(get_container)) -> EffectsService:
    """Get effects service instance"""
    if container.effects_service is None:
        raise HTTPException(status_code=503, detail="Effects service not initialized")
    return container.effects_service


def get_mixer_service(container: ServiceContainer = Depends(get_container)) -> MixerService:
    """Get mixer service instance"""
    if container.mixer_service is None:
        raise HTTPException(status_code=503, detail="Mixer service not initialized")
    return container.mixer_service


def get_sequencer_service(container: ServiceContainer = Depends(get_container)) -> SequencerService:
    """Get sequencer service instance"""
    if container.sequencer_service is None:
        raise HTTPException(status_code=503, detail="Sequencer service not initialized")
    return container.sequencer_service


def get_websocket_service(container: ServiceContainer = Depends(get_container)) -> WebSocketService:
    """Get WebSocket service instance"""
    if container.websocket_service is None:
        raise HTTPException(status_code=503, detail="WebSocket service not initialized")
    return container.websocket_service


def get_audio_input_service(container: ServiceContainer = Depends(get_container)) -> AudioInputService:
    """Get audio input service instance"""
    if container.audio_input_service is None:
        raise HTTPException(status_code=503, detail="Audio input service not initialized")
    return container.audio_input_service




