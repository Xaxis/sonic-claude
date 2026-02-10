"""
Core audio engine manager - SuperCollider OSC client wrapper
"""
import asyncio
import logging
from typing import Optional
from pythonosc import udp_client
from ..models.engine import EngineStatus
from .bus_manager import BusManager
from .group_manager import GroupManager

logger = logging.getLogger(__name__)


class AudioEngineManager:
    """
    Core audio engine manager - OSC client wrapper for SuperCollider

    This class provides a Python API wrapper around SuperCollider's OSC protocol.
    It does NOT manage the SuperCollider server process - that should be started
    independently (e.g., by start.sh script).

    Responsibilities:
    - Send OSC commands to SuperCollider server
    - Monitor server health/status
    - Manage resource allocation (buses, groups)
    - Provide high-level API for services
    """

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 57110,
        sample_rate: int = 48000,
        block_size: int = 64
    ):
        """
        Initialize audio engine manager

        Args:
            host: SuperCollider server host
            port: SuperCollider server port (OSC command port)
            sample_rate: Audio sample rate (Hz)
            block_size: Audio block size (samples)
        """
        self.host = host
        self.port = port
        self.sample_rate = sample_rate
        self.block_size = block_size

        # OSC client for sending commands to SuperCollider
        self.osc_client: Optional[udp_client.SimpleUDPClient] = None
        self.is_running = False

        # Resource managers
        self.bus_manager = BusManager()
        self.group_manager = GroupManager()

        # Health monitoring
        self._health_check_task: Optional[asyncio.Task] = None
        self._cpu_usage = 0.0
        self._active_synths = 0
    
    async def start(self) -> bool:
        """
        Connect to SuperCollider server via OSC

        Note: This does NOT start the SuperCollider server process.
        The server should already be running (started by start.sh or manually).

        Returns:
            True if connected successfully
        """
        try:
            logger.info(f"🎹 Connecting to SuperCollider server at {self.host}:{self.port}")

            # Create OSC client for sending commands to SuperCollider
            self.osc_client = udp_client.SimpleUDPClient(self.host, self.port)

            # Send a test message to verify connection
            # /status - Request server status
            self.osc_client.send_message("/status", [])

            # Wait a moment for response (we don't actually check it here)
            await asyncio.sleep(0.5)

            self.is_running = True

            # Wait a bit more to ensure SuperCollider is fully ready
            await asyncio.sleep(0.5)

            # Create default node groups
            self._create_default_groups()

            # Start health monitoring
            self._health_check_task = asyncio.create_task(self._health_check_loop())

            logger.info("✅ Connected to SuperCollider server successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to connect to SuperCollider server: {e}")
            logger.warning("⚠️  Make sure SuperCollider server (scsynth) is running")
            self.is_running = False
            return False
    
    async def stop(self):
        """Disconnect from SuperCollider server"""
        try:
            logger.info("🛑 Disconnecting from SuperCollider server")

            # Stop health monitoring
            if self._health_check_task:
                self._health_check_task.cancel()
                try:
                    await self._health_check_task
                except asyncio.CancelledError:
                    pass

            # Free all resources
            self.bus_manager.reset()
            self.group_manager.reset()

            # Close OSC client
            if self.osc_client:
                # SimpleUDPClient doesn't need explicit close
                self.osc_client = None

            self.is_running = False
            logger.info("✅ Disconnected from SuperCollider server")

        except Exception as e:
            logger.error(f"❌ Error disconnecting from SuperCollider server: {e}")
    
    async def restart(self) -> bool:
        """Restart the SuperCollider server"""
        await self.stop()
        await asyncio.sleep(1.0)
        return await self.start()

    def _create_default_groups(self):
        """
        Create default node groups in SuperCollider

        SuperCollider's default group is ID 0 (root).
        We create standard groups for organizing synths:
        - Group 1: synths (for instruments and sound sources)
        - Group 2: effects (for audio effects)
        - Group 3: master (for master bus processing)
        """
        try:
            logger.info("🎯 Creating default node groups...")

            # Create groups using /g_new command
            # Format: /g_new [group_id, add_action, target]
            # add_action: 0=addToHead, 1=addToTail
            # target: parent group ID (0 = root)

            logger.debug("  Sending /g_new 1 1 0 (synths group)")
            self.send_osc("/g_new", 1, 1, 0)  # Group 1 (synths) - add to tail of root

            logger.debug("  Sending /g_new 2 1 0 (effects group)")
            self.send_osc("/g_new", 2, 1, 0)  # Group 2 (effects) - add to tail of root

            logger.debug("  Sending /g_new 3 1 0 (master group)")
            self.send_osc("/g_new", 3, 1, 0)  # Group 3 (master) - add to tail of root

            logger.info("✅ Created default node groups (1=synths, 2=effects, 3=master)")
        except Exception as e:
            logger.error(f"❌ Failed to create default groups: {e}")

    def get_status(self) -> EngineStatus:
        """
        Get current engine status
        
        Returns:
            EngineStatus instance
        """
        return EngineStatus(
            running=self.is_running,
            sample_rate=self.sample_rate,
            block_size=self.block_size,
            cpu_usage=self._cpu_usage,
            active_synths=self._active_synths,
            active_groups=len(self.group_manager.groups),
            num_audio_buses=len(self.bus_manager.audio_buses),
            num_control_buses=len(self.bus_manager.control_buses)
        )
    
    async def _health_check_loop(self):
        """Background task to monitor server health"""
        while self.is_running:
            try:
                # Send /status request to SuperCollider
                if self.osc_client:
                    self.osc_client.send_message("/status", [])

                await asyncio.sleep(5.0)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health check error: {e}")
                await asyncio.sleep(5.0)

    # OSC Command Helpers

    def send_osc(self, address: str, *args):
        """
        Send an OSC message to SuperCollider

        Args:
            address: OSC address (e.g., "/s_new", "/n_set")
            *args: OSC message arguments
        """
        if not self.osc_client:
            logger.warning(f"Cannot send OSC message {address}: not connected")
            return

        try:
            self.osc_client.send_message(address, list(args))
        except Exception as e:
            logger.error(f"Failed to send OSC message {address}: {e}")

    def create_synth(self, synthdef: str, node_id: int, add_action: int = 0, target: int = 1, **params):
        """
        Create a synth on the SuperCollider server

        Args:
            synthdef: SynthDef name
            node_id: Node ID for the synth
            add_action: Add action (0=addToHead, 1=addToTail, 2=addBefore, 3=addAfter, 4=addReplace)
            target: Target node/group ID
            **params: Synth parameters as keyword arguments

        Example:
            engine.create_synth("sine", 1001, freq=440, amp=0.5)
        """
        # Build OSC message: /s_new [synthdef, node_id, add_action, target, param1, value1, param2, value2, ...]
        args = [synthdef, node_id, add_action, target]
        for key, value in params.items():
            args.extend([key, value])

        self.send_osc("/s_new", *args)
        logger.debug(f"Created synth: {synthdef} (ID: {node_id})")

    def free_node(self, node_id: int):
        """
        Free a node (synth or group)

        Args:
            node_id: Node ID to free
        """
        self.send_osc("/n_free", node_id)
        logger.debug(f"Freed node: {node_id}")

    def set_node_param(self, node_id: int, **params):
        """
        Set parameters on a node

        Args:
            node_id: Node ID
            **params: Parameters as keyword arguments

        Example:
            engine.set_node_param(1001, freq=880, amp=0.3)
        """
        # Build OSC message: /n_set [node_id, param1, value1, param2, value2, ...]
        args = [node_id]
        for key, value in params.items():
            args.extend([key, value])

        self.send_osc("/n_set", *args)
        logger.debug(f"Set node {node_id} params: {params}")

