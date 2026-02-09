"""
OSC communication service for Sonic Pi
"""
from pythonosc import udp_client
from typing import Union
from backend.core import get_logger, settings

logger = get_logger(__name__)


class OSCService:
    """Service for sending OSC messages to Sonic Pi"""
    
    def __init__(self):
        """Initialize OSC client"""
        self.client = udp_client.SimpleUDPClient(
            settings.sonic_pi_host,
            settings.sonic_pi_port
        )
        logger.info(f"OSC client initialized: {settings.sonic_pi_host}:{settings.sonic_pi_port}")
    
    def send_parameter(self, parameter: str, value: Union[int, float, str]) -> None:
        """
        Send a parameter change to Sonic Pi
        
        Args:
            parameter: Parameter name (e.g., 'bpm', 'intensity')
            value: Parameter value
        """
        try:
            address = f"/{parameter}"
            self.client.send_message(address, value)
            logger.info(f"OSC sent: {address} = {value}")
        except Exception as e:
            logger.error(f"Failed to send OSC message {parameter}={value}: {e}")
            raise
    
    def send_transport(self, action: str) -> None:
        """
        Send transport command (play/stop)
        
        Args:
            action: 'play' or 'stop'
        """
        self.send_parameter("transport", action)
    
    def send_bpm(self, bpm: int) -> None:
        """Set BPM"""
        self.send_parameter("bpm", bpm)
    
    def send_intensity(self, intensity: float) -> None:
        """Set intensity (0-10)"""
        self.send_parameter("intensity", intensity)
    
    def send_cutoff(self, cutoff: float) -> None:
        """Set filter cutoff (50-130)"""
        self.send_parameter("cutoff", cutoff)
    
    def send_reverb(self, reverb: float) -> None:
        """Set reverb amount (0-1)"""
        self.send_parameter("reverb", reverb)
    
    def send_echo(self, echo: float) -> None:
        """Set echo amount (0-1)"""
        self.send_parameter("echo", echo)
    
    def send_key(self, key: str) -> None:
        """Set musical key"""
        self.send_parameter("key", key.lower())
    
    def send_scale(self, scale: str) -> None:
        """Set musical scale"""
        self.send_parameter("scale", scale.lower())

    async def send_code(self, code: str) -> None:
        """
        Send Sonic Pi code to be executed

        Args:
            code: Sonic Pi code to execute
        """
        try:
            # Sonic Pi OSC API expects:
            # /run-code [gui_id, code]
            # gui_id is typically "sonic-pi-tool" or similar identifier
            gui_id = "sonic-claude"
            self.client.send_message("/run-code", [gui_id, code])
            logger.info(f"✅ Sent code to Sonic Pi ({len(code)} chars)")
            logger.debug(f"Code preview: {code[:200]}...")
        except Exception as e:
            logger.error(f"❌ Failed to send code to Sonic Pi: {e}")
            raise

