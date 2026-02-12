"""
Sonic Claude Backend - FastAPI Application

COMPLETE PIPELINE:
SuperCollider → Python OSC → Audio Analyzer → WebSocket → Frontend
Frontend → REST API → Synthesis Service → SuperCollider OSC
"""
import logging
import asyncio
import subprocess
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.engine_manager import AudioEngineManager
from backend.services.audio_analyzer import AudioAnalyzerService
from backend.services.audio_input_service import AudioInputService
from backend.services.synthesis_service import SynthesisService
from backend.services.sequencer_service import SequencerService
from backend.services.websocket_manager import WebSocketManager
from backend.api import audio_routes, websocket_routes, sequencer_routes, sample_routes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global service instances
engine_manager: AudioEngineManager = None
audio_analyzer: AudioAnalyzerService = None
audio_input_service: AudioInputService = None
synthesis_service: SynthesisService = None
sequencer_service: SequencerService = None
ws_manager: WebSocketManager = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - sets up the complete pipeline"""
    global engine_manager, audio_analyzer, audio_input_service, synthesis_service, sequencer_service, ws_manager
    
    logger.info("🚀 Starting Sonic Claude Backend...")
    logger.info("=" * 60)
    
    try:
        # Step 1: Initialize WebSocket manager
        logger.info("📡 Initializing WebSocket manager...")
        ws_manager = WebSocketManager()
        websocket_routes.set_ws_manager(ws_manager)
        
        # Step 2: Initialize engine manager (OSC communication)
        logger.info("🔗 Connecting to SuperCollider...")
        engine_manager = AudioEngineManager()
        await engine_manager.connect()
        
        # Step 3: Initialize services
        logger.info("🎵 Initializing audio services...")
        audio_analyzer = AudioAnalyzerService(engine_manager)
        audio_input_service = AudioInputService(engine_manager)
        synthesis_service = SynthesisService(engine_manager)
        sequencer_service = SequencerService(engine_manager, ws_manager)

        # Step 4: Wire up the pipeline (Audio Analyzer → WebSocket Manager)
        logger.info("🔌 Wiring up audio pipeline...")
        audio_analyzer.on_waveform_update = ws_manager.broadcast_waveform
        audio_analyzer.on_spectrum_update = ws_manager.broadcast_spectrum
        audio_analyzer.on_meter_update = ws_manager.broadcast_meters

        # Wire up input audio pipeline
        audio_input_service.on_waveform_update = ws_manager.broadcast_waveform
        audio_input_service.on_spectrum_update = ws_manager.broadcast_spectrum
        audio_input_service.on_meter_update = ws_manager.broadcast_meters
        
        # Step 5: Inject services into API routes
        audio_routes.set_services(synthesis_service, audio_analyzer)
        sequencer_routes.set_sequencer_service(sequencer_service)
        
        # Step 6: Wait for SynthDefs to load (they're loaded in osc_relay.scd)
        logger.info("⏳ Waiting for SynthDefs to load in OSC relay...")
        await asyncio.sleep(5)  # Give sclang time to boot and load SynthDefs

        # Buffer IDs are allocated by sclang in osc_relay.scd
        # They will be 0 and 1 (first two buffers allocated)
        waveform_buffer_id = 0
        spectrum_buffer_id = 1
        logger.info(f"   Using buffer IDs: waveform={waveform_buffer_id}, spectrum={spectrum_buffer_id}")
        
        # Step 7: Create default node groups
        logger.info("🗂️  Creating node groups...")
        engine_manager.send_message("/g_new", 1, 1, 0)  # synths, addToTail, root
        engine_manager.send_message("/g_new", 2, 1, 1)  # effects, addToTail, synths
        engine_manager.send_message("/g_new", 3, 1, 2)  # master, addToTail, effects
        logger.info("✅ Created groups: 1=synths, 2=effects, 3=master")
        
        # Step 8: Start audio monitoring (output)
        logger.info("🎤 Starting output audio monitoring...")
        await audio_analyzer.start_monitoring(
            waveform_buffer_id=waveform_buffer_id,
            spectrum_buffer_id=spectrum_buffer_id
        )

        # Step 9: Start audio input monitoring
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
        # Cleanup
        logger.info("🛑 Shutting down Sonic Claude Backend...")

        if audio_analyzer:
            await audio_analyzer.stop_monitoring()

        if audio_input_service:
            await audio_input_service.stop_monitoring()

        if synthesis_service:
            await synthesis_service.free_all_synths()

        if engine_manager:
            await engine_manager.disconnect()

        logger.info("✅ Sonic Claude Backend shut down")


# Create FastAPI app
app = FastAPI(
    title="Sonic Claude Backend",
    description="AI-powered live production performance system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(audio_routes.router, prefix="/audio-engine/audio", tags=["audio"])
app.include_router(sequencer_routes.router, prefix="/audio-engine/audio/sequencer", tags=["sequencer"])
app.include_router(websocket_routes.router, prefix="/audio-engine/ws", tags=["websocket"])
app.include_router(sample_routes.router, prefix="/api/samples", tags=["samples"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Sonic Claude Backend",
        "version": "1.0.0",
        "status": "running",
        "engine_connected": engine_manager.is_connected if engine_manager else False
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "engine_connected": engine_manager.is_connected if engine_manager else False,
        "monitoring": audio_analyzer.is_monitoring if audio_analyzer else False,
        "active_synths": len(synthesis_service.active_synths) if synthesis_service else 0
    }

