"""
Sonic Claude - AI DJ Backend
Main application entry point
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from backend.core import settings, setup_logging, get_logger
from backend.core.dependencies import (
    ServiceContainer, set_container, get_container
)
from backend.routes import (
    engine_router,
    synthesis_router,
    effects_router,
    mixer_router,
    sequencer_router,
    websocket_router,
    samples_router
)
from backend.routes.audio_input import router as audio_input_router

# Setup logging
setup_logging("INFO")
logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("🎵 Starting Sonic Claude API Server...")

    # Initialize service container
    container = ServiceContainer()
    set_container(container)

    try:
        # Initialize all services
        await container.initialize()
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise

    yield

    # Cleanup
    logger.info("Shutting down...")
    await container.shutdown()


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(engine_router)
app.include_router(synthesis_router)
app.include_router(effects_router)
app.include_router(mixer_router)
app.include_router(sequencer_router)
app.include_router(websocket_router)
app.include_router(samples_router)
app.include_router(audio_input_router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running"
    }


@app.get("/health")
async def health_check(container: ServiceContainer = Depends(get_container)):
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "audio_engine": container.audio_engine is not None and container.audio_engine.is_running,
            "synthesis_service": container.synthesis_service is not None,
            "effects_service": container.effects_service is not None,
            "mixer_service": container.mixer_service is not None,
            "sequencer_service": container.sequencer_service is not None,
            "websocket_service": container.websocket_service is not None,
        }
    }


if __name__ == "__main__":
    import uvicorn
    print(f"🎵 Starting {settings.app_name} v{settings.app_version}")
    print("🌐 API: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)

