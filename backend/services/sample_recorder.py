"""
Sample Recording Service
Records audio from input device and saves to WAV files
"""
import os
import wave
import uuid
import pyaudio
import numpy as np
from pathlib import Path
from typing import Optional, List
from backend.core import get_logger, settings
from backend.models.sample import Sample

logger = get_logger(__name__)


class SampleRecorder:
    """Records audio samples and manages sample library"""
    
    def __init__(self, samples_dir="samples", sample_rate=48000, channels=2):
        self.samples_dir = Path(samples_dir)
        self.samples_dir.mkdir(exist_ok=True)
        
        self.sample_rate = sample_rate
        self.channels = channels
        self.chunk_size = 2048
        
        self.audio = None
        self.stream = None
        self.is_recording = False
        self.current_recording = []
        self.current_sample_id = None
        self.current_sample_name = None
        
        logger.info(f"SampleRecorder initialized, samples directory: {self.samples_dir}")
        
    def start_recording(self, name: str = "Untitled") -> str:
        """Start recording a new sample"""
        if self.is_recording:
            raise ValueError("Already recording")
            
        try:
            self.current_sample_id = str(uuid.uuid4())
            self.current_sample_name = name
            self.current_recording = []
            
            # Initialize PyAudio
            self.audio = pyaudio.PyAudio()
            
            # Find input device
            device_index = self._find_audio_device()
            
            # Open stream
            self.stream = self.audio.open(
                format=pyaudio.paFloat32,
                channels=self.channels,
                rate=self.sample_rate,
                input=True,
                input_device_index=device_index,
                frames_per_buffer=self.chunk_size,
                stream_callback=self._recording_callback
            )
            
            self.stream.start_stream()
            self.is_recording = True
            
            logger.info(f"Started recording sample: {name} (ID: {self.current_sample_id})")
            return self.current_sample_id
            
        except Exception as e:
            logger.error(f"Failed to start recording: {e}")
            self.is_recording = False
            raise
            
    def _find_audio_device(self) -> int:
        """Find BlackHole or default input device"""
        info = self.audio.get_host_api_info_by_index(0)
        num_devices = info.get('deviceCount')
        
        # Look for BlackHole first
        for i in range(num_devices):
            device_info = self.audio.get_device_info_by_host_api_device_index(0, i)
            if device_info.get('maxInputChannels') > 0:
                name = device_info.get('name').lower()
                if 'blackhole' in name or 'soundflower' in name:
                    logger.info(f"Found audio device: {device_info.get('name')}")
                    return i
                    
        # Fall back to default input
        default_device = self.audio.get_default_input_device_info()
        logger.info(f"Using default input: {default_device.get('name')}")
        return default_device['index']
        
    def _recording_callback(self, in_data, frame_count, time_info, status):
        """Callback for recording audio chunks"""
        if status:
            logger.warning(f"Recording callback status: {status}")
            
        # Store audio data
        audio_data = np.frombuffer(in_data, dtype=np.float32)
        self.current_recording.append(audio_data)
        
        return (in_data, pyaudio.paContinue)
        
    def stop_recording(self) -> Sample:
        """Stop recording and save to file"""
        if not self.is_recording:
            raise ValueError("Not currently recording")
            
        try:
            self.is_recording = False
            
            # Stop stream
            if self.stream:
                self.stream.stop_stream()
                self.stream.close()
            if self.audio:
                self.audio.terminate()
                
            # Concatenate all recorded chunks
            audio_data = np.concatenate(self.current_recording)
            
            # Convert float32 to int16 for WAV
            audio_int16 = (audio_data * 32767).astype(np.int16)
            
            # Save to WAV file
            filename = f"{self.current_sample_id}.wav"
            filepath = self.samples_dir / filename
            
            with wave.open(str(filepath), 'wb') as wf:
                wf.setnchannels(self.channels)
                wf.setsampwidth(2)  # 16-bit
                wf.setframerate(self.sample_rate)
                wf.writeframes(audio_int16.tobytes())
                
            # Calculate duration
            duration = len(audio_data) / (self.sample_rate * self.channels)
            file_size = filepath.stat().st_size
            
            # Create Sample object
            sample = Sample(
                id=self.current_sample_id,
                name=self.current_sample_name,
                filename=str(filepath),
                duration=duration,
                sample_rate=self.sample_rate,
                channels=self.channels,
                file_size=file_size
            )
            
            logger.info(f"Saved sample: {sample.name} ({duration:.2f}s, {file_size} bytes)")
            return sample

        except Exception as e:
            logger.error(f"Failed to stop recording: {e}")
            raise

    def list_samples(self) -> List[Sample]:
        """List all saved samples"""
        samples = []

        for wav_file in self.samples_dir.glob("*.wav"):
            try:
                # Read WAV metadata
                with wave.open(str(wav_file), 'rb') as wf:
                    channels = wf.getnchannels()
                    sample_rate = wf.getframerate()
                    frames = wf.getnframes()
                    duration = frames / sample_rate

                sample_id = wav_file.stem
                file_size = wav_file.stat().st_size

                # Try to load name from metadata file, or use filename
                name = sample_id  # Default to ID

                sample = Sample(
                    id=sample_id,
                    name=name,
                    filename=str(wav_file),
                    duration=duration,
                    sample_rate=sample_rate,
                    channels=channels,
                    file_size=file_size
                )
                samples.append(sample)

            except Exception as e:
                logger.warning(f"Failed to read sample {wav_file}: {e}")

        return samples

    def get_sample(self, sample_id: str) -> Optional[Sample]:
        """Get a specific sample by ID"""
        samples = self.list_samples()
        for sample in samples:
            if sample.id == sample_id:
                return sample
        return None

    def delete_sample(self, sample_id: str) -> bool:
        """Delete a sample"""
        filepath = self.samples_dir / f"{sample_id}.wav"
        if filepath.exists():
            filepath.unlink()
            logger.info(f"Deleted sample: {sample_id}")
            return True
        return False

    def rename_sample(self, sample_id: str, new_name: str) -> Optional[Sample]:
        """Rename a sample (updates metadata only, not filename)"""
        # For now, just return updated sample with new name
        # In production, you'd store metadata in a JSON file
        sample = self.get_sample(sample_id)
        if sample:
            sample.name = new_name
            logger.info(f"Renamed sample {sample_id} to: {new_name}")
            return sample
        return None

