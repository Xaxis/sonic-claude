#!/usr/bin/env python3
"""
Sonic Claude - AI DJ Backend API Server
FastAPI server that bridges web interface to Sonic Pi via OSC
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, validator
from typing import List, Dict, Optional, Union
import asyncio
import json
import logging
import sys
from pythonosc import udp_client
from datetime import datetime
from enum import Enum

# Import AI Agent and Audio Analyzer
from backend.ai_agent import IntelligentAgent, AudioAnalysis
from backend.audio_analyzer import AudioAnalyzer

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("sonic-claude")

# Custom Exceptions
class OSCError(Exception):
    """Raised when OSC communication fails"""
    pass

class ValidationError(Exception):
    """Raised when parameter validation fails"""
    pass

class SonicPiConnectionError(Exception):
    """Raised when connection to Sonic Pi fails"""
    pass

app = FastAPI(title="Sonic Claude API", version="1.0.0")

# Mount static files (frontend)
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# CORS middleware for web frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handlers
@app.exception_handler(OSCError)
async def osc_error_handler(request: Request, exc: OSCError):
    logger.error(f"OSC Error: {str(exc)}")
    return JSONResponse(
        status_code=503,
        content={
            "error": "OSC Communication Error",
            "message": str(exc),
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    logger.warning(f"Validation Error: {str(exc)}")
    return JSONResponse(
        status_code=400,
        content={
            "error": "Validation Error",
            "message": str(exc),
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(SonicPiConnectionError)
async def sonic_pi_connection_error_handler(request: Request, exc: SonicPiConnectionError):
    logger.error(f"Sonic Pi Connection Error: {str(exc)}")
    return JSONResponse(
        status_code=503,
        content={
            "error": "Sonic Pi Connection Error",
            "message": str(exc),
            "timestamp": datetime.now().isoformat()
        }
    )

# Request/Response logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.now()
    logger.info(f"Request: {request.method} {request.url.path}")

    response = await call_next(request)

    duration = (datetime.now() - start_time).total_seconds()
    logger.info(f"Response: {request.method} {request.url.path} - Status: {response.status_code} - Duration: {duration:.3f}s")

    return response


# OSC client for Sonic Pi communication
SONIC_PI_IP = "127.0.0.1"
SONIC_PI_PORT = 4560

def create_osc_client():
    """Create OSC client with error handling"""
    try:
        client = udp_client.SimpleUDPClient(SONIC_PI_IP, SONIC_PI_PORT)
        logger.info(f"OSC client initialized: {SONIC_PI_IP}:{SONIC_PI_PORT}")
        return client
    except Exception as e:
        logger.error(f"Failed to create OSC client: {str(e)}")
        raise SonicPiConnectionError(f"Failed to connect to Sonic Pi at {SONIC_PI_IP}:{SONIC_PI_PORT}")

osc_client = create_osc_client()

# Initialize AI Agent and Audio Analyzer
class OSCController:
    """Wrapper for OSC client to work with AI Agent"""
    def __init__(self, client):
        self.client = client

    async def send(self, parameter: str, value):
        """Send OSC message"""
        try:
            self.client.send_message(f"/{parameter}", [value])
            logger.info(f"OSC sent: /{parameter} = {value}")
        except Exception as e:
            logger.error(f"OSC send failed: {e}")
            raise

osc_controller = OSCController(osc_client)
ai_agent = IntelligentAgent(osc_controller)
audio_analyzer = AudioAnalyzer()

# Feedback loop task
async def ai_feedback_loop():
    """Main AI feedback loop - listens, analyzes, decides, acts"""
    logger.info("AI Feedback Loop started")

    while True:
        try:
            # 1. Analyze current audio
            analysis = audio_analyzer.analyze_current_audio()

            if analysis:
                # 2. AI makes decisions based on analysis
                decisions = await ai_agent.analyze_and_decide(analysis)

                # 3. Execute decisions (with rate limiting)
                for decision in decisions[:2]:  # Max 2 decisions per cycle
                    if decision.confidence > 0.6:  # Only execute high-confidence decisions
                        await ai_agent._execute_decision(decision)

            # Run every 2 seconds
            await asyncio.sleep(2.0)

        except Exception as e:
            logger.error(f"AI feedback loop error: {e}")
            await asyncio.sleep(5.0)

# Start AI feedback loop on startup
@app.on_event("startup")
async def startup_event():
    """Start background tasks"""
    logger.info("Starting AI Agent system...")
    await audio_analyzer.start()
    asyncio.create_task(ai_feedback_loop())
    logger.info("AI Agent system running")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await audio_analyzer.stop()
    logger.info("AI Agent system stopped")

# Metrics storage
metrics = {
    "osc_messages_sent": 0,
    "osc_errors": 0,
    "websocket_connections": 0,
    "websocket_messages": 0,
    "start_time": datetime.now().isoformat()
}

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        try:
            await websocket.accept()
            self.active_connections.append(websocket)
            metrics["websocket_connections"] += 1
            logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
        except Exception as e:
            logger.error(f"Failed to accept WebSocket connection: {str(e)}")
            raise

    def disconnect(self, websocket: WebSocket):
        try:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
                logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
        except Exception as e:
            logger.error(f"Error during WebSocket disconnect: {str(e)}")

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
                metrics["websocket_messages"] += 1
            except Exception as e:
                logger.error(f"Failed to send message to WebSocket: {str(e)}")
                disconnected.append(connection)

        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)

manager = ConnectionManager()

# Data models
class ParameterUpdate(BaseModel):
    parameter: str
    value: Union[float, str]  # Accept both numeric and string values

class CompositionRequest(BaseModel):
    prompt: str
    style: Optional[str] = "melodic_house"
    bpm: Optional[int] = 120
    key: Optional[str] = "A minor"

class SampleInfo(BaseModel):
    category: str
    name: str
    path: str

# Sonic Pi built-in samples catalog
SONIC_PI_SAMPLES = {
    "drums": [
        "bd_ada", "bd_boom", "bd_fat", "bd_gas", "bd_haus", "bd_klub", "bd_pure", "bd_sone", "bd_tek", "bd_zome",
        "sn_dub", "sn_dolf", "sn_zome",
        "drum_heavy_kick", "drum_tom_mid_soft", "drum_tom_mid_hard", "drum_tom_lo_soft", "drum_tom_lo_hard",
        "drum_tom_hi_soft", "drum_tom_hi_hard", "drum_splash_soft", "drum_splash_hard",
        "drum_snare_soft", "drum_snare_hard", "drum_cymbal_soft", "drum_cymbal_hard",
        "drum_cymbal_open", "drum_cymbal_closed", "drum_cymbal_pedal",
        "drum_bass_soft", "drum_bass_hard", "drum_cowbell", "drum_roll"
    ],
    "bass": [
        "bass_hit_c", "bass_hard_c", "bass_thick_c", "bass_drop_c", "bass_woodsy_c",
        "bass_voxy_c", "bass_voxy_hit_c", "bass_dnb_f"
    ],
    "electronic": [
        "elec_triangle", "elec_snare", "elec_lo_snare", "elec_hi_snare", "elec_mid_snare",
        "elec_cymbal", "elec_soft_kick", "elec_filt_snare", "elec_fuzz_tom",
        "elec_chime", "elec_bong", "elec_twang", "elec_wood", "elec_pop",
        "elec_beep", "elec_blip", "elec_blip2", "elec_ping", "elec_bell",
        "elec_flip", "elec_tick", "elec_hollow_kick", "elec_twip", "elec_plip",
        "elec_blup"
    ],
    "percussion": [
        "perc_bell", "perc_snap", "perc_snap2", "perc_swash", "perc_till", "perc_door", "perc_impact1", "perc_impact2",
        "perc_swoosh"
    ],
    "ambient": [
        "ambi_soft_buzz", "ambi_swoosh", "ambi_drone", "ambi_glass_hum", "ambi_glass_rub",
        "ambi_haunted_hum", "ambi_piano", "ambi_lunar_land", "ambi_dark_woosh", "ambi_choir"
    ],
    "guitar": [
        "guit_harmonics", "guit_e_fifths", "guit_e_slide", "guit_em9"
    ],
    "misc": [
        "misc_burp", "misc_crow", "misc_cineboom"
    ],
    "tabla": [
        "tabla_tas1", "tabla_tas2", "tabla_tas3", "tabla_ke1", "tabla_ke2", "tabla_ke3",
        "tabla_na", "tabla_na_o", "tabla_tun1", "tabla_tun2", "tabla_tun3",
        "tabla_te1", "tabla_te2", "tabla_te_ne", "tabla_te_m", "tabla_ghe1",
        "tabla_ghe2", "tabla_ghe3", "tabla_ghe4", "tabla_ghe5", "tabla_ghe6",
        "tabla_ghe7", "tabla_ghe8", "tabla_dhec", "tabla_na_s", "tabla_re"
    ],
    "vinyl": [
        "vinyl_backspin", "vinyl_rewind", "vinyl_scratch", "vinyl_hiss"
    ],
    "glitch": [
        "glitch_bass_g", "glitch_perc1", "glitch_perc2", "glitch_perc3", "glitch_perc4", "glitch_perc5",
        "glitch_robot1", "glitch_robot2"
    ],
    "loop": [
        "loop_industrial", "loop_compus", "loop_amen", "loop_amen_full", "loop_garzul", "loop_mika", "loop_breakbeat"
    ]
}

SONIC_PI_SYNTHS = [
    "beep", "blade", "bnoise", "chiplead", "chipbass", "cnoise", "dark_ambience", "dpulse", "dsaw", "dtri", "dull_bell",
    "fm", "gnoise", "growl", "hollow", "hoover", "kalimba", "mod_beep", "mod_dsaw", "mod_fm", "mod_pulse", "mod_saw",
    "mod_sine", "mod_tri", "noise", "piano", "pnoise", "pretty_bell", "prophet", "pulse", "saw", "sine", "square",
    "subpulse", "supersaw", "tb303", "tech_saws", "tri", "zawa"
]

# API Routes
@app.get("/api")
async def api_status():
    return {"message": "Sonic Claude API Server", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint with OSC connection validation"""
    osc_status = "connected"
    try:
        # Test OSC connection by attempting to create a client
        test_client = udp_client.SimpleUDPClient(SONIC_PI_IP, SONIC_PI_PORT)
    except Exception as e:
        osc_status = f"disconnected: {str(e)}"
        logger.warning(f"Health check failed: OSC connection issue - {str(e)}")

    health_data = {
        "status": "healthy" if osc_status == "connected" else "degraded",
        "timestamp": datetime.now().isoformat(),
        "osc_connection": osc_status,
        "osc_target": f"{SONIC_PI_IP}:{SONIC_PI_PORT}",
        "websocket_connections": len(manager.active_connections),
        "uptime_seconds": (datetime.now() - datetime.fromisoformat(metrics["start_time"])).total_seconds()
    }

    status_code = 200 if osc_status == "connected" else 503
    return JSONResponse(status_code=status_code, content=health_data)

