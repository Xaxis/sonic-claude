/**
 * Waveform WebSocket Hook
 *
 * Connects to backend WebSocket for real-time waveform data.
 * Provides stereo waveform samples for visualization.
 */

import { useWebSocket } from "@/hooks/useWebSocket";
import type { WaveformMessage } from "@/services/api/ws";

// Re-export type for backward compatibility
export type { WaveformMessage as WaveformData };

/**
 * Hook for waveform WebSocket data
 * Refactored to use BaseWebSocketClient
 */
export function useWaveformWebSocket() {
    const { data: waveform, isConnected } = useWebSocket<WaveformMessage>("/api/ws/waveform", {
        debug: false,
    });

    return { waveform: waveform || null, isConnected };
}
