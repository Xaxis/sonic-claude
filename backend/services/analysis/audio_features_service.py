"""
Audio Feature Extractor - Extract musical features from audio data

Performance optimizations:
- Reuses existing FFT data (no duplicate computation)
- Lightweight feature extraction (minimal CPU)
- Cached results (only recompute on change)
- Runs async to avoid blocking
"""
import logging
import numpy as np
from typing import Optional, List
from collections import deque

from backend.models.daw_state import AudioFeatures, MusicalContext

logger = logging.getLogger(__name__)


class AudioFeatureExtractor:
    """
    Extracts musical features from real-time audio data
    Uses existing FFT/meter data from RealtimeAudioAnalyzer
    """
    
    def __init__(self):
        # Ring buffers for temporal analysis
        self.spectrum_history = deque(maxlen=30)  # Last 30 frames (~0.5s at 60fps)
        self.meter_history = deque(maxlen=30)
        
        # Cached features
        self._cached_features: Optional[AudioFeatures] = None
        self._last_spectrum_hash: Optional[int] = None
    
    def extract_features(
        self,
        spectrum: Optional[List[float]] = None,
        peak_db: Optional[float] = None,
        rms_db: Optional[float] = None,
        is_playing: bool = False
    ) -> AudioFeatures:
        """
        Extract audio features from current data
        
        Args:
            spectrum: FFT magnitude spectrum (already computed by RealtimeAudioAnalyzer)
            peak_db: Peak level in dB
            rms_db: RMS level in dB
            is_playing: Whether audio is currently playing
        
        Returns:
            AudioFeatures with normalized values
        """
        # If no data, return silent features
        if spectrum is None or len(spectrum) == 0:
            return AudioFeatures(
                energy=0.0,
                brightness=0.0,
                loudness_db=-60.0,
                is_playing=is_playing
            )
        
        # Check cache (avoid recomputation if spectrum unchanged)
        spectrum_hash = hash(tuple(spectrum[:100]))  # Hash first 100 bins for speed
        if self._last_spectrum_hash == spectrum_hash and self._cached_features:
            # Update only dynamic fields
            self._cached_features.is_playing = is_playing
            if peak_db is not None:
                self._cached_features.loudness_db = peak_db
            return self._cached_features
        
        # Add to history
        self.spectrum_history.append(spectrum)
        if rms_db is not None:
            self.meter_history.append(rms_db)
        
        # Extract features
        features = AudioFeatures(
            energy=self._compute_energy(rms_db),
            brightness=self._compute_brightness(spectrum),
            loudness_db=peak_db if peak_db is not None else -60.0,
            is_playing=is_playing
        )
        
        # Cache
        self._cached_features = features
        self._last_spectrum_hash = spectrum_hash
        
        return features
    
    def _compute_energy(self, rms_db: Optional[float]) -> float:
        """
        Compute normalized energy (0-1)
        
        Args:
            rms_db: RMS level in dB (-60 to 0)
        
        Returns:
            Normalized energy (0.0 = silent, 1.0 = full scale)
        """
        if rms_db is None or rms_db <= -60:
            return 0.0
        
        # Normalize -60dB to 0dB → 0.0 to 1.0
        normalized = (rms_db + 60) / 60
        return max(0.0, min(1.0, normalized))
    
    def _compute_brightness(self, spectrum: List[float]) -> float:
        """
        Compute spectral brightness (0-1)
        
        Brightness = spectral centroid normalized
        Higher values = more high-frequency content
        
        Args:
            spectrum: FFT magnitude spectrum
        
        Returns:
            Normalized brightness (0.0 = dark, 1.0 = bright)
        """
        if not spectrum or len(spectrum) == 0:
            return 0.0
        
        spectrum_array = np.array(spectrum)
        
        # Avoid division by zero
        total_magnitude = np.sum(spectrum_array)
        if total_magnitude < 1e-10:
            return 0.0
        
        # Compute spectral centroid
        frequencies = np.arange(len(spectrum_array))
        centroid = np.sum(frequencies * spectrum_array) / total_magnitude
        
        # Normalize to 0-1 (assuming spectrum length is ~512-1024)
        # Centroid typically ranges from 0 to len(spectrum)/2
        normalized = centroid / (len(spectrum_array) / 2)
        
        return max(0.0, min(1.0, normalized))
    
    def _compute_spectral_flux(self) -> float:
        """
        Compute spectral flux (rate of change in spectrum)
        Useful for detecting onsets/transients
        
        Returns:
            Spectral flux value (higher = more change)
        """
        if len(self.spectrum_history) < 2:
            return 0.0
        
        current = np.array(self.spectrum_history[-1])
        previous = np.array(self.spectrum_history[-2])
        
        # Compute difference
        diff = current - previous
        
        # Sum positive differences (half-wave rectification)
        flux = np.sum(np.maximum(diff, 0))
        
        return flux
    
    def reset(self):
        """Reset history buffers and cache"""
        self.spectrum_history.clear()
        self.meter_history.clear()
        self._cached_features = None
        self._last_spectrum_hash = None

