"""
Real-time Audio Analysis Engine
Captures audio from Sonic Pi and analyzes it
"""

import numpy as np
import pyaudio
import asyncio
import logging
from collections import deque
from typing import Optional
from backend.ai_agent import AudioAnalysis

logger = logging.getLogger("audio-analyzer")

class AudioAnalyzer:
    """Real-time audio capture and analysis"""
    
    def __init__(self, sample_rate=44100, chunk_size=2048):
        self.sample_rate = sample_rate
        self.chunk_size = chunk_size
        self.audio = None
        self.stream = None
        self.is_running = False
        self.audio_buffer = deque(maxlen=100)  # Keep last 100 chunks
        
    async def start(self):
        """Start audio capture"""
        try:
            self.audio = pyaudio.PyAudio()
            
            # Find the audio input device (BlackHole or system audio)
            device_index = self._find_audio_device()
            
            self.stream = self.audio.open(
                format=pyaudio.paFloat32,
                channels=2,
                rate=self.sample_rate,
                input=True,
                input_device_index=device_index,
                frames_per_buffer=self.chunk_size,
                stream_callback=self._audio_callback
            )
            
            self.stream.start_stream()
            self.is_running = True
            logger.info(f"Audio capture started on device {device_index}")
            
        except Exception as e:
            logger.error(f"Failed to start audio capture: {e}")
            logger.warning("Audio analysis will use simulated data")
            self.is_running = False
            
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
                    logger.info(f"Found audio routing device: {device_info.get('name')}")
                    return i
                    
        # Fall back to default input
        default_device = self.audio.get_default_input_device_info()
        logger.info(f"Using default input device: {default_device.get('name')}")
        return default_device['index']
        
    def _audio_callback(self, in_data, frame_count, time_info, status):
        """Called for each audio chunk"""
        if status:
            logger.warning(f"Audio callback status: {status}")
            
        # Convert bytes to numpy array
        audio_data = np.frombuffer(in_data, dtype=np.float32)
        self.audio_buffer.append(audio_data)
        
        return (in_data, pyaudio.paContinue)
        
    def analyze_current_audio(self) -> Optional[AudioAnalysis]:
        """Analyze the current audio buffer"""
        if not self.audio_buffer:
            # Return simulated data if no audio
            return self._generate_simulated_analysis()
            
        # Get recent audio data
        audio_data = np.concatenate(list(self.audio_buffer))
        
        # Mono conversion (average channels)
        if len(audio_data.shape) > 1:
            audio_data = np.mean(audio_data, axis=1)
            
        return self._analyze_audio_chunk(audio_data)
        
    def _analyze_audio_chunk(self, audio_data: np.ndarray) -> AudioAnalysis:
        """Perform actual audio analysis"""
        import time
        
        # 1. RMS Energy (loudness)
        rms_energy = np.sqrt(np.mean(audio_data**2))
        
        # 2. Zero Crossing Rate (texture/noisiness)
        zero_crossings = np.sum(np.abs(np.diff(np.sign(audio_data)))) / (2 * len(audio_data))
        
        # 3. Spectral analysis using FFT
        fft = np.fft.rfft(audio_data)
        magnitude = np.abs(fft)
        freqs = np.fft.rfftfreq(len(audio_data), 1/self.sample_rate)
        
        # 4. Spectral Centroid (brightness)
        spectral_centroid = np.sum(freqs * magnitude) / (np.sum(magnitude) + 1e-10)
        
        # 5. Spectral Rolloff (high frequency content)
        cumsum = np.cumsum(magnitude)
        rolloff_idx = np.where(cumsum >= 0.85 * cumsum[-1])[0]
        spectral_rolloff = freqs[rolloff_idx[0]] if len(rolloff_idx) > 0 else 0
        
        # 6. Dominant Frequency
        dominant_idx = np.argmax(magnitude[1:]) + 1  # Skip DC component
        dominant_frequency = freqs[dominant_idx]
        
        # 7. Harmonic Content (simplified)
        harmonic_content = []
        for harmonic in range(1, 6):
            harmonic_freq = dominant_frequency * harmonic
            harmonic_idx = np.argmin(np.abs(freqs - harmonic_freq))
            harmonic_content.append(float(magnitude[harmonic_idx]))
            
        # 8. Rhythm Strength (onset detection simplified)
        # Use energy envelope changes
        envelope = np.abs(audio_data)
        envelope_diff = np.diff(envelope)
        rhythm_strength = np.std(envelope_diff) / (np.mean(envelope) + 1e-10)
        rhythm_strength = min(1.0, rhythm_strength)  # Normalize to 0-1
        
        # 9. Tempo Estimate (simplified - would need more sophisticated algorithm)
        tempo_estimate = 120.0  # Placeholder
        
        return AudioAnalysis(
            timestamp=time.time(),
            rms_energy=float(rms_energy),
            spectral_centroid=float(spectral_centroid),
            spectral_rolloff=float(spectral_rolloff),
            zero_crossing_rate=float(zero_crossings),
            tempo_estimate=tempo_estimate,
            dominant_frequency=float(dominant_frequency),
            harmonic_content=harmonic_content,
            rhythm_strength=float(rhythm_strength)
        )
        
    def _generate_simulated_analysis(self) -> AudioAnalysis:
        """Generate simulated analysis when no audio available"""
        import time
        return AudioAnalysis(
            timestamp=time.time(),
            rms_energy=np.random.uniform(0.3, 0.7),
            spectral_centroid=np.random.uniform(1000, 3000),
            spectral_rolloff=np.random.uniform(3000, 8000),
            zero_crossing_rate=np.random.uniform(0.1, 0.3),
            tempo_estimate=120.0,
            dominant_frequency=np.random.uniform(200, 800),
            harmonic_content=[np.random.uniform(0, 1) for _ in range(5)],
            rhythm_strength=np.random.uniform(0.4, 0.8)
        )
        
    async def stop(self):
        """Stop audio capture"""
        self.is_running = False
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
        if self.audio:
            self.audio.terminate()
        logger.info("Audio capture stopped")

