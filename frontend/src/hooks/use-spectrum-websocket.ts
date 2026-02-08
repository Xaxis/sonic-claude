import { useEffect, useState, useRef } from "react";

interface SpectrumData {
    type: "spectrum";
    data: number[];
}

export function useSpectrumWebSocket() {
    const [spectrum, setSpectrum] = useState<number[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const isCleaningUpRef = useRef(false);

    useEffect(() => {
        isCleaningUpRef.current = false;

        const connect = () => {
            // Don't reconnect if we're cleaning up
            if (isCleaningUpRef.current) return;

            try {
                const ws = new WebSocket("ws://localhost:8000/ws/spectrum");
                wsRef.current = ws;

                ws.onopen = () => {
                    if (!isCleaningUpRef.current) {
                        console.log("🔌 WebSocket connected");
                        setIsConnected(true);
                    }
                };

                ws.onmessage = (event) => {
                    if (isCleaningUpRef.current) return;

                    try {
                        const message: SpectrumData = JSON.parse(event.data);
                        if (message.type === "spectrum" && Array.isArray(message.data)) {
                            setSpectrum(message.data);
                        }
                    } catch (error) {
                        console.error("Failed to parse WebSocket message:", error);
                    }
                };

                ws.onerror = () => {
                    // Only log if not cleaning up (avoids React StrictMode double-mount errors)
                    if (!isCleaningUpRef.current && ws.readyState !== WebSocket.CLOSED) {
                        console.warn("⚠️ WebSocket connection error, will retry...");
                    }
                    setIsConnected(false);
                };

                ws.onclose = () => {
                    if (isCleaningUpRef.current) return;

                    setIsConnected(false);

                    // Attempt to reconnect after 2 seconds
                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (!isCleaningUpRef.current) {
                            connect();
                        }
                    }, 2000);
                };
            } catch (error) {
                if (!isCleaningUpRef.current) {
                    console.error("Failed to create WebSocket:", error);
                }
                setIsConnected(false);
            }
        };

        connect();

        // Cleanup on unmount
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

    return { spectrum, isConnected };
}
