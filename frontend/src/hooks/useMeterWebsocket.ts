/**
 * Meter WebSocket Hook
 *
 * Connects to backend WebSocket for real-time audio metering data.
 * Provides peak and RMS levels for all tracks.
 */

import { useEffect, useState, useRef } from "react";
import { wsURLs } from "@/config/api.config";

export interface MeterData {
    type: "meters";
    track_id: string;
    peak_left: number;
    peak_right: number;
    rms_left: number;
    rms_right: number;
}

export interface TrackMeters {
    [trackId: string]: {
        peakLeft: number;
        peakRight: number;
        rmsLeft: number;
        rmsRight: number;
    };
}

export function useMeterWebSocket() {
    const [meters, setMeters] = useState<TrackMeters>({});
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | undefined>(undefined);
    const isCleaningUpRef = useRef(false);

    useEffect(() => {
        isCleaningUpRef.current = false;

        const connect = () => {
            if (isCleaningUpRef.current) return;

            try {
                const ws = new WebSocket(wsURLs.meters);
                wsRef.current = ws;

                ws.onopen = () => {
                    if (!isCleaningUpRef.current) {
                        console.log("🔌 Meter WebSocket connected");
                        setIsConnected(true);
                    }
                };

                ws.onmessage = (event) => {
                    if (isCleaningUpRef.current) return;

                    try {
                        const message: MeterData = JSON.parse(event.data);
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
                    } catch (error) {
                        console.error("Failed to parse meter message:", error);
                    }
                };

                ws.onerror = () => {
                    if (!isCleaningUpRef.current && ws.readyState !== WebSocket.CLOSED) {
                        console.warn("⚠️ Meter WebSocket error, will retry...");
                    }
                    setIsConnected(false);
                };

                ws.onclose = () => {
                    if (isCleaningUpRef.current) return;

                    setIsConnected(false);

                    reconnectTimeoutRef.current = window.setTimeout(() => {
                        if (!isCleaningUpRef.current) {
                            connect();
                        }
                    }, 2000);
                };
            } catch (error) {
                if (!isCleaningUpRef.current) {
                    console.error("Failed to create Meter WebSocket:", error);
                }
                setIsConnected(false);
            }
        };

        connect();

        return () => {
            isCleaningUpRef.current = true;

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    return { meters, isConnected };
}
