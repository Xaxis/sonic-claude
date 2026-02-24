"""
Audio Engine Manager - Core OSC communication with SuperCollider

ARCHITECTURE:
- Pure OSC communication using python-osc library
- No python-supercollider dependency (it's broken)
- Clean separation of concerns
- Proper error handling and logging
"""
import logging
import asyncio
from typing import Optional
from pythonosc import udp_client, dispatcher, osc_server
from pythonosc.osc_message_builder import OscMessageBuilder

logger = logging.getLogger(__name__)


class AudioEngineManager:
    """
    Manages OSC communication with SuperCollider scsynth
    
    Ports:
    - 57110: scsynth command port (Python → scsynth)
    - 57120: sclang listening port (scsynth → sclang)
    - 57121: Python listening port (sclang → Python)
    """
    
    def __init__(self):
        self.scsynth_client: Optional[udp_client.SimpleUDPClient] = None
        self.osc_server: Optional[osc_server.AsyncIOOSCUDPServer] = None
        self.is_connected = False
        self.next_node_id = 3000  # Start user synths at 3000 (1000-2999 reserved for system)
        
        # Callbacks for audio data (output monitoring)
        self.on_waveform_data = None
        self.on_spectrum_data = None
        self.on_meter_data = None

        # Callbacks for input audio data
        self.on_input_waveform_data = None
        self.on_input_spectrum_data = None
        self.on_input_meter_data = None

        # Callback for per-track meter data
        self.on_track_meter_data = None
    
    async def connect(self):
        """Connect to SuperCollider scsynth"""
        try:
            logger.info("🔗 Connecting to SuperCollider...")
            
            # Create OSC client to send commands to scsynth (port 57110)
            self.scsynth_client = udp_client.SimpleUDPClient("127.0.0.1", 57110)
            
            # Create OSC server to receive data from sclang (port 57121)
            disp = dispatcher.Dispatcher()
            # Output monitoring
            disp.map("/waveform", self._handle_waveform)
            disp.map("/spectrum", self._handle_spectrum)
            disp.map("/meter", self._handle_meter)
            # Input monitoring
            disp.map("/input_waveform", self._handle_input_waveform)
            disp.map("/input_spectrum", self._handle_input_spectrum)
            disp.map("/input_meter", self._handle_input_meter)
            # Per-track metering
            disp.map("/track_meter", self._handle_track_meter)
            
            self.osc_server = osc_server.AsyncIOOSCUDPServer(
                ("127.0.0.1", 57121),
                disp,
                asyncio.get_event_loop()
            )
            
            # Start the OSC server
            transport, protocol = await self.osc_server.create_serve_endpoint()
            
            self.is_connected = True
            logger.info("✅ Connected to SuperCollider")
            logger.info("   Sending commands to scsynth on port 57110")
            logger.info("   Receiving data from sclang on port 57121")
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to SuperCollider: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from SuperCollider"""
        if self.osc_server:
            try:
                self.osc_server.transport.close()
            except:
                pass
        self.is_connected = False
        logger.info("🔌 Disconnected from SuperCollider")
    
    def send_message(self, address: str, *args):
        """Send OSC message to scsynth"""
        if not self.scsynth_client:
            raise RuntimeError("Not connected to SuperCollider")

        try:
            # Log /n_free and /n_set messages to debug pause issue
            if address in ["/n_free", "/n_set"]:
                logger.info(f"📤 Sending OSC: {address} {args}")
            self.scsynth_client.send_message(address, args if args else [])
        except Exception as e:
            logger.error(f"❌ Failed to send OSC message {address}: {e}")
            raise
    
    def allocate_node_id(self) -> int:
        """Allocate a new node ID for a synth"""
        node_id = self.next_node_id
        self.next_node_id += 1
        return node_id
    
    # OSC message handlers
    def _handle_waveform(self, address, *args):
        """Handle waveform data from sclang"""
        logger.debug(f"📊 Received waveform data: {len(args)} samples")
        if self.on_waveform_data:
            self.on_waveform_data(list(args))
    
    def _handle_spectrum(self, address, *args):
        """Handle spectrum data from sclang"""
        if self.on_spectrum_data:
            self.on_spectrum_data(list(args))
    
    def _handle_meter(self, address, *args):
        """Handle meter data from sclang"""
        if self.on_meter_data:
            # Format from SendReply: [nodeID, replyID, peakL, peakR, rmsL, rmsR]
            # But sclang forwards: [peakL, peakR, rmsL, rmsR]
            if len(args) >= 4:
                meter_data = {
                    "peakL": args[0],
                    "peakR": args[1],
                    "rmsL": args[2],
                    "rmsR": args[3]
                }
                self.on_meter_data(meter_data)

    # Input audio handlers
    def _handle_input_waveform(self, address, *args):
        """Handle input waveform data from sclang"""
        logger.debug(f"🎤 Received input waveform data: {len(args)} samples")
        if self.on_input_waveform_data:
            self.on_input_waveform_data(list(args))

    def _handle_input_spectrum(self, address, *args):
        """Handle input spectrum data from sclang"""
        logger.debug(f"🎤 Received input spectrum data: {len(args)} bins")
        if self.on_input_spectrum_data:
            self.on_input_spectrum_data(list(args))

    def _handle_input_meter(self, address, *args):
        """Handle input meter data from sclang"""
        if self.on_input_meter_data:
            if len(args) >= 4:
                meter_data = {
                    "peakL": args[0],
                    "peakR": args[1],
                    "rmsL": args[2],
                    "rmsR": args[3]
                }
                self.on_input_meter_data(meter_data)

    def _handle_track_meter(self, address, *args):
        """Handle per-track meter data from sclang"""
        if self.on_track_meter_data:
            # Format from sclang: [trackId, peakL, peakR, rmsL, rmsR]
            if len(args) >= 5:
                track_id = str(int(args[0]))  # Convert to string for consistency
                meter_data = {
                    "track_id": track_id,
                    "peak_left": float(args[1]),
                    "peak_right": float(args[2]),
                    "rms_left": float(args[3]),
                    "rms_right": float(args[4])
                }
                self.on_track_meter_data(meter_data)

