"""
WebSocket Service
Manages real-time data streaming to connected clients
"""
import asyncio
import numpy as np
from typing import Set, Dict, Optional, TYPE_CHECKING
from fastapi import WebSocket
import logging

from backend.models.websocket import (
    SpectrumData,
    MeterData,
    WaveformData,
    TransportData,
    AnalyticsData
)

if TYPE_CHECKING:
    from backend.services.sequencer_service import SequencerService
    from backend.services.audio_analyzer import AudioAnalyzer

logger = logging.getLogger(__name__)


class WebSocketService:
    """Manages WebSocket connections and real-time data streaming"""

    def __init__(
        self,
        sequencer_service: Optional["SequencerService"] = None,
        audio_analyzer: Optional["AudioAnalyzer"] = None
    ):
        # Connection pools for each channel
        self.spectrum_connections: Set[WebSocket] = set()
        self.meter_connections: Set[WebSocket] = set()
        self.waveform_connections: Set[WebSocket] = set()
        self.transport_connections: Set[WebSocket] = set()
        self.analytics_connections: Set[WebSocket] = set()

        # Streaming tasks
        self._streaming_tasks: Dict[str, asyncio.Task] = {}
        self._is_running = False

        # Service dependencies
        self._sequencer_service = sequencer_service
        self._audio_analyzer = audio_analyzer

        # Sample rate
        self._sample_rate = 48000

    async def start(self):
        """Start WebSocket streaming tasks"""
        if self._is_running:
            return

        self._is_running = True

        # Start streaming tasks for each channel
        self._streaming_tasks["spectrum"] = asyncio.create_task(self._stream_spectrum())
        self._streaming_tasks["meters"] = asyncio.create_task(self._stream_meters())
        self._streaming_tasks["waveform"] = asyncio.create_task(self._stream_waveform())
        self._streaming_tasks["transport"] = asyncio.create_task(self._stream_transport())
        self._streaming_tasks["analytics"] = asyncio.create_task(self._stream_analytics())

        logger.info("🔌 WebSocket streaming started")

    async def stop(self):
        """Stop all streaming tasks"""
        self._is_running = False

        for task in self._streaming_tasks.values():
            task.cancel()

        await asyncio.gather(*self._streaming_tasks.values(), return_exceptions=True)
        self._streaming_tasks.clear()

        logger.info("🔌 WebSocket streaming stopped")

    # Connection management
    async def connect_spectrum(self, websocket: WebSocket):
        """Add spectrum WebSocket connection"""
        await websocket.accept()
        self.spectrum_connections.add(websocket)
        logger.info(f"Spectrum client connected ({len(self.spectrum_connections)} total)")

    async def disconnect_spectrum(self, websocket: WebSocket):
        """Remove spectrum WebSocket connection"""
        self.spectrum_connections.discard(websocket)
        logger.info(f"Spectrum client disconnected ({len(self.spectrum_connections)} remaining)")

    async def connect_meters(self, websocket: WebSocket):
        """Add meters WebSocket connection"""
        await websocket.accept()
        self.meter_connections.add(websocket)
        logger.info(f"Meters client connected ({len(self.meter_connections)} total)")

    async def disconnect_meters(self, websocket: WebSocket):
        """Remove meters WebSocket connection"""
        self.meter_connections.discard(websocket)
        logger.info(f"Meters client disconnected ({len(self.meter_connections)} remaining)")

    async def connect_waveform(self, websocket: WebSocket):
        """Add waveform WebSocket connection"""
        await websocket.accept()
        self.waveform_connections.add(websocket)
        logger.info(f"Waveform client connected ({len(self.waveform_connections)} total)")

    async def disconnect_waveform(self, websocket: WebSocket):
        """Remove waveform WebSocket connection"""
        self.waveform_connections.discard(websocket)
        logger.info(f"Waveform client disconnected ({len(self.waveform_connections)} remaining)")

    async def connect_transport(self, websocket: WebSocket):
        """Add transport WebSocket connection"""
        await websocket.accept()
        self.transport_connections.add(websocket)
        logger.info(f"Transport client connected ({len(self.transport_connections)} total)")

    async def disconnect_transport(self, websocket: WebSocket):
        """Remove transport WebSocket connection"""
        self.transport_connections.discard(websocket)
        logger.info(f"Transport client disconnected ({len(self.transport_connections)} remaining)")

    async def connect_analytics(self, websocket: WebSocket):
        """Add analytics WebSocket connection"""
        await websocket.accept()
        self.analytics_connections.add(websocket)
        logger.info(f"Analytics client connected ({len(self.analytics_connections)} total)")

    async def disconnect_analytics(self, websocket: WebSocket):
        """Remove analytics WebSocket connection"""
        self.analytics_connections.discard(websocket)
        logger.info(f"Analytics client disconnected ({len(self.analytics_connections)} remaining)")

    # Streaming tasks
    async def _stream_spectrum(self):
        """Stream frequency spectrum data at 60 FPS"""
        first_broadcast = True
        while self._is_running:
            try:
                if self.spectrum_connections:
                    # Generate spectrum data (placeholder - will integrate with audio engine)
                    data = self._generate_spectrum_data()

                    # Debug: Log first broadcast
                    if first_broadcast:
                        logger.info(f"🔊 First spectrum broadcast: {len(self.spectrum_connections)} connections")
                        logger.info(f"   Spectrum data: {len(data.magnitudes)} bins, range: [{min(data.magnitudes):.2f}, {max(data.magnitudes):.2f}] dB")
                        first_broadcast = False

                    await self._broadcast(self.spectrum_connections, data)

                await asyncio.sleep(1/60)  # 60 FPS
            except Exception as e:
                logger.error(f"Error streaming spectrum: {e}")
                await asyncio.sleep(0.1)



    async def _stream_meters(self):
        """Stream metering data at 30 FPS"""
        while self._is_running:
            try:
                if self.meter_connections:
                    # Generate meter data (placeholder)
                    data = self._generate_meter_data()
                    await self._broadcast(self.meter_connections, data)

                await asyncio.sleep(1/30)  # 30 FPS
            except Exception as e:
                logger.error(f"Error streaming meters: {e}")
                await asyncio.sleep(0.1)

    async def _stream_waveform(self):
        """Stream waveform data at 30 FPS"""
        first_broadcast = True
        while self._is_running:
            try:
                if self.waveform_connections:
                    # Generate waveform data (placeholder)
                    data = self._generate_waveform_data()

                    # Debug: Log first broadcast
                    if first_broadcast:
                        logger.info(f"📊 First waveform broadcast: {len(self.waveform_connections)} connections")
                        logger.info(f"   Waveform data: {len(data.samples_left)} samples")
                        first_broadcast = False

                    await self._broadcast(self.waveform_connections, data)

                await asyncio.sleep(1/30)  # 30 FPS
            except Exception as e:
                logger.error(f"Error streaming waveform: {e}")
                await asyncio.sleep(0.1)

    async def _stream_transport(self):
        """Stream transport position at 60 FPS"""
        while self._is_running:
            try:
                if self.transport_connections:
                    # Generate transport data (placeholder)
                    data = self._generate_transport_data()
                    await self._broadcast(self.transport_connections, data)

                await asyncio.sleep(1/60)  # 60 FPS
            except Exception as e:
                logger.error(f"Error streaming transport: {e}")
                await asyncio.sleep(0.1)

    async def _stream_analytics(self):
        """Stream analytics data at 10 FPS"""
        while self._is_running:
            try:
                if self.analytics_connections:
                    # Generate analytics data (placeholder)
                    data = self._generate_analytics_data()
                    await self._broadcast(self.analytics_connections, data)

                await asyncio.sleep(1/10)  # 10 FPS
            except Exception as e:
                logger.error(f"Error streaming analytics: {e}")
                await asyncio.sleep(0.1)

    # Data generation (using real audio analyzer)
    def _generate_spectrum_data(self) -> SpectrumData:
        """
        Generate spectrum data from audio analyzer

        Returns raw dB values - frontend handles visualization normalization
        """
        # Debug: Log analyzer status once
        if not hasattr(self, '_analyzer_status_logged'):
            logger.info(f"🔍 Audio analyzer status: exists={self._audio_analyzer is not None}, running={self._audio_analyzer.is_running if self._audio_analyzer else False}")
            self._analyzer_status_logged = True

        if self._audio_analyzer and self._audio_analyzer.is_running:
            # Get real FFT data from audio analyzer
            frequencies, magnitudes_db = self._audio_analyzer.get_frequency_spectrum(num_bins=512)

            return SpectrumData(
                frequencies=frequencies.tolist(),
                magnitudes=magnitudes_db.tolist(),  # Send raw dB values
                sample_rate=self._sample_rate,
                fft_size=2048
            )
        else:
            # Fallback: Return silence spectrum when no audio analyzer
            if not hasattr(self, '_fallback_logged'):
                logger.warning("⚠️  Using fallback silence spectrum (audio analyzer not running)")
                self._fallback_logged = True

            num_bins = 512
            frequencies = np.linspace(20, 20000, num_bins).tolist()
            magnitudes = [-96.0] * num_bins  # Silence = -96 dB

            return SpectrumData(
                frequencies=frequencies,
                magnitudes=magnitudes,
                sample_rate=self._sample_rate,
                fft_size=1024
            )

    def _generate_meter_data(self) -> MeterData:
        """Generate metering data"""
        if self._audio_analyzer and self._audio_analyzer.is_running:
            # Get real peak/RMS levels from audio analyzer
            peak_left, peak_right, rms_left, rms_right = self._audio_analyzer.get_peak_levels()

            return MeterData(
                track_id="master",
                peak_left=float(peak_left),
                peak_right=float(peak_right),
                rms_left=float(rms_left),
                rms_right=float(rms_right)
            )
        else:
            # Fallback: Return silence when no audio analyzer
            return MeterData(
                track_id="master",
                peak_left=-200.0,
                peak_right=-200.0,
                rms_left=-200.0,
                rms_right=-200.0
            )

    def _generate_waveform_data(self) -> WaveformData:
        """Generate waveform data"""
        if self._audio_analyzer and self._audio_analyzer.is_running:
            # Get real waveform from audio analyzer
            left, right = self._audio_analyzer.get_waveform(num_samples=1024)

            return WaveformData(
                samples_left=left.tolist(),
                samples_right=right.tolist(),
                sample_rate=self._sample_rate,
                duration=len(left) / self._sample_rate
            )
        else:
            # Fallback: Random waveform if analyzer not available
            num_samples = 1024
            samples_left = (np.random.randn(num_samples) * 0.5).tolist()
            samples_right = (np.random.randn(num_samples) * 0.5).tolist()

            return WaveformData(
                samples_left=samples_left,
                samples_right=samples_right,
                sample_rate=self._sample_rate,
                duration=num_samples / self._sample_rate
            )

    def _generate_transport_data(self) -> TransportData:
        """Generate transport position data from SequencerService"""
        if self._sequencer_service is None:
            # Fallback to placeholder if sequencer not available
            return TransportData(
                is_playing=False,
                position_beats=0.0,
                position_seconds=0.0,
                tempo=120.0,
                time_signature_num=4,
                time_signature_den=4,
                loop_enabled=False
            )

        # Get real data from sequencer
        state = self._sequencer_service.get_playback_state()
        position_seconds = (state["playhead_position"] / state["tempo"]) * 60.0

        return TransportData(
            is_playing=state["is_playing"],
            position_beats=state["playhead_position"],
            position_seconds=position_seconds,
            tempo=state["tempo"],
            time_signature_num=4,  # TODO: Get from sequence
            time_signature_den=4,  # TODO: Get from sequence
            loop_enabled=False  # TODO: Get from sequence
        )

    def _generate_analytics_data(self) -> AnalyticsData:
        """Generate musical analytics data"""
        # Placeholder: Random analytics
        return AnalyticsData(
            energy=float(np.random.rand()),
            brightness=float(np.random.rand()),
            rhythm=float(np.random.rand()),
            dominant_frequency=float(np.random.rand() * 1000 + 100),
            spectral_centroid=float(np.random.rand() * 2000 + 500),
            spectral_rolloff=float(np.random.rand() * 5000 + 1000),
            zero_crossing_rate=float(np.random.rand() * 0.5)
        )

    async def _broadcast(self, connections: Set[WebSocket], data):
        """Broadcast data to all connections in a set"""
        if not connections:
            return

        # Convert Pydantic model to JSON
        message = data.model_dump_json()

        # Send to all connections, remove dead ones
        dead_connections = set()
        for websocket in connections:
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send to client: {e}")
                dead_connections.add(websocket)

        # Clean up dead connections
        connections.difference_update(dead_connections)
