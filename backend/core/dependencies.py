"""
FastAPI Dependency Injection
Provides clean dependency injection for all services
"""
from typing import Optional
from fastapi import Depends, HTTPException

from backend.core import get_logger
from backend.core.engine_manager import AudioEngineManager
from backend.services import (
    SynthesisService,
    EffectsService,
    MixerService,
    SequencerService
)
from backend.services.websocket_service import WebSocketService
from backend.services.websocket_service import WebSocketService

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
        self.websocket_service: Optional[WebSocketService] = None

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
        else:
            logger.warning("⚠️  Audio engine failed to start (SuperCollider may not be running)")

        # Initialize audio engine services
        self.synthesis_service = SynthesisService(self.audio_engine)
        self.effects_service = EffectsService(self.audio_engine)
        self.mixer_service = MixerService(self.audio_engine)
        self.sequencer_service = SequencerService(self.audio_engine, self.synthesis_service)
        logger.info("🎹 Audio engine services initialized")

        # Initialize WebSocket service with sequencer dependency
        self.websocket_service = WebSocketService(sequencer_service=self.sequencer_service)
        await self.websocket_service.start()
        logger.info("🔌 WebSocket service initialized")

        logger.info("✅ All services initialized")

    async def shutdown(self):
        """Cleanup all services"""
        logger.info("Shutting down services...")

        if self.websocket_service:
            await self.websocket_service.stop()

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




