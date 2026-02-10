"""
Synthesis Service - Manages synth creation and control

Clean, organized service layer for synth management
"""
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class SynthesisService:
    """
    Manages synth creation, control, and lifecycle
    
    Node ID allocation:
    - 1000-2999: System synths (audioMonitor, etc.)
    - 3000+: User synths
    """
    
    def __init__(self, engine_manager):
        self.engine_manager = engine_manager
        self.active_synths: Dict[int, dict] = {}
    
    async def create_synth(
        self,
        synthdef: str,
        params: Optional[Dict] = None,
        group: int = 1,
        bus: Optional[int] = None
    ) -> dict:
        """
        Create a new synth
        
        Args:
            synthdef: SynthDef name (e.g., "sine", "saw", "square")
            params: Synth parameters (e.g., {"freq": 440, "amp": 0.5})
            group: Target group (1=synths, 2=effects, 3=master)
            bus: Output bus (None = master output)
        
        Returns:
            Synth info dict with id, synthdef, parameters, group, bus
        """
        try:
            # Allocate node ID
            synth_id = self.engine_manager.allocate_node_id()
            
            # Default parameters
            if params is None:
                params = {}
            
            # Build OSC message arguments
            args = [
                synthdef,  # SynthDef name
                synth_id,  # Node ID
                1,  # Add action: addToTail
                group,  # Target group
            ]
            
            # Add parameters
            for key, value in params.items():
                args.append(key)
                args.append(value)
            
            # Add output bus if specified
            if bus is not None:
                args.append("out")
                args.append(bus)
            
            # Send /s_new message to scsynth
            self.engine_manager.send_message("/s_new", *args)
            
            # Store synth info
            synth_info = {
                "id": synth_id,
                "synthdef": synthdef,
                "parameters": params,
                "group": group,
                "bus": bus
            }
            self.active_synths[synth_id] = synth_info
            
            logger.info(f"✅ Created synth {synth_id} ({synthdef}) in group {group}")
            return synth_info
            
        except Exception as e:
            logger.error(f"❌ Failed to create synth: {e}")
            raise
    
    async def set_synth_param(self, synth_id: int, param: str, value: float):
        """Set a synth parameter"""
        try:
            if synth_id not in self.active_synths:
                raise ValueError(f"Synth {synth_id} not found")
            
            # Send /n_set message to scsynth
            self.engine_manager.send_message("/n_set", synth_id, param, value)
            
            # Update stored parameters
            self.active_synths[synth_id]["parameters"][param] = value
            
            logger.debug(f"Set synth {synth_id} {param} = {value}")
            
        except Exception as e:
            logger.error(f"❌ Failed to set synth parameter: {e}")
            raise
    
    async def release_synth(self, synth_id: int):
        """Release a synth (trigger gate=0, synth will free itself)"""
        try:
            if synth_id not in self.active_synths:
                raise ValueError(f"Synth {synth_id} not found")
            
            # Send gate=0 to trigger release envelope
            self.engine_manager.send_message("/n_set", synth_id, "gate", 0)
            
            # Remove from active synths
            del self.active_synths[synth_id]
            
            logger.info(f"🔇 Released synth {synth_id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to release synth: {e}")
            raise
    
    async def free_synth(self, synth_id: int):
        """Free a synth immediately (no release envelope)"""
        try:
            if synth_id not in self.active_synths:
                raise ValueError(f"Synth {synth_id} not found")
            
            # Send /n_free message to scsynth
            self.engine_manager.send_message("/n_free", synth_id)
            
            # Remove from active synths
            del self.active_synths[synth_id]
            
            logger.info(f"🗑️  Freed synth {synth_id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to free synth: {e}")
            raise
    
    async def free_all_synths(self):
        """Free all active synths"""
        try:
            synth_ids = list(self.active_synths.keys())
            for synth_id in synth_ids:
                await self.free_synth(synth_id)
            
            logger.info("🗑️  Freed all synths")
            
        except Exception as e:
            logger.error(f"❌ Failed to free all synths: {e}")
            raise
    
    def get_active_synths(self) -> Dict[int, dict]:
        """Get all active synths"""
        return self.active_synths.copy()
    
    def get_synth_info(self, synth_id: int) -> Optional[dict]:
        """Get info for a specific synth"""
        return self.active_synths.get(synth_id)

