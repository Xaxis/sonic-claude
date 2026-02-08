"""
Spectral Analysis Service
Performs detailed frequency analysis on audio samples
"""
import wave
import numpy as np
from scipy import signal
from scipy.fft import rfft, rfftfreq
from typing import Optional
from backend.core import get_logger
from backend.models.sample import SpectralFeatures

logger = get_logger(__name__)


class SpectralAnalyzer:
    """Analyzes audio samples and extracts spectral features"""
    
    def __init__(self):
        logger.info("SpectralAnalyzer initialized")
        
    def analyze_sample(self, sample_id: str, filepath: str) -> SpectralFeatures:
        """Perform comprehensive spectral analysis on a sample"""
        try:
            # Load WAV file
            with wave.open(filepath, 'rb') as wf:
                sample_rate = wf.getframerate()
                channels = wf.getnchannels()
                frames = wf.readframes(wf.getnframes())
                
            # Convert to numpy array
            audio_data = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
            
            # Convert to mono if stereo
            if channels == 2:
                audio_data = audio_data.reshape(-1, 2).mean(axis=1)
                
            logger.info(f"Analyzing sample {sample_id}: {len(audio_data)} samples at {sample_rate} Hz")
            
            # Perform FFT
            fft_result = rfft(audio_data)
            magnitude = np.abs(fft_result)
            freqs = rfftfreq(len(audio_data), 1/sample_rate)
            
            # 1. Spectral Centroid (brightness)
            spectral_centroid = np.sum(freqs * magnitude) / (np.sum(magnitude) + 1e-10)
            
            # 2. Spectral Rolloff (85% of energy)
            cumsum = np.cumsum(magnitude)
            rolloff_idx = np.where(cumsum >= 0.85 * cumsum[-1])[0]
            spectral_rolloff = freqs[rolloff_idx[0]] if len(rolloff_idx) > 0 else 0
            
            # 3. Spectral Bandwidth
            spectral_bandwidth = np.sqrt(
                np.sum(((freqs - spectral_centroid) ** 2) * magnitude) / (np.sum(magnitude) + 1e-10)
            )
            
            # 4. Spectral Flatness (noisiness)
            geometric_mean = np.exp(np.mean(np.log(magnitude + 1e-10)))
            arithmetic_mean = np.mean(magnitude)
            spectral_flatness = geometric_mean / (arithmetic_mean + 1e-10)
            
            # 5. Fundamental Frequency (using autocorrelation)
            fundamental_frequency = self._estimate_fundamental(audio_data, sample_rate)
            
            # 6. Harmonic Series
            harmonics, harmonic_amplitudes = self._extract_harmonics(
                fundamental_frequency, freqs, magnitude, num_harmonics=8
            )
            
            # 7. ADSR Envelope
            attack_time, decay_time, sustain_level, release_time = self._extract_envelope(
                audio_data, sample_rate
            )
            
            # 8. Perceptual Features
            brightness = self._calculate_brightness(spectral_centroid, spectral_rolloff)
            roughness = self._calculate_roughness(magnitude, freqs)
            warmth = self._calculate_warmth(magnitude, freqs)
            
            # 9. Spectral Envelope (for visualization)
            num_bins = 100
            bin_size = max(1, len(magnitude) // num_bins)
            frequency_bins = []
            magnitude_spectrum = []
            
            for i in range(num_bins):
                start_idx = i * bin_size
                end_idx = min(start_idx + bin_size, len(magnitude))
                if start_idx < len(freqs):
                    frequency_bins.append(float(freqs[start_idx]))
                    magnitude_spectrum.append(float(np.mean(magnitude[start_idx:end_idx])))
                    
            return SpectralFeatures(
                sample_id=sample_id,
                spectral_centroid=float(spectral_centroid),
                spectral_rolloff=float(spectral_rolloff),
                spectral_bandwidth=float(spectral_bandwidth),
                spectral_flatness=float(min(1.0, spectral_flatness)),
                fundamental_frequency=float(fundamental_frequency),
                harmonics=harmonics,
                harmonic_amplitudes=harmonic_amplitudes,
                attack_time=float(attack_time),
                decay_time=float(decay_time),
                sustain_level=float(sustain_level),
                release_time=float(release_time),
                frequency_bins=frequency_bins,
                magnitude_spectrum=magnitude_spectrum,
                brightness=float(brightness),
                roughness=float(roughness),
                warmth=float(warmth)
            )
            
        except Exception as e:
            logger.error(f"Failed to analyze sample {sample_id}: {e}")
            raise
            
    def _estimate_fundamental(self, audio_data: np.ndarray, sample_rate: int) -> float:
        """Estimate fundamental frequency using autocorrelation"""
        # Autocorrelation
        autocorr = np.correlate(audio_data, audio_data, mode='full')
        autocorr = autocorr[len(autocorr)//2:]
        
        # Find first peak after zero lag
        # Look for peaks in reasonable pitch range (50-2000 Hz)
        min_lag = int(sample_rate / 2000)  # 2000 Hz
        max_lag = int(sample_rate / 50)    # 50 Hz
        
        if max_lag < len(autocorr):
            autocorr_range = autocorr[min_lag:max_lag]
            if len(autocorr_range) > 0:
                peak_idx = np.argmax(autocorr_range) + min_lag
                fundamental = sample_rate / peak_idx
                return fundamental
                
        return 0.0
        
    def _extract_harmonics(self, fundamental: float, freqs: np.ndarray, 
                          magnitude: np.ndarray, num_harmonics: int = 8) -> tuple:
        """Extract harmonic frequencies and amplitudes"""
        harmonics = []
        harmonic_amplitudes = []
        
        if fundamental > 0:
            for n in range(1, num_harmonics + 1):
                harmonic_freq = fundamental * n
                # Find closest frequency bin
                idx = np.argmin(np.abs(freqs - harmonic_freq))
                harmonics.append(float(harmonic_freq))
                harmonic_amplitudes.append(float(magnitude[idx]))
                
        return harmonics, harmonic_amplitudes

    def _extract_envelope(self, audio_data: np.ndarray, sample_rate: int) -> tuple:
        """Extract ADSR envelope parameters"""
        # Get amplitude envelope
        envelope = np.abs(audio_data)

        # Smooth envelope
        window_size = int(sample_rate * 0.01)  # 10ms window
        if window_size > 0:
            envelope = np.convolve(envelope, np.ones(window_size)/window_size, mode='same')

        max_amp = np.max(envelope)
        if max_amp == 0:
            return 0.0, 0.0, 0.0, 0.0

        # Normalize
        envelope = envelope / max_amp

        # Attack: time to reach 90% of max
        attack_threshold = 0.9
        attack_idx = np.where(envelope >= attack_threshold)[0]
        attack_time = attack_idx[0] / sample_rate if len(attack_idx) > 0 else 0.0

        # Decay: time from peak to sustain level (estimate sustain as median of middle section)
        middle_start = len(envelope) // 3
        middle_end = 2 * len(envelope) // 3
        sustain_level = np.median(envelope[middle_start:middle_end])

        # Find decay time (peak to sustain)
        peak_idx = np.argmax(envelope)
        decay_section = envelope[peak_idx:]
        decay_idx = np.where(decay_section <= sustain_level)[0]
        decay_time = decay_idx[0] / sample_rate if len(decay_idx) > 0 else 0.0

        # Release: time from sustain to 10% in final section
        final_section = envelope[middle_end:]
        release_threshold = 0.1
        release_idx = np.where(final_section <= release_threshold)[0]
        release_time = release_idx[0] / sample_rate if len(release_idx) > 0 else 0.0

        return attack_time, decay_time, sustain_level, release_time

    def _calculate_brightness(self, centroid: float, rolloff: float) -> float:
        """Calculate perceptual brightness (0-1)"""
        # Normalize based on typical ranges
        brightness = min(1.0, centroid / 5000.0)
        return brightness

    def _calculate_roughness(self, magnitude: np.ndarray, freqs: np.ndarray) -> float:
        """Calculate perceptual roughness (0-1)"""
        # Roughness relates to spectral irregularity
        # Use spectral flux as proxy
        if len(magnitude) < 2:
            return 0.0
        spectral_diff = np.diff(magnitude)
        roughness = min(1.0, np.std(spectral_diff) / (np.mean(magnitude) + 1e-10))
        return roughness

    def _calculate_warmth(self, magnitude: np.ndarray, freqs: np.ndarray) -> float:
        """Calculate perceptual warmth (0-1)"""
        # Warmth relates to low-frequency energy
        # Calculate ratio of low-freq to total energy
        low_freq_threshold = 500  # Hz
        low_freq_mask = freqs < low_freq_threshold
        low_freq_energy = np.sum(magnitude[low_freq_mask])
        total_energy = np.sum(magnitude)
        warmth = low_freq_energy / (total_energy + 1e-10)
        return min(1.0, warmth)

