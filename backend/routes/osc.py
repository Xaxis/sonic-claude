"""
OSC control API routes
"""
from fastapi import APIRouter, HTTPException
from backend.models import OSCMessage, TransportCommand
from backend.core import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/osc", tags=["OSC Control"])

# Services will be injected
_osc_service = None
_ai_agent = None


def set_osc_service(osc_service):
    """Set OSC service instance"""
    global _osc_service
    _osc_service = osc_service


def set_ai_agent(ai_agent):
    """Set AI agent instance"""
    global _ai_agent
    _ai_agent = ai_agent


@router.post("/send")
async def send_osc_message(message: OSCMessage):
    """Send an OSC message to Sonic Pi"""
    try:
        if not _osc_service:
            raise HTTPException(status_code=503, detail="OSC service not initialized")
        
        _osc_service.send_parameter(message.parameter, message.value)
        return {"status": "sent", "parameter": message.parameter, "value": message.value}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error sending OSC: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transport")
async def send_transport_command(command: TransportCommand):
    """Send transport command (play/stop)"""
    try:
        if not _osc_service:
            raise HTTPException(status_code=503, detail="OSC service not initialized")

        _osc_service.send_transport(command.action)

        # Update AI agent's playing state
        if _ai_agent:
            _ai_agent.is_playing = (command.action.lower() == "play")
            logger.info(f"Updated AI agent is_playing to {_ai_agent.is_playing}")

        return {"status": "sent", "action": command.action}
    except Exception as e:
        logger.error(f"Error sending transport command: {e}")
        raise HTTPException(status_code=500, detail=str(e))

