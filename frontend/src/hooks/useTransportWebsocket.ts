/**
 * Transport WebSocket Hook
 *
 * Connects to backend WebSocket for real-time transport data.
 * Provides playback position, tempo, time signature, and loop info.
 */

import { useEffect, useState, useRef } from "react";

export interface ActiveNote {
    clip_id: string;
    note: number;
}

export interface TransportData {
    type: "transport";
    is_playing: boolean;
    position_beats: number;
    position_seconds: number;
    tempo: number;
    time_signature_num: number;
    time_signature_den: number;
    loop_enabled?: boolean;
    loop_start?: number;
    loop_end?: number;
    active_notes?: ActiveNote[];
}

export function useTransportWebSocket() {
    const [transport, setTransport] = useState<TransportData>({
        type: "transport",
        is_playing: false,
        position_beats: 0,
        position_seconds: 0,
        tempo: 120,
        time_signature_num: 4,
        time_signature_den: 4,
    });
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | undefined>(undefined);
    const isCleaningUpRef = useRef(false);

    useEffect(() => {
        isCleaningUpRef.current = false;

        const connect = () => {
            if (isCleaningUpRef.current) return;

            try {
                const ws = new WebSocket("ws://localhost:8000/audio-engine/ws/transport");
                wsRef.current = ws;

                ws.onopen = () => {
                    if (!isCleaningUpRef.current) {
                        console.log("🔌 Transport WebSocket connected");
                        setIsConnected(true);
                    }
                };

                ws.onmessage = (event) => {
                    if (isCleaningUpRef.current) return;

                    try {
                        const message: TransportData = JSON.parse(event.data);
                        if (message.type === "transport") {
                            setTransport(message);
                        }
                    } catch (error) {
                        console.error("Failed to parse transport message:", error);
                    }
                };

                ws.onerror = () => {
                    if (!isCleaningUpRef.current && ws.readyState !== WebSocket.CLOSED) {
                        console.warn("⚠️ Transport WebSocket error, will retry...");
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
                    console.error("Failed to create Transport WebSocket:", error);
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

    return { transport, isConnected };
}
