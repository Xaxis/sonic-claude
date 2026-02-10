"""
Audio Input Service - Handles audio input monitoring from microphone/line-in

This service:
1. Starts/stops audio input monitoring synth in SuperCollider
2. Processes input audio data (waveform, spectrum, meters)
3. Broadcasts data to frontend via WebSocket
"""
import logging
import asyncio
import numpy as np
from typing import Optional, Callable

logger = logging.getLogger(__name__)


class AudioInputService:
    """
    Manages audio input monitoring from microphone/line-in
    """

    def __init__(self, engine_manager):
        self.engine_manager = engine_manager
        self.is_monitoring = False
        self.monitor_synth_id: Optional[int] = None
        self.waveform_buffer_id: Optional[int] = None
        self.spectrum_buffer_id: Optional[int] = None

        # Callbacks for sending data to frontend
        self.on_waveform_update: Optional[Callable] = None
        self.on_spectrum_update: Optional[Callable] = None
        self.on_meter_update: Optional[Callable] = None

        # Register callbacks with engine manager
        engine_manager.on_input_waveform_data = self._handle_waveform_data
        engine_manager.on_input_spectrum_data = self._handle_spectrum_data
        engine_manager.on_input_meter_data = self._handle_meter_data

    async def start_monitoring(
        self,
        waveform_buffer_id: int,
        spectrum_buffer_id: int,
        input_channel: int = 0
    ):
        """Start audio input monitoring"""
        if self.is_monitoring:
            logger.warning("⚠️ Audio input monitoring already running")
            return

        try:
            logger.info("🎤 Starting audio input monitoring...")

            self.waveform_buffer_id = waveform_buffer_id
            self.spectrum_buffer_id = spectrum_buffer_id

            # Create audioInputMonitor synth
            # Node ID: 1001 (reserved for system)
            # Target: 0 (root group)
            # Add action: 1 (addToTail)
            self.monitor_synth_id = 1001

            self.engine_manager.send_message(
                "/s_new",
                "audioInputMonitor",  # SynthDef name
                self.monitor_synth_id,  # Node ID
                1,  # Add action: addToTail
                0,  # Target: root group
                "inputChannel", input_channel,  # Input channel (0 = first input)
                "waveformBuf", waveform_buffer_id,
                "spectrumBuf", spectrum_buffer_id,
                "sendRate", 60  # 60 Hz update rate
            )

            self.is_monitoring = True
            logger.info(f"✅ Audio input monitoring started (synth ID: {self.monitor_synth_id})")
            logger.info(f"   Input channel: {input_channel}")
            logger.info(f"   Waveform buffer: {waveform_buffer_id}")
            logger.info(f"   Spectrum buffer: {spectrum_buffer_id}")

        except Exception as e:
            logger.error(f"❌ Failed to start audio input monitoring: {e}")
            raise

    async def stop_monitoring(self):
        """Stop audio input monitoring"""
        if not self.is_monitoring:
            return

        try:
            if self.monitor_synth_id:
                self.engine_manager.send_message("/n_free", self.monitor_synth_id)

            self.is_monitoring = False
            self.monitor_synth_id = None
            logger.info("🛑 Audio input monitoring stopped")

        except Exception as e:
            logger.error(f"❌ Failed to stop audio input monitoring: {e}")

    def _handle_waveform_data(self, samples: list):
        """Handle input waveform data from sclang"""
        if not self.on_waveform_update or not self.on_spectrum_update:
            return

        try:
            # Convert to numpy array
            waveform = np.array(samples, dtype=np.float32)

            # Send waveform to frontend (async)
            # Frontend expects: {type: "input_waveform", samples_left: [], samples_right: []}
            samples_list = waveform.tolist()
            asyncio.create_task(self.on_waveform_update({
                "type": "input_waveform",
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
            # Frontend expects: {type: "input_spectrum", magnitudes: []}
            asyncio.create_task(self.on_spectrum_update({
                "type": "input_spectrum",
                "magnitudes": magnitudes_db.tolist()
            }))

        except Exception as e:
            logger.error(f"❌ Error processing input waveform data: {e}")

    def _handle_spectrum_data(self, bins: list):
        """Handle input spectrum data from sclang (NOT USED - we compute FFT from waveform)"""
        pass



    def _handle_meter_data(self, meter_data: dict):
        """Handle input meter data from sclang"""
        if not self.on_meter_update:
            return

        try:
            # Convert to dB
            peak_l_db = 20 * np.log10(max(meter_data["peakL"], 1e-10))
            peak_r_db = 20 * np.log10(max(meter_data["peakR"], 1e-10))
            rms_l_db = 20 * np.log10(max(meter_data["rmsL"], 1e-10))
            rms_r_db = 20 * np.log10(max(meter_data["rmsR"], 1e-10))

            # Send to frontend (async)
            # Frontend expects: {type: "input_meters", track_id: "input", peak_left, peak_right, rms_left, rms_right}
            asyncio.create_task(self.on_meter_update({
                "type": "input_meters",
                "track_id": "input",
                "peak_left": peak_l_db,
                "peak_right": peak_r_db,
                "rms_left": rms_l_db,
                "rms_right": rms_r_db
            }))

        except Exception as e:
            logger.error(f"❌ Error processing input meter data: {e}")