@app.get("/metrics")
async def get_metrics():
    """Metrics endpoint for monitoring"""
    uptime = (datetime.now() - datetime.fromisoformat(metrics["start_time"])).total_seconds()

    return {
        "metrics": {
            "osc_messages_sent": metrics["osc_messages_sent"],
            "osc_errors": metrics["osc_errors"],
            "websocket_connections_total": metrics["websocket_connections"],
            "websocket_connections_active": len(manager.active_connections),
            "websocket_messages_sent": metrics["websocket_messages"],
            "uptime_seconds": uptime,
            "start_time": metrics["start_time"]
        },
        "timestamp": datetime.now().isoformat()
    }

@app.get("/")
async def serve_frontend():
    """Serve the main frontend HTML file"""
    return FileResponse("frontend/index.html")

@app.get("/samples")
async def get_samples():
    """Return catalog of all available Sonic Pi samples"""
    return {"samples": SONIC_PI_SAMPLES, "synths": SONIC_PI_SYNTHS}

class ChatMessage(BaseModel):
    message: str

@app.post("/chat")
async def chat(msg: ChatMessage):
    """AI Agent chat - interprets user intent and makes musical changes"""
    user_msg = msg.message

    # Send intent to AI agent
    await ai_agent.set_user_intent(user_msg)

    # Get AI's response
    response = f"🎵 Got it! I'm adjusting the music based on: '{user_msg}'. Listen to the changes!"

    return {"response": response}

