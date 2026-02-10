/**
 * Analytics WebSocket Hook
 *
 * Connects to backend WebSocket for real-time analytics data.
 * Provides system performance metrics and audio engine stats.
 */

import { useEffect, useState, useRef } from "react";

export interface AnalyticsData {
    type: "analytics";
    cpu_usage: number;
    memory_usage: number;
    active_synths: number;
    active_effects: number;
    active_tracks: number;
    sample_rate: number;
    buffer_size: number;
    latency_ms: number;
}

export function useAnalyticsWebSocket() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | undefined>(undefined);
    const isCleaningUpRef = useRef(false);

    useEffect(() => {
        isCleaningUpRef.current = false;

        const connect = () => {
            if (isCleaningUpRef.current) return;

            try {
                const ws = new WebSocket("ws://localhost:8000/ws/analytics");
                wsRef.current = ws;

                ws.onopen = () => {
                    if (!isCleaningUpRef.current) {
                        console.log("🔌 Analytics WebSocket connected");
                        setIsConnected(true);
                    }
                };

                ws.onmessage = (event) => {
                    if (isCleaningUpRef.current) return;

                    try {
                        const message: AnalyticsData = JSON.parse(event.data);
                        if (message.type === "analytics") {
                            setAnalytics(message);
                        }
                    } catch (error) {
                        console.error("Failed to parse analytics message:", error);
                    }
                };

                ws.onerror = () => {
                    if (!isCleaningUpRef.current && ws.readyState !== WebSocket.CLOSED) {
                        console.warn("⚠️ Analytics WebSocket error, will retry...");
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
                    console.error("Failed to create Analytics WebSocket:", error);
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

    return { analytics, isConnected };
}
