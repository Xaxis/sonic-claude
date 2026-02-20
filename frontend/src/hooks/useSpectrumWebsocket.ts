/**
 * Spectrum WebSocket Hook
 *
 * Connects to backend WebSocket for real-time spectrum data.
 * Provides FFT spectrum analysis for visualization.
 */

import { useState } from "react";
import { useWebSocketWithHandler } from "@/hooks/useWebSocket";
import type { SpectrumMessage } from "@/services/api/ws";

// Re-export type for backward compatibility
export type { SpectrumMessage as SpectrumData };

/**
 * Hook for spectrum WebSocket data
 * Refactored to use BaseWebSocketClient
 */
export function useSpectrumWebSocket() {
    const [spectrum, setSpectrum] = useState<number[]>([]);

    const { isConnected } = useWebSocketWithHandler<SpectrumMessage>(
        "/api/ws/spectrum",
        (message) => {
            if (message.type === "spectrum" && Array.isArray(message.magnitudes)) {
                setSpectrum(message.magnitudes);
            }
        },
        { debug: false }
    );

    return { spectrum, isConnected };
}