@app.get("/ai/status")
async def get_ai_status():
    """Get current AI agent status"""
    return ai_agent.get_status()

@app.post("/ai/toggle")
async def toggle_ai():
    """Toggle AI agent on/off"""
    ai_agent.is_running = not ai_agent.is_running
    status = "enabled" if ai_agent.is_running else "disabled"
    logger.info(f"AI Agent {status}")
    return {"status": status, "is_running": ai_agent.is_running}

@app.post("/osc/send")
async def send_osc(param: ParameterUpdate):
    """Send OSC message to Sonic Pi with proper error handling"""
    try:
        # Validate parameter name
        if not param.parameter or not isinstance(param.parameter, str):
            raise ValidationError("Parameter name must be a non-empty string")

        # Validate value
        if param.value is None:
            raise ValidationError("Parameter value cannot be None")

        # Send OSC message
        osc_path = f"/{param.parameter}"
        logger.debug(f"Sending OSC: {osc_path} = {param.value}")

        try:
            osc_client.send_message(osc_path, param.value)
            metrics["osc_messages_sent"] += 1
        except Exception as e:
            metrics["osc_errors"] += 1
            logger.error(f"OSC send failed: {str(e)}")
            raise OSCError(f"Failed to send OSC message to Sonic Pi: {str(e)}")

        # Broadcast to WebSocket clients
        await manager.broadcast({
            "type": "osc_sent",
            "parameter": param.parameter,
            "value": param.value,
            "timestamp": datetime.now().isoformat()
        })

        return {
            "status": "sent",
            "parameter": param.parameter,
            "value": param.value,
            "timestamp": datetime.now().isoformat()
        }

    except (ValidationError, OSCError):
        raise
    except Exception as e:
        logger.error(f"Unexpected error in send_osc: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time communication with proper error handling"""
    await manager.connect(websocket)

    try:
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": "WebSocket connection established",
            "timestamp": datetime.now().isoformat()
        })

        while True:
            try:
                data = await websocket.receive_text()

                # Parse JSON message
                try:
                    message = json.loads(data)
                except json.JSONDecodeError as e:
                    logger.warning(f"Invalid JSON received: {str(e)}")
                    await websocket.send_json({
                        "type": "error",
                        "message": "Invalid JSON format",
                        "timestamp": datetime.now().isoformat()
                    })
                    continue

                logger.debug(f"WebSocket message received: {message}")

                # Echo back and broadcast to all clients
                await manager.broadcast({
                    "type": "message",
                    "data": message,
                    "timestamp": datetime.now().isoformat()
                })

            except WebSocketDisconnect:
                logger.info("WebSocket client disconnected")
                break
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {str(e)}")
                try:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Error processing message: {str(e)}",
                        "timestamp": datetime.now().isoformat()
                    })
                except:
                    break

    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    print("🎵 Starting Sonic Claude API Server...")
    print(f"📡 OSC Target: {SONIC_PI_IP}:{SONIC_PI_PORT}")
    print("🌐 API: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)

