"""
Sonic Claude - AI DJ Backend
Main application entry point
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core import settings, setup_logging, get_logger
from backend.routes import ai_router, osc_router
from backend.routes.ai import set_ai_services
from backend.routes.osc import set_osc_service, set_ai_agent
from backend.routes.websocket import router as websocket_router, set_websocket_services
from backend.routes.samples import router as samples_router, set_sample_services
from backend.services import (
    AudioAnalyzer, IntelligentAgent, LLMMusicalAgent, OSCService,
    SampleRecorder, SpectralAnalyzer, SynthesisAgent
)

# Setup logging
setup_logging("INFO")
logger = get_logger(__name__)

# Global service instances
audio_analyzer = None
ai_agent = None
llm_agent = None
osc_service = None
sample_recorder = None
spectral_analyzer = None
synthesis_agent = None
ai_loop_task = None


async def ai_feedback_loop():
    """Background task for updating audio analysis only - NO LLM calls"""
    global ai_agent, audio_analyzer

    logger.info("Audio Analysis Loop started (LLM only runs on user chat messages)")

    while True:
        try:
            if ai_agent and audio_analyzer:
                # Just update the latest audio analysis for status reporting
                # NO LLM CALLS - those only happen when user sends chat messages
                analysis = audio_analyzer.analyze_current_audio()
                if analysis:
                    ai_agent.latest_audio = analysis
                    ai_agent.current_state.energy_level = analysis.energy

            await asyncio.sleep(0.5)  # Update audio analysis every 500ms
        except Exception as e:
            logger.error(f"Error in audio analysis loop: {e}")
            await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global audio_analyzer, ai_agent, llm_agent, osc_service, ai_loop_task
    global sample_recorder, spectral_analyzer, synthesis_agent

    logger.info("🎵 Starting Sonic Claude API Server...")

    # Initialize services
    try:
        osc_service = OSCService()
        audio_analyzer = AudioAnalyzer()
        llm_agent = LLMMusicalAgent(osc_service.client)
        ai_agent = IntelligentAgent(osc_service.client, audio_analyzer, llm_agent)

        # Initialize sample services
        sample_recorder = SampleRecorder(samples_dir="samples", sample_rate=48000)
        spectral_analyzer = SpectralAnalyzer()
        synthesis_agent = SynthesisAgent()

        # Inject services into routes
        set_ai_services(ai_agent, llm_agent)
        set_osc_service(osc_service)
        set_ai_agent(ai_agent)
        set_websocket_services(audio_analyzer, ai_agent)
        set_sample_services(sample_recorder, spectral_analyzer, synthesis_agent)

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
app.include_router(ai_router)
app.include_router(osc_router)
app.include_router(websocket_router)
app.include_router(samples_router)


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
            "osc": osc_service is not None,
            "audio": audio_analyzer is not None,
            "ai_agent": ai_agent is not None,
            "llm": llm_agent is not None,
        }
    }


if __name__ == "__main__":
    import uvicorn
    print(f"🎵 Starting {settings.app_name} v{settings.app_version}")
    print(f"📡 OSC Target: {settings.sonic_pi_host}:{settings.sonic_pi_port}")
    print("🌐 API: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)

