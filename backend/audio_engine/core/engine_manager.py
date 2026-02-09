"""
Core audio engine manager - SuperCollider server lifecycle
"""
import asyncio
import logging
from typing import Optional
from supercollider import Server as SCServer
from ..models.engine import EngineStatus
from .bus_manager import BusManager
from .group_manager import GroupManager

logger = logging.getLogger(__name__)


class AudioEngineManager:
    """
    Core audio engine manager
    Handles SuperCollider server lifecycle, health monitoring, and resource management
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
            port: SuperCollider server port
            sample_rate: Audio sample rate (Hz)
            block_size: Audio block size (samples)
        """
        self.host = host
        self.port = port
        self.sample_rate = sample_rate
        self.block_size = block_size
        
        # SuperCollider server instance
        self.server: Optional[SCServer] = None
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
        Start the SuperCollider server
        
        Returns:
            True if started successfully
        """
        try:
            logger.info(f"Starting SuperCollider server on {self.host}:{self.port}")
            
            # Connect to SuperCollider server
            # Note: Assumes scsynth is already running
            self.server = SCServer(host=self.host, port=self.port)
            
            # Wait for server to be ready
            await asyncio.sleep(0.5)
            
            self.is_running = True
            
            # Start health monitoring
            self._health_check_task = asyncio.create_task(self._health_check_loop())
            
            logger.info("SuperCollider server started successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start SuperCollider server: {e}")
            self.is_running = False
            return False
    
    async def stop(self):
        """Stop the SuperCollider server"""
        try:
            logger.info("Stopping SuperCollider server")
            
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
            
            # Disconnect from server
            if self.server:
                # Note: python-supercollider doesn't have explicit disconnect
                self.server = None
            
            self.is_running = False
            logger.info("SuperCollider server stopped")
            
        except Exception as e:
            logger.error(f"Error stopping SuperCollider server: {e}")
    
    async def restart(self) -> bool:
        """Restart the SuperCollider server"""
        await self.stop()
        await asyncio.sleep(1.0)
        return await self.start()
    
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
                # TODO: Query actual server status via OSC
                # For now, just maintain basic state
                await asyncio.sleep(5.0)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health check error: {e}")
                await asyncio.sleep(5.0)

