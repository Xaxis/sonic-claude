"""
Sonic Claude - AI DJ Backend
Main application entry point
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core import settings, setup_logging, get_logger
from backend.routes import ai_router
from backend.routes.ai import set_ai_services
from backend.routes.websocket import router as websocket_router, set_websocket_services
from backend.routes.samples import router as samples_router, set_sample_services
from backend.routes.transcription import router as transcription_router, set_transcription_services
from backend.routes.timeline import router as timeline_router, set_timeline_services
from backend.services import (
    AudioAnalyzer, UnifiedIntelligentAgent,
    SampleRecorder, SpectralAnalyzer, SynthesisAgent, LiveTranscriptionEngine
)
from backend.audio_engine import AudioEngineManager
from backend.audio_engine.routes import engine_router
from backend.audio_engine.routes.engine import set_engine

# Setup logging
setup_logging("INFO")
logger = get_logger(__name__)

# Global service instances
audio_engine = None
audio_analyzer = None
unified_agent = None
sample_recorder = None
spectral_analyzer = None
synthesis_agent = None
transcription_engine = None
ai_loop_task = None


async def ai_feedback_loop():
    """Background task for updating audio analysis only - NO LLM calls"""
    global unified_agent, audio_analyzer

    logger.info("Audio Analysis Loop started (LLM only runs on user chat messages)")

    while True:
        try:
            if unified_agent and audio_analyzer:
                # Just update the latest audio analysis for status reporting
                # NO LLM CALLS - those only happen when user sends chat messages
                analysis = audio_analyzer.analyze_current_audio()
                if analysis:
                    unified_agent.latest_audio = analysis
                    unified_agent.current_state.energy_level = analysis.energy

            await asyncio.sleep(0.5)  # Update audio analysis every 500ms
        except Exception as e:
            logger.error(f"Error in audio analysis loop: {e}")
            await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global audio_engine, audio_analyzer, unified_agent, ai_loop_task
    global sample_recorder, spectral_analyzer, synthesis_agent, transcription_engine

    logger.info("🎵 Starting Sonic Claude API Server...")

    # Initialize services
    try:
        # Initialize audio engine
        audio_engine = AudioEngineManager(
            host="127.0.0.1",
            port=57110,
            sample_rate=48000,
            block_size=64
        )
        logger.info("🎛️  Audio engine initialized")

        # Start audio engine
        engine_started = await audio_engine.start()
        if engine_started:
            logger.info("✅ Audio engine started successfully")
        else:
            logger.warning("⚠️  Audio engine failed to start (SuperCollider may not be running)")

        # Initialize AI services with audio engine
        audio_analyzer = AudioAnalyzer()
        unified_agent = UnifiedIntelligentAgent(audio_engine, audio_analyzer)

        # Initialize sample services
        sample_recorder = SampleRecorder(samples_dir="samples", sample_rate=48000)
        spectral_analyzer = SpectralAnalyzer()
        synthesis_agent = SynthesisAgent()

        # Initialize transcription engine
        transcription_engine = LiveTranscriptionEngine(audio_engine)

        # Inject services into routes
        set_ai_services(unified_agent)
        set_websocket_services(audio_analyzer, unified_agent)
        set_sample_services(sample_recorder, spectral_analyzer, synthesis_agent)
        set_transcription_services(transcription_engine, sample_recorder)
        set_timeline_services()
        set_engine(audio_engine)

        logger.info("✅ All services initialized")

        # Start audio analyzer
        await audio_analyzer.start()
        logger.info("🎤 Audio analyzer started")

        # Start AI feedback loop
        ai_loop_task = asyncio.create_task(ai_feedback_loop())
        logger.info("🤖 AI feedback loop started")

    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise

    yield

    # Cleanup
    logger.info("Shutting down...")
    if ai_loop_task:
        ai_loop_task.cancel()
    if audio_engine:
        await audio_engine.stop()
    if audio_analyzer:
        await audio_analyzer.stop()


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
app.include_router(ai_router)
app.include_router(websocket_router)
app.include_router(samples_router)
app.include_router(transcription_router)
app.include_router(timeline_router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "audio_engine": audio_engine is not None and audio_engine.is_running,
            "audio_analyzer": audio_analyzer is not None,
            "ai_agent": ai_agent is not None,
            "llm": llm_agent is not None,
        }
    }


if __name__ == "__main__":
    import uvicorn
    print(f"🎵 Starting {settings.app_name} v{settings.app_version}")
    print("🌐 API: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)

