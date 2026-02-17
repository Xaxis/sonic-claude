/**
 * Waveform WebSocket Hook
 *
 * Connects to backend WebSocket for real-time waveform data.
 * Provides stereo waveform samples for visualization.
 */

import { useEffect, useState, useRef } from "react";

export interface WaveformData {
    type: "waveform";
    samples_left: number[];
    samples_right: number[];
    sample_rate: number;
}

export function useWaveformWebSocket() {
    const [waveform, setWaveform] = useState<WaveformData | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | undefined>(undefined);
    const isCleaningUpRef = useRef(false);

    useEffect(() => {
        isCleaningUpRef.current = false;

        const connect = () => {
            if (isCleaningUpRef.current) return;

            try {
                const ws = new WebSocket("ws://localhost:8000/audio-engine/ws/waveform");
                wsRef.current = ws;

                ws.onopen = () => {
                    if (!isCleaningUpRef.current) {
                        console.log("🔌 Waveform WebSocket connected");
                        setIsConnected(true);
                    }
                };

                ws.onmessage = (event) => {
                    if (isCleaningUpRef.current) return;

                    try {
                        const message: WaveformData = JSON.parse(event.data);
                        if (message.type === "waveform") {
                            setWaveform(message);
                        }
                    } catch (error) {
                        console.error("Failed to parse waveform message:", error);
                    }
                };

                ws.onerror = () => {
                    if (!isCleaningUpRef.current && ws.readyState !== WebSocket.CLOSED) {
                        console.warn("⚠️ Waveform WebSocket error, will retry...");
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
                    console.error("Failed to create Waveform WebSocket:", error);
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

    return { waveform, isConnected };
}
