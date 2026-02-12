"""
Buffer Manager - Manages SuperCollider audio buffers for sample playback

Responsibilities:
- Load audio files into SuperCollider buffers
- Track buffer allocations
- Free buffers when no longer needed
"""
import logging
from typing import Dict, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class BufferManager:
    """Manages SuperCollider audio buffers"""
    
    def __init__(self, engine_manager):
        self.engine_manager = engine_manager
        self.buffers: Dict[str, int] = {}  # sample_id -> buffer_num
        self.next_buffer_num = 100  # Start at 100 to avoid conflicts with system buffers
        
        logger.info("✅ BufferManager initialized")
    
    def allocate_buffer_num(self) -> int:
        """Allocate a new buffer number"""
        buffer_num = self.next_buffer_num
        self.next_buffer_num += 1
        return buffer_num
    
    async def load_sample(self, sample_id: str, file_path: str) -> int:
        """
        Load an audio file into a SuperCollider buffer
        
        Args:
            sample_id: Unique identifier for the sample
            file_path: Path to the audio file
        
        Returns:
            Buffer number
        """
        # Check if already loaded
        if sample_id in self.buffers:
            logger.debug(f"Sample {sample_id} already loaded in buffer {self.buffers[sample_id]}")
            return self.buffers[sample_id]
        
        try:
            # Allocate buffer number
            buffer_num = self.allocate_buffer_num()
            
            # Resolve full path
            full_path = Path(file_path).resolve()
            if not full_path.exists():
                raise FileNotFoundError(f"Sample file not found: {full_path}")
            
            # Send /b_allocRead message to load file into buffer
            # Format: /b_allocRead bufnum path startFrame numFrames
            self.engine_manager.send_message(
                "/b_allocRead",
                buffer_num,
                str(full_path),
                0,  # startFrame
                -1  # numFrames (-1 = read entire file)
            )
            
            # Store buffer mapping
            self.buffers[sample_id] = buffer_num
            
            logger.info(f"✅ Loaded sample {sample_id} into buffer {buffer_num}: {full_path.name}")
            return buffer_num
            
        except Exception as e:
            logger.error(f"❌ Failed to load sample {sample_id}: {e}")
            raise
    
    def get_buffer(self, sample_id: str) -> Optional[int]:
        """Get buffer number for a sample"""
        return self.buffers.get(sample_id)
    
    async def free_buffer(self, sample_id: str):
        """Free a buffer"""
        if sample_id not in self.buffers:
            return
        
        buffer_num = self.buffers[sample_id]
        
        try:
            # Send /b_free message
            self.engine_manager.send_message("/b_free", buffer_num)
            
            # Remove from tracking
            del self.buffers[sample_id]
            
            logger.info(f"🗑️  Freed buffer {buffer_num} for sample {sample_id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to free buffer {buffer_num}: {e}")
            raise
    
    async def free_all_buffers(self):
        """Free all buffers"""
        for sample_id in list(self.buffers.keys()):
            await self.free_buffer(sample_id)
        
        logger.info("🗑️  Freed all buffers")
    
    def get_all_buffers(self) -> Dict[str, int]:
        """Get all buffer mappings"""
        return self.buffers.copy()

