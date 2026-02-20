/**
 * Transport WebSocket Hook
 *
 * Connects to backend WebSocket for real-time transport data.
 * Provides playback position, tempo, time signature, and loop info.
 */

import { useWebSocket } from "@/hooks/useWebSocket";
import type { TransportMessage } from "@/services/api/ws";

// Re-export types for backward compatibility
export type { TransportMessage as TransportData };
export type { ActiveNote } from "@/services/api/ws/types";

/**
 * Hook for transport WebSocket data
 * Refactored to use BaseWebSocketClient
 */
export function useTransportWebSocket() {
    const { data: transport, isConnected } = useWebSocket<TransportMessage>("/api/ws/transport", {
        debug: false,
    });

    // Provide default transport data if not yet received
    const transportData: TransportMessage = transport || {
        type: "transport",
        is_playing: false,
        position_beats: 0,
        position_seconds: 0,
        tempo: 120,
        time_signature_num: 4,
        time_signature_den: 4,
    };

    return { transport: transportData, isConnected };
}
