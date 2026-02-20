"""
Sample Analyzer Service - Extract audio features from sample files

Uses librosa for audio analysis to understand:
- Spectral characteristics (brightness, frequency distribution)
- Temporal envelope (ADSR, transients)
- Pitch content (fundamental frequency, harmonicity)
- Timbre descriptors (warmth, roughness, fullness)

This gives the AI a deep understanding of what sounds are being used.
"""
import logging
import hashlib
import numpy as np
from pathlib import Path
from typing import Optional, Dict
import json

try:
    import librosa
    import librosa.feature
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    logging.warning("librosa not available - sample analysis will be limited")

from backend.models.sample_analysis import (
    SampleAnalysis,
    SpectralFeatures,
    TemporalFeatures,
    PitchFeatures,
    TimbreDescriptors,
    SampleDatabase
)

logger = logging.getLogger(__name__)


class SampleFileAnalyzer:
    """
    Analyzes audio sample files to extract features for AI understanding

    Features extracted:
    - Spectral: centroid, rolloff, flux, flatness, bandwidth, frequency bands
    - Temporal: ADSR envelope, transient detection, zero-crossing rate
    - Pitch: fundamental frequency, MIDI note, harmonicity
    - Timbre: brightness, warmth, roughness, fullness, semantic tags
    """

    def __init__(self, cache_dir: Optional[Path] = None, samples_dir: Optional[Path] = None):
        """
        Initialize sample analyzer

        Args:
            cache_dir: Directory to cache analysis results (default: data/samples/cache)
            samples_dir: Directory where samples are stored (default: data/samples)
        """
        self.samples_dir = samples_dir or Path("data/samples")
        self.cache_dir = cache_dir or (self.samples_dir / "cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # In-memory cache
        self.database = SampleDatabase()

        # Load cached analyses
        self._load_cache()

        if not LIBROSA_AVAILABLE:
            logger.warning("⚠️ librosa not installed - sample analysis disabled")
            logger.warning("   Install with: pip install librosa soundfile")

    def analyze_sample(self, file_path: str, force_reanalyze: bool = False) -> Optional[SampleAnalysis]:
        """
        Analyze an audio sample file

        Args:
            file_path: Path to audio file or sample ID
            force_reanalyze: Force re-analysis even if cached

        Returns:
            SampleAnalysis object or None if analysis fails
        """
        if not LIBROSA_AVAILABLE:
            return None

        # Resolve sample ID to file path if needed
        file_path = self._resolve_sample_path(file_path)
        if not file_path:
            return None

        file_path = str(Path(file_path).resolve())

        # Check cache
        file_hash = self._compute_file_hash(file_path)
        if not force_reanalyze and file_path in self.database.samples:
            cached = self.database.samples[file_path]
            if cached.file_hash == file_hash:
                logger.debug(f"Using cached analysis for {file_path}")
                return cached

        try:
            logger.info(f"🔍 Analyzing sample: {file_path}")

            # Load audio
            y, sr = librosa.load(file_path, sr=None, mono=False)

            # Convert to mono for analysis
            if y.ndim > 1:
                y_mono = librosa.to_mono(y)
                channels = y.shape[0]
            else:
                y_mono = y
                channels = 1

            # Extract features
            spectral = self._extract_spectral_features(y_mono, sr)
            temporal = self._extract_temporal_features(y_mono, sr)
            pitch = self._extract_pitch_features(y_mono, sr)
            timbre = self._compute_timbre_descriptors(spectral, temporal, pitch)

            # Compute RMS and peak
            rms = librosa.feature.rms(y=y_mono)[0]
            rms_db = 20 * np.log10(np.mean(rms) + 1e-10)
            peak_db = 20 * np.log10(np.max(np.abs(y_mono)) + 1e-10)

            # Get audio properties
            import soundfile as sf
            info = sf.info(file_path)

            # Parse bit depth from subtype string (e.g., "Signed 16 bit PCM" -> 16)
            bit_depth = 16  # default
            if hasattr(info, 'subtype'):
                subtype_str = str(info.subtype)
                # Extract number from strings like "PCM_16", "Signed 16 bit PCM", etc.
                import re
                match = re.search(r'(\d+)', subtype_str)
                if match:
                    bit_depth = int(match.group(1))

            # Create summary
            summary = self._generate_summary(spectral, temporal, pitch, timbre)

            # Create analysis object
            analysis = SampleAnalysis(
                file_path=file_path,
                file_hash=file_hash,
                sample_rate=sr,
                channels=channels,
                bit_depth=bit_depth,
                spectral=spectral,
                temporal=temporal,
                pitch=pitch,
                timbre=timbre,
                rms_db=float(rms_db),
                peak_db=float(peak_db),
                summary=summary
            )

            # Cache it
            self.database.samples[file_path] = analysis
            self._save_cache()

            logger.info(f"✅ Analysis complete: {summary}")
            return analysis

        except Exception as e:
            logger.error(f"Failed to analyze {file_path}: {e}", exc_info=True)

    def _extract_spectral_features(self, y: np.ndarray, sr: int) -> SpectralFeatures:
        """Extract spectral features from audio"""
        # Compute spectral features
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        flux = librosa.onset.onset_strength(y=y, sr=sr)
        flatness = librosa.feature.spectral_flatness(y=y)[0]
        bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]

        # Compute STFT for frequency band analysis
        S = np.abs(librosa.stft(y))
        freqs = librosa.fft_frequencies(sr=sr)

        # Define frequency bands
        bands = {
            'sub_bass': (20, 60),
            'bass': (60, 250),
            'low_mid': (250, 500),
            'mid': (500, 2000),
            'high_mid': (2000, 6000),
            'high': (6000, 20000)
        }

        # Compute energy in each band
        band_energies = {}
        for band_name, (low, high) in bands.items():
            mask = (freqs >= low) & (freqs < high)
            band_energy = np.mean(S[mask, :]) if np.any(mask) else 0.0
            band_energies[f"{band_name}_energy"] = float(band_energy)

        # Normalize band energies
        total_energy = sum(band_energies.values()) + 1e-10
        for key in band_energies:
            band_energies[key] /= total_energy

        return SpectralFeatures(
            centroid=float(np.mean(centroid)),
            rolloff=float(np.mean(rolloff)),
            flux=float(np.mean(flux)),
            flatness=float(np.mean(flatness)),
            bandwidth=float(np.mean(bandwidth)),
            **band_energies
        )

    def _extract_temporal_features(self, y: np.ndarray, sr: int) -> TemporalFeatures:
        """Extract temporal envelope features"""
        duration = len(y) / sr

        # Compute envelope
        envelope = np.abs(librosa.onset.onset_strength(y=y, sr=sr))
        envelope = envelope / (np.max(envelope) + 1e-10)

        # Detect attack time (time to reach 90% of max)
        max_idx = np.argmax(envelope)
        threshold_90 = 0.9
        attack_idx = np.where(envelope[:max_idx] >= threshold_90)[0]
        attack_time = (attack_idx[0] if len(attack_idx) > 0 else max_idx) * 512 / sr

        # Detect decay time (time from max to 70%)
        threshold_70 = 0.7
        decay_idx = np.where(envelope[max_idx:] <= threshold_70)[0]
        decay_time = (decay_idx[0] if len(decay_idx) > 0 else len(envelope) - max_idx) * 512 / sr

        # Estimate sustain level (mean of middle 50% of signal)
        mid_start = int(len(envelope) * 0.25)
        mid_end = int(len(envelope) * 0.75)
        sustain_level = float(np.mean(envelope[mid_start:mid_end]))

        # Estimate release time (last 30% of signal)
        release_start = int(len(envelope) * 0.7)
        release_time = (len(envelope) - release_start) * 512 / sr

        # Transient detection
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        transient_strength = float(np.max(onset_env) / (np.mean(onset_env) + 1e-10))
        is_percussive = transient_strength > 3.0
        is_sustained = sustain_level > 0.3 and duration > 0.5

        # Zero crossing rate
        zcr = librosa.feature.zero_crossing_rate(y)[0]

        return TemporalFeatures(
            duration=float(duration),
            attack_time=float(attack_time),
            decay_time=float(decay_time),
            sustain_level=sustain_level,
            release_time=float(release_time),
            is_percussive=is_percussive,
            is_sustained=is_sustained,
            transient_strength=min(1.0, transient_strength / 10.0),
            zcr_mean=float(np.mean(zcr)),
            zcr_std=float(np.std(zcr))
        )

    def _extract_pitch_features(self, y: np.ndarray, sr: int) -> PitchFeatures:
        """Extract pitch-related features"""
        # Pitch detection using YIN algorithm
        f0 = librosa.yin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'), sr=sr)

        # Filter out zero/invalid pitches
        valid_f0 = f0[f0 > 0]

        if len(valid_f0) > len(f0) * 0.3:  # At least 30% valid pitches
            has_pitch = True
            fundamental_freq = float(np.median(valid_f0))
            midi_note = int(librosa.hz_to_midi(fundamental_freq))
            pitch_confidence = len(valid_f0) / len(f0)
        else:
            has_pitch = False
            fundamental_freq = None
            midi_note = None
            pitch_confidence = 0.0

        # Harmonicity (using spectral flatness as proxy - lower = more harmonic)
        flatness = librosa.feature.spectral_flatness(y=y)[0]
        harmonicity = float(1.0 - np.mean(flatness))

        return PitchFeatures(
            has_pitch=has_pitch,
            fundamental_freq=fundamental_freq,
            midi_note=midi_note,
            pitch_confidence=float(pitch_confidence),
            harmonicity=harmonicity
        )

    def _compute_timbre_descriptors(
        self,
        spectral: SpectralFeatures,
        temporal: TemporalFeatures,
        pitch: PitchFeatures
    ) -> TimbreDescriptors:
        """Compute high-level timbre descriptors from low-level features"""
        # Brightness: based on spectral centroid and high frequency energy
        brightness = (spectral.high_energy + spectral.high_mid_energy) / 2.0

        # Warmth: based on low-mid and mid energy
        warmth = (spectral.low_mid_energy + spectral.mid_energy) / 2.0

        # Roughness: based on spectral flatness and zero-crossing rate
        roughness = (spectral.flatness + temporal.zcr_mean) / 2.0

        # Fullness: based on overall spectral bandwidth and energy distribution
        fullness = 1.0 - spectral.flatness

        # Generate semantic tags
        tags = []
        if temporal.is_percussive:
            tags.append("percussive")
        if temporal.is_sustained:
            tags.append("sustained")
        if pitch.has_pitch:
            tags.append("tonal")
        else:
            tags.append("atonal")
        if brightness > 0.6:
            tags.append("bright")
        elif brightness < 0.3:
            tags.append("dark")
        if warmth > 0.6:
            tags.append("warm")
        if roughness > 0.6:
            tags.append("rough")
        elif roughness < 0.3:
            tags.append("smooth")
        if spectral.sub_bass_energy > 0.3:
            tags.append("sub-bass")
        if spectral.bass_energy > 0.3:
            tags.append("bass-heavy")

        return TimbreDescriptors(
            brightness=brightness,
            warmth=warmth,
            roughness=roughness,
            fullness=fullness,
            tags=tags
        )

    def _generate_summary(
        self,
        spectral: SpectralFeatures,
        temporal: TemporalFeatures,
        pitch: PitchFeatures,
        timbre: TimbreDescriptors
    ) -> str:
        """Generate human-readable summary for LLM"""
        parts = []

        # Type
        if temporal.is_percussive:
            parts.append("Percussive")
        elif temporal.is_sustained:
            parts.append("Sustained")

        # Timbre tags
        if timbre.tags:
            parts.append(", ".join(timbre.tags[:3]))

        # Pitch info
        if pitch.has_pitch and pitch.midi_note:
            note_name = librosa.midi_to_note(pitch.midi_note)
            parts.append(f"pitched at {note_name}")

        # Frequency characteristics
        if spectral.sub_bass_energy > 0.3:
            parts.append("strong sub-bass")
        if spectral.high_energy > 0.4:
            parts.append("bright highs")

        return " | ".join(parts) if parts else "Generic sample"

    def _compute_file_hash(self, file_path: str) -> str:
        """Compute hash of file for cache invalidation"""
        hasher = hashlib.md5()
        with open(file_path, 'rb') as f:
            hasher.update(f.read())
        return hasher.hexdigest()

    def _load_cache(self):
        """Load cached analyses from disk"""
        cache_file = self.cache_dir / "sample_database.json"
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                    self.database = SampleDatabase.model_validate(data)
                logger.info(f"📦 Loaded {len(self.database.samples)} cached sample analyses")
            except Exception as e:
                logger.error(f"Failed to load sample cache: {e}")

    def _save_cache(self):
        """Save analyses to disk cache"""
        cache_file = self.cache_dir / "sample_database.json"
        try:
            with open(cache_file, 'w') as f:
                json.dump(self.database.model_dump(), f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to save sample cache: {e}")

    def _resolve_sample_path(self, file_path_or_id: str) -> Optional[str]:
        """
        Resolve a sample ID or path to an actual file path

        Args:
            file_path_or_id: Either a sample ID (UUID) or a file path

        Returns:
            Resolved file path or None if not found
        """
        # If it's already an absolute path that exists, use it
        path = Path(file_path_or_id)
        if path.is_absolute() and path.exists():
            return str(path)

        # Try as relative to samples directory
        samples_path = self.samples_dir / file_path_or_id
        if samples_path.exists():
            return str(samples_path)

        # Try loading metadata to resolve sample ID
        metadata_file = self.samples_dir / "metadata.json"
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                    if file_path_or_id in metadata:
                        file_name = metadata[file_path_or_id].get('file_name')
                        if file_name:
                            resolved_path = self.samples_dir / file_name
                            if resolved_path.exists():
                                return str(resolved_path)
            except Exception as e:
                logger.error(f"Failed to load sample metadata: {e}")

        logger.warning(f"Could not resolve sample path: {file_path_or_id}")
        return None

