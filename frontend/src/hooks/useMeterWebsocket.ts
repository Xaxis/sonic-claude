/**
 * Meter WebSocket Hook
 *
 * Connects to backend WebSocket for real-time audio metering data.
 * Provides peak and RMS levels for all tracks.
 */

import { useState } from "react";
import { useWebSocketWithHandler } from "@/hooks/useWebSocket";
import type { MeterMessage } from "@/services/api/ws";

// Re-export type for backward compatibility
export type { MeterMessage as MeterData };

export interface TrackMeters {
    [trackId: string]: {
        peakLeft: number;
        peakRight: number;
        rmsLeft: number;
        rmsRight: number;
    };
}

/**
 * Hook for meter WebSocket data
 * Refactored to use BaseWebSocketClient
 * Accumulates meter data by track_id
 */
export function useMeterWebSocket() {
    const [meters, setMeters] = useState<TrackMeters>({});

    const { isConnected } = useWebSocketWithHandler<MeterMessage>(
        "/api/ws/meters",
        (message) => {
            if (message.type === "meters") {
                setMeters((prev) => ({
                    ...prev,
                    [message.track_id]: {
                        peakLeft: message.peak_left,
                        peakRight: message.peak_right,
                        rmsLeft: message.rms_left,
                        rmsRight: message.rms_right,
                    },
                }));
            }
        },
        { debug: false }
    );

    return { meters, isConnected };
}
