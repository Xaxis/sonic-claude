"""
Audio Analyzer Service
Captures audio from SuperCollider and performs real-time analysis (FFT, waveform extraction)
"""
import asyncio
import numpy as np
import logging
from typing import Optional, Tuple
from collections import deque
from pythonosc import udp_client, osc_server, dispatcher
import threading

logger = logging.getLogger(__name__)


class AudioAnalyzer:
    """
    Real-time audio analyzer
    Captures audio from SuperCollider master bus and performs FFT/waveform analysis
    """

    def __init__(
        self,
        sc_host: str = "127.0.0.1",
        sc_port: int = 57110,
        listen_port: int = 57121,  # Changed from 57120 to 57121 (sclang relay forwards to this port)
        sample_rate: int = 48000,
        buffer_size: int = 2048
    ):
        """
        Initialize audio analyzer

        Args:
            sc_host: SuperCollider server host
            sc_port: SuperCollider server port (for sending commands)
            listen_port: Port to listen for audio data from sclang relay (57121)
            sample_rate: Audio sample rate
            buffer_size: Size of audio buffer for analysis
        """
        self.sc_host = sc_host
        self.sc_port = sc_port
        self.listen_port = listen_port
        self.sample_rate = sample_rate
        self.buffer_size = buffer_size

        # OSC client for sending commands to SC
        self.osc_client: Optional[udp_client.SimpleUDPClient] = None

        # OSC server for receiving audio data from SC
        self.osc_server: Optional[osc_server.ThreadingOSCUDPServer] = None
        self.osc_thread: Optional[threading.Thread] = None

        # Audio buffers (stereo)
        self.audio_buffer_left = deque(maxlen=buffer_size)
        self.audio_buffer_right = deque(maxlen=buffer_size)

        # Lock for thread-safe buffer access
        self._buffer_lock = threading.Lock()

        # Running state
        self.is_running = False

        # Monitoring synth node ID (for SuperCollider audioMonitor synth)
        self._monitor_synth_id: Optional[int] = 1000  # Fixed ID for monitoring synth

    async def start(self):
        """Start audio capture and analysis"""
        if self.is_running:
            return

        try:
            logger.info(f"🎤 Starting audio analyzer (listening on port {self.listen_port})")

            # Create OSC client for sending commands to SuperCollider
            self.osc_client = udp_client.SimpleUDPClient(self.sc_host, self.sc_port)

            # Create OSC server for receiving audio data from SuperCollider
            disp = dispatcher.Dispatcher()
            disp.map("/audio_monitor", self._handle_audio_data)
            disp.map("/peak_monitor", self._handle_peak_data)

            self.osc_server = osc_server.ThreadingOSCUDPServer(
                ("0.0.0.0", self.listen_port),
                disp
            )

            # Start OSC server in background thread
            self.osc_thread = threading.Thread(target=self.osc_server.serve_forever, daemon=True)
            self.osc_thread.start()
            logger.info(f"🎧 OSC server started on port {self.listen_port}")

            # Create monitoring synth in SuperCollider
            logger.info("🎤 Creating audioMonitor synth in SuperCollider...")
            await self._create_monitor_synth()

            self.is_running = True
            logger.info("✅ Audio analyzer started successfully (monitoring SC master bus)")

        except Exception as e:
            logger.error(f"❌ Failed to start audio analyzer: {e}")
            raise

    async def stop(self):
        """Stop audio capture and analysis"""
        if not self.is_running:
            return

        try:
            logger.info("🛑 Stopping audio analyzer")

            # Free monitoring synth in SuperCollider
            if self._monitor_synth_id is not None:
                await self._free_monitor_synth()

            # Stop OSC server
            if self.osc_server:
                self.osc_server.shutdown()
                self.osc_server = None

            if self.osc_thread:
                self.osc_thread.join(timeout=1.0)
                self.osc_thread = None

            self.is_running = False
            logger.info("✅ Audio analyzer stopped")

        except Exception as e:
            logger.error(f"❌ Error stopping audio analyzer: {e}")

    async def _create_monitor_synth(self):
        """
        Create a monitoring synth in SuperCollider that taps the master output bus

        This creates an instance of the \audioMonitor SynthDef which:
        1. Reads from the master output bus (bus 0)
        2. Sends stereo audio samples to Python via OSC at 60 Hz
        3. Passes the signal through unchanged (non-destructive monitoring)
        """
        try:
            if not self.osc_client:
                logger.error("OSC client not initialized")
                return

            # Create the audioMonitor synth at the END of the node tree
            # This ensures it monitors the final mixed output
            # Format: /s_new [synthdef_name, node_id, add_action, target_id, ...params]
            # add_action: 1 = addToTail (add at end of default group)
            self.osc_client.send_message(
                "/s_new",
                [
                    "audioMonitor",      # SynthDef name
                    self._monitor_synth_id,  # Node ID (1000)
                    1,                   # addToTail (monitor after all other synths)
                    0,                   # Target group (0 = root group, always exists)
                    "targetBus", 0,      # Monitor bus 0 (master output)
                    "sendRate", 60,      # Send data 60 times per second
                    "bufferSize", 512    # Send 512 samples per message
                ]
            )

            logger.info(f"✅ Created audioMonitor synth (ID: {self._monitor_synth_id}) on master bus")

        except Exception as e:
            logger.error(f"❌ Failed to create monitor synth: {e}")

    async def _free_monitor_synth(self):
        """Free the monitoring synth in SuperCollider"""
        try:
            if not self.osc_client or self._monitor_synth_id is None:
                return

            # Send OSC message to free the synth
            # Format: /n_free [node_id]
            self.osc_client.send_message("/n_free", [self._monitor_synth_id])

            logger.info(f"✅ Freed audioMonitor synth (ID: {self._monitor_synth_id})")

        except Exception as e:
            logger.error(f"❌ Failed to free monitor synth: {e}")

    def _handle_audio_data(self, address: str, *args):
        """
        Handle incoming audio data from SuperCollider via OSC

        Expected OSC message format from SuperCollider's SendReply:
        /audio_monitor [node_id, reply_id, left_sample, right_sample]

        SuperCollider's SendReply sends one value per channel per trigger.
        We accumulate these samples into our audio buffers for FFT analysis.
        """
        try:
            # Debug: Log first message received
            if not hasattr(self, '_first_data_logged'):
                logger.info(f"🎤 First audio data received from SuperCollider: {len(args)} args")
                logger.info(f"   Args: {args}")
                self._first_data_logged = True

            if len(args) < 4:
                logger.warning(f"⚠️  Received audio data with insufficient args: {len(args)}")
                return

            # Parse OSC message
            # args[0] = node_id (1000)
            # args[1] = reply_id (1000)
            # args[2] = left channel sample
            # args[3] = right channel sample

            left_sample = float(args[2])
            right_sample = float(args[3])

            # Add samples to buffers (thread-safe)
            with self._buffer_lock:
                self.audio_buffer_left.append(left_sample)
                self.audio_buffer_right.append(right_sample)

        except Exception as e:
            logger.error(f"❌ Error handling audio data: {e}")

    def _handle_peak_data(self, address: str, *args):
        """
        Handle incoming peak/RMS level data from SuperCollider via OSC

        Expected OSC message format:
        /peak_monitor [node_id, reply_id, peakLeft, peakRight, rmsLeft, rmsRight]
        """
        try:
            if len(args) < 6:
                return

            # Parse peak/RMS levels
            # args[0] = node_id
            # args[1] = reply_id
            # args[2] = peakLeft
            # args[3] = peakRight
            # args[4] = rmsLeft
            # args[5] = rmsRight

            # Store for metering (could be used by WebSocket service)
            # For now, we just log occasionally
            pass

        except Exception as e:
            logger.error(f"❌ Error handling peak data: {e}")

    def get_audio_buffer(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        Get current audio buffer (stereo)

        Returns:
            Tuple of (left_channel, right_channel) as numpy arrays
        """
        with self._buffer_lock:
            left = np.array(list(self.audio_buffer_left), dtype=np.float32)
            right = np.array(list(self.audio_buffer_right), dtype=np.float32)

            # If buffer is empty, return zeros
            if len(left) == 0:
                left = np.zeros(self.buffer_size, dtype=np.float32)
                right = np.zeros(self.buffer_size, dtype=np.float32)

            return left, right

    def get_frequency_spectrum(self, num_bins: int = 512) -> Tuple[np.ndarray, np.ndarray]:
        """
        Perform FFT analysis on current audio buffer

        Args:
            num_bins: Number of frequency bins to return

        Returns:
            Tuple of (frequencies, magnitudes_db)
        """
        left, right = self.get_audio_buffer()

        # Mix to mono for spectrum analysis
        mono = (left + right) / 2.0

        # Apply Hann window to reduce spectral leakage
        window = np.hanning(len(mono))
        windowed = mono * window

        # Perform FFT
        fft_result = np.fft.rfft(windowed)

        # Calculate magnitude in dB
        magnitude = np.abs(fft_result)
        magnitude_db = 20 * np.log10(magnitude + 1e-10)  # Add small value to avoid log(0)

        # Generate frequency bins
        frequencies = np.fft.rfftfreq(len(mono), 1.0 / self.sample_rate)

        # Downsample to requested number of bins
        if len(frequencies) > num_bins:
            # Use logarithmic spacing for better frequency resolution
            indices = np.logspace(0, np.log10(len(frequencies) - 1), num_bins, dtype=int)
            frequencies = frequencies[indices]
            magnitude_db = magnitude_db[indices]

        return frequencies, magnitude_db

    def get_waveform(self, num_samples: int = 1024) -> Tuple[np.ndarray, np.ndarray]:
        """
        Get waveform data (downsampled for visualization)

        Args:
            num_samples: Number of samples to return

        Returns:
            Tuple of (left_channel, right_channel) downsampled arrays
        """
        left, right = self.get_audio_buffer()

        # Downsample if needed
        if len(left) > num_samples:
            # Simple decimation (could use better resampling)
            step = len(left) // num_samples
            left = left[::step][:num_samples]
            right = right[::step][:num_samples]
        elif len(left) < num_samples:
            # Pad with zeros if buffer is smaller
            left = np.pad(left, (0, num_samples - len(left)))
            right = np.pad(right, (0, num_samples - len(right)))

        return left, right

    def get_peak_levels(self) -> Tuple[float, float, float, float]:
        """
        Get peak and RMS levels for metering

        Returns:
            Tuple of (peak_left, peak_right, rms_left, rms_right) in dB
        """
        left, right = self.get_audio_buffer()

        if len(left) == 0:
            return -96.0, -96.0, -96.0, -96.0

        # Calculate peak levels
        peak_left = np.max(np.abs(left))
        peak_right = np.max(np.abs(right))

        # Calculate RMS levels
        rms_left = np.sqrt(np.mean(left ** 2))
        rms_right = np.sqrt(np.mean(right ** 2))

        # Convert to dB
        peak_left_db = 20 * np.log10(peak_left + 1e-10)
        peak_right_db = 20 * np.log10(peak_right + 1e-10)
        rms_left_db = 20 * np.log10(rms_left + 1e-10)
        rms_right_db = 20 * np.log10(rms_right + 1e-10)

        return peak_left_db, peak_right_db, rms_left_db, rms_right_db
