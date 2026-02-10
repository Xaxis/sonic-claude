"""
Audio Input Service
Manages audio input from devices into SuperCollider
"""
import logging
from typing import Optional
from pythonosc import udp_client

logger = logging.getLogger(__name__)


class AudioInputService:
    """Manages audio input synth in SuperCollider"""
    
    def __init__(self, sc_host: str = "127.0.0.1", sc_port: int = 57110):
        self.sc_host = sc_host
        self.sc_port = sc_port
        self.osc_client: Optional[udp_client.SimpleUDPClient] = None
        self._input_synth_id: int = 2000  # Fixed ID for input synth
        self._current_device_index: Optional[int] = None
        self.is_running = False
    
    async def start(self):
        """Initialize the service"""
        try:
            self.osc_client = udp_client.SimpleUDPClient(self.sc_host, self.sc_port)
            self.is_running = True
            logger.info("🎤 Audio input service initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize audio input service: {e}")
            raise
    
    async def stop(self):
        """Stop the service and free any active input synth"""
        if self._current_device_index is not None:
            await self.stop_input()
        self.is_running = False
        logger.info("Audio input service stopped")
    
    async def set_input_device(self, device_index: int, amp: float = 1.0):
        """
        Set the audio input device and create/update the input synth
        
        Args:
            device_index: SuperCollider input device index (0-based)
            amp: Input gain (0.0 to 2.0)
        """
        try:
            if not self.osc_client:
                logger.error("OSC client not initialized")
                return False
            
            # Free existing input synth if any
            if self._current_device_index is not None:
                await self._free_input_synth()
            
            # Create new input synth
            # SuperCollider's SoundIn.ar uses hardware input channels
            # inputBus parameter maps to hardware input channel
            self.osc_client.send_message(
                "/s_new",
                [
                    "audioInput",           # SynthDef name
                    self._input_synth_id,   # Node ID (2000)
                    0,                      # addToHead (process before other synths)
                    0,                      # Target group (0 = root group, always exists)
                    "inputBus", device_index * 2,  # Hardware input channel (stereo pairs)
                    "outputBus", 0,         # Output to master bus
                    "amp", amp,             # Input gain
                    "gate", 1               # Open the gate
                ]
            )
            
            self._current_device_index = device_index
            logger.info(f"✅ Created audioInput synth (device index: {device_index}, amp: {amp})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to set input device: {e}")
            return False
    
    async def stop_input(self):
        """Stop audio input by freeing the input synth"""
        try:
            if self._current_device_index is not None:
                await self._free_input_synth()
                self._current_device_index = None
                logger.info("✅ Stopped audio input")
                return True
            return False
        except Exception as e:
            logger.error(f"❌ Failed to stop input: {e}")
            return False
    
    async def set_input_gain(self, amp: float):
        """
        Set input gain without recreating the synth
        
        Args:
            amp: Input gain (0.0 to 2.0)
        """
        try:
            if not self.osc_client or self._current_device_index is None:
                logger.warning("No active input synth to adjust gain")
                return False
            
            self.osc_client.send_message(
                "/n_set",
                [self._input_synth_id, "amp", amp]
            )
            
            logger.debug(f"Set input gain to {amp}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to set input gain: {e}")
            return False
    
    async def _free_input_synth(self):
        """Free the input synth"""
        try:
            if self.osc_client:
                self.osc_client.send_message("/n_free", [self._input_synth_id])
                logger.debug(f"Freed audioInput synth (ID: {self._input_synth_id})")
        except Exception as e:
            logger.error(f"❌ Failed to free input synth: {e}")
    
    def get_current_device(self) -> Optional[int]:
        """Get the currently active input device index"""
        return self._current_device_index

