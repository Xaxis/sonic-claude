"""
Sonic Claude Backend - FastAPI Application

COMPLETE PIPELINE:
SuperCollider → Python OSC → Audio Analyzer → WebSocket → Frontend
Frontend → REST API → Synthesis Service → SuperCollider OSC
"""
import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.core.config import get_settings, Settings
from backend.core.dependencies import (
    initialize_services,
    shutdown_services,
    get_engine_manager,
    get_audio_analyzer,
    get_audio_input_service,
    get_synthesis_service,
)
from backend.core.exceptions import (
    SonicClaudeException,
    ResourceNotFoundError,
    ValidationError,
    ServiceError,
)
from backend.api import websocket_routes, sample_routes, composition_routes
from backend.api.audio import router as audio_router
from backend.api.sequencer import router as sequencer_router
from backend.api.mixer import router as mixer_router
from backend.api.effects import router as effects_router
from backend.api.ai_routes import router as ai_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - sets up the complete pipeline"""
    # Load settings
    settings = get_settings()

    # Configure logging from settings
    logging.basicConfig(
        level=getattr(logging, settings.server.log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        force=True
    )

    logger.info("🚀 Starting Sonic Claude Backend...")
    logger.info("=" * 60)

    try:
        # Initialize all services using dependency injection
        await initialize_services(settings)

        # Get service instances for startup tasks
        engine_manager = get_engine_manager()
        audio_analyzer = get_audio_analyzer()
        audio_input_service = get_audio_input_service()

        # Wait for SynthDefs to load (they're loaded in osc_relay.scd)
        logger.info("⏳ Waiting for SynthDefs to load in OSC relay...")
        await asyncio.sleep(5)  # Give sclang time to boot and load SynthDefs

        # Buffer IDs are allocated by sclang in osc_relay.scd
        # They will be 0 and 1 (first two buffers allocated)
        waveform_buffer_id = 0
        spectrum_buffer_id = 1
        logger.info(f"   Using buffer IDs: waveform={waveform_buffer_id}, spectrum={spectrum_buffer_id}")

        # Create default node groups
        logger.info("🗂️  Creating node groups...")
        engine_manager.send_message("/g_new", 1, 1, 0)  # synths, addToTail, root
        engine_manager.send_message("/g_new", 2, 1, 1)  # effects, addToTail, synths
        engine_manager.send_message("/g_new", 3, 1, 2)  # master, addToTail, effects
        logger.info("✅ Created groups: 1=synths, 2=effects, 3=master")

        # Start audio monitoring (output)
        logger.info("🎤 Starting output audio monitoring...")
        await audio_analyzer.start_monitoring(
            waveform_buffer_id=waveform_buffer_id,
            spectrum_buffer_id=spectrum_buffer_id
        )

        # Start audio input monitoring
        logger.info("🎤 Starting input audio monitoring...")
        await audio_input_service.start_monitoring(
            waveform_buffer_id=waveform_buffer_id,  # Reuse same buffers
            spectrum_buffer_id=spectrum_buffer_id,
            input_channel=0  # First input channel
        )

        logger.info("=" * 60)
        logger.info("✅ Sonic Claude Backend READY")
        logger.info("   Pipeline: SC → OSC → Analyzer → WebSocket → Frontend")
        logger.info("   Control: Frontend → REST → Synthesis → OSC → SC")
        logger.info("   Input: Mic/Line-in → SC → OSC → Input Service → WebSocket → Frontend")
        logger.info("=" * 60)

        yield

    except Exception as e:
        logger.error(f"❌ Failed to start backend: {e}")
        raise

    finally:
        # Cleanup using centralized shutdown
        await shutdown_services()
        logger.info("✅ Sonic Claude Backend shut down")


# Create FastAPI app
def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        description="AI-powered live production performance system",
        version=settings.app_version,
        lifespan=lifespan
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors.origins,
        allow_credentials=settings.cors.credentials,
        allow_methods=settings.cors.methods,
        allow_headers=settings.cors.headers,
    )

    return app


app = create_app()


# ============================================================================
# EXCEPTION HANDLERS
# ============================================================================

@app.exception_handler(ResourceNotFoundError)
async def resource_not_found_handler(request: Request, exc: ResourceNotFoundError):
    """Handle resource not found errors (404)"""
    logger.warning(f"Resource not found: {exc.message}")
    return JSONResponse(
        status_code=404,
        content={
            "detail": exc.message,
            "error_type": exc.__class__.__name__,
        }
    )


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    """Handle validation errors (400)"""
    logger.warning(f"Validation error: {exc.message}")
    return JSONResponse(
        status_code=400,
        content={
            "detail": exc.message,
            "error_type": exc.__class__.__name__,
        }
    )


@app.exception_handler(ServiceError)
async def service_error_handler(request: Request, exc: ServiceError):
    """Handle service errors (500)"""
    logger.error(f"Service error: {exc.message}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": exc.message,
            "error_type": exc.__class__.__name__,
        }
    )


@app.exception_handler(SonicClaudeException)
async def sonic_claude_exception_handler(request: Request, exc: SonicClaudeException):
    """Handle all other Sonic Claude exceptions (500)"""
    logger.error(f"Unhandled Sonic Claude exception: {exc.message}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": exc.message,
            "error_type": exc.__class__.__name__,
        }
    )


# ============================================================================
# ROUTERS
# ============================================================================

# Include routers
app.include_router(audio_router, prefix="/audio-engine/audio")
app.include_router(sequencer_router, prefix="/audio-engine/audio/sequencer")
app.include_router(mixer_router, prefix="/audio-engine/audio/mixer")
app.include_router(effects_router, prefix="/audio-engine/audio")
app.include_router(websocket_routes.router, prefix="/audio-engine/ws", tags=["websocket"])
app.include_router(sample_routes.router, prefix="/api/samples", tags=["samples"])
app.include_router(composition_routes.router, prefix="/api")
app.include_router(ai_router, prefix="/api")


@app.get("/")
async def root(settings: Settings = Depends(get_settings)):
    """Root endpoint"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
    }


@app.get("/health")
async def health(
    engine_manager=Depends(get_engine_manager),
    audio_analyzer=Depends(get_audio_analyzer),
    synthesis_service=Depends(get_synthesis_service),
):
    """Health check endpoint"""
    return {
        "status": "healthy",
        "engine_connected": engine_manager.is_connected,
        "monitoring": audio_analyzer.is_monitoring,
        "active_synths": len(synthesis_service.active_synths),
    }

