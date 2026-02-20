"""
Audio Analyzer Service - Processes audio data from SuperCollider

CORRECT ARCHITECTURE:
- Receives buffer-based audio data from sclang (via OSC relay)
- Performs FFT analysis in Python (numpy)
- Sends processed data to frontend via WebSocket
- Clean separation of concerns
"""
import logging
import asyncio
import numpy as np
from typing import Optional, Callable, List, Dict, Any

from backend.core.engine_manager import AudioEngineManager

logger = logging.getLogger(__name__)


class RealtimeAudioAnalyzer:
    """
    Analyzes real-time audio data received from SuperCollider

    Data flow:
    1. scsynth writes audio to buffer partitions (BufWr)
    2. scsynth signals when partition is ready (SendReply)
    3. sclang retrieves buffer data (Buffer.getn)
    4. sclang forwards data to Python (OSC)
    5. Python analyzes data (FFT, peak/RMS)
    6. Python sends to frontend (WebSocket)
    """

    def __init__(self, engine_manager: AudioEngineManager) -> None:
        """
        Initialize audio analyzer service

        Args:
            engine_manager: Audio engine manager for OSC communication
        """
        self.engine_manager = engine_manager
        self.is_monitoring: bool = False
        self.monitor_synth_id: Optional[int] = None
        self.waveform_buffer_id: Optional[int] = None
        self.spectrum_buffer_id: Optional[int] = None

        # Callbacks for sending data to frontend
        self.on_waveform_update: Optional[Callable] = None
        self.on_spectrum_update: Optional[Callable] = None
        self.on_meter_update: Optional[Callable] = None

        # Register callbacks with engine manager
        engine_manager.on_waveform_data = self._handle_waveform_data
        engine_manager.on_spectrum_data = self._handle_spectrum_data
        engine_manager.on_meter_data = self._handle_meter_data

    async def start_monitoring(self, waveform_buffer_id: int, spectrum_buffer_id: int) -> None:
        """
        Start audio monitoring

        Args:
            waveform_buffer_id: Buffer ID for waveform data
            spectrum_buffer_id: Buffer ID for spectrum data
        """
        if self.is_monitoring:
            logger.warning("⚠️  Audio monitoring already started")
            return

        try:
            logger.info("🎤 Starting audio monitoring...")

            self.waveform_buffer_id = waveform_buffer_id
            self.spectrum_buffer_id = spectrum_buffer_id

            # Create audioMonitor synth
            # Node ID: 1000 (reserved for system)
            # Target: 0 (root group)
            # Add action: 1 (addToTail - monitor after all other synths)
            self.monitor_synth_id = 1000

            self.engine_manager.send_message(
                "/s_new",
                "audioMonitor",  # SynthDef name
                self.monitor_synth_id,  # Node ID
                1,  # Add action: addToTail
                0,  # Target: root group
                "targetBus", 0,  # Monitor master output bus
                "waveformBuf", waveform_buffer_id,
                "spectrumBuf", spectrum_buffer_id,
                "sendRate", 60  # 60 Hz update rate
            )

            self.is_monitoring = True
            logger.info(f"✅ Audio monitoring started (synth ID: {self.monitor_synth_id})")
            logger.info(f"   Waveform buffer: {waveform_buffer_id}")
            logger.info(f"   Spectrum buffer: {spectrum_buffer_id}")

        except Exception as e:
            logger.error(f"❌ Failed to start audio monitoring: {e}")
            raise

    async def update_master_volume(self, volume_db: float, mute: bool = False) -> None:
        """
        Update master volume and mute on the audioMonitor synth

        Args:
            volume_db: Master volume in dB (-60 to +12)
            mute: Mute state
        """
        if not self.is_monitoring or self.monitor_synth_id is None:
            logger.warning("⚠️ Cannot update master volume - monitoring not started")
            return

        try:
            # Convert dB to linear amplitude
            volume_linear = 10 ** (volume_db / 20)

            # Send parameter updates to audioMonitor synth
            self.engine_manager.send_message(
                "/n_set",
                self.monitor_synth_id,
                "volume", volume_linear,
                "mute", 1 if mute else 0
            )

            logger.debug(f"🔊 Updated master volume: {volume_db:.1f}dB (linear: {volume_linear:.3f}), mute: {mute}")

        except Exception as e:
            logger.error(f"❌ Failed to update master volume: {e}")


    async def stop_monitoring(self) -> None:
        """Stop audio monitoring"""
        if not self.is_monitoring:
            return

        try:
            if self.monitor_synth_id:
                self.engine_manager.send_message("/n_free", self.monitor_synth_id)

            self.is_monitoring = False
            self.monitor_synth_id = None
            logger.info("🛑 Audio monitoring stopped")

        except Exception as e:
            logger.error(f"❌ Failed to stop audio monitoring: {e}")

    def _handle_waveform_data(self, samples: List[float]) -> None:
        """
        Handle waveform data from sclang

        Args:
            samples: Audio sample data
        """
        if not self.on_waveform_update or not self.on_spectrum_update:
            return

        try:
            # Convert to numpy array for processing
            waveform = np.array(samples, dtype=np.float32)

            # Send waveform to frontend (async)
            # Frontend expects: {type: "waveform", samples_left: [], samples_right: []}
            # We have mono, so duplicate for left/right
            samples_list = waveform.tolist()
            asyncio.create_task(self.on_waveform_update({
                "type": "waveform",
                "samples_left": samples_list,
                "samples_right": samples_list  # Mono duplicated to stereo
            }))

            # Compute FFT spectrum from waveform
            # Apply Hann window to reduce spectral leakage
            window = np.hanning(len(waveform))
            windowed = waveform * window

            # Compute FFT
            fft_result = np.fft.rfft(windowed)
            magnitudes = np.abs(fft_result)

            # Convert to dB
            magnitudes_db = 20 * np.log10(np.maximum(magnitudes, 1e-10))

            # Send spectrum to frontend (async)
            # Frontend expects: {type: "spectrum", magnitudes: []}
            asyncio.create_task(self.on_spectrum_update({
                "type": "spectrum",
                "magnitudes": magnitudes_db.tolist()
            }))

        except Exception as e:
            logger.error(f"❌ Error processing waveform data: {e}")

    def _handle_spectrum_data(self, samples: List[float]) -> None:
        """
        Handle spectrum data from sclang (NOT USED - we compute FFT from waveform)

        Args:
            samples: Spectrum data (unused)
        """
        pass

    def _handle_meter_data(self, meter_data: Dict[str, float]) -> None:
        """
        Handle meter data from sclang

        Args:
            meter_data: Dictionary containing peakL, peakR, rmsL, rmsR values
        """
        if not self.on_meter_update:
            return

        try:
            # Convert to dB (clamp minimum to -96 dB to match frontend expectations)
            peak_l_db = 20 * np.log10(max(meter_data["peakL"], 1e-10))
            peak_r_db = 20 * np.log10(max(meter_data["peakR"], 1e-10))
            rms_l_db = 20 * np.log10(max(meter_data["rmsL"], 1e-10))
            rms_r_db = 20 * np.log10(max(meter_data["rmsR"], 1e-10))

            # Clamp to -96 dB minimum (frontend expects -96 to 0 dB range)
            peak_l_db = max(peak_l_db, -96.0)
            peak_r_db = max(peak_r_db, -96.0)
            rms_l_db = max(rms_l_db, -96.0)
            rms_r_db = max(rms_r_db, -96.0)

            # DEBUG: Log meter values to diagnose "red line" issue
            logger.debug(f"🎚️ Master meters - Peak L: {peak_l_db:.1f} dB, Peak R: {peak_r_db:.1f} dB, RMS L: {rms_l_db:.1f} dB, RMS R: {rms_r_db:.1f} dB")

            # Send to frontend (async)
            # Frontend expects: {type: "meters", track_id: "master", peak_left, peak_right, rms_left, rms_right}
            asyncio.create_task(self.on_meter_update({
                "type": "meters",
                "track_id": "master",
                "peak_left": peak_l_db,
                "peak_right": peak_r_db,
                "rms_left": rms_l_db,
                "rms_right": rms_r_db
            }))

        except Exception as e:
            logger.error(f"❌ Error processing meter data: {e}")

