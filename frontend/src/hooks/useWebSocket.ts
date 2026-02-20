/**
 * useWebSocket Hook
 * Generic React hook for WebSocket connections
 * 
 * Features:
 * - Automatic connection management
 * - Type-safe message handling
 * - Connection state tracking
 * - Automatic cleanup on unmount
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { WebSocketManager } from "@/services/api/ws/manager";
import { WebSocketState } from "@/services/api/ws/base";
import type { MessageHandler, WebSocketOptions } from "@/services/api/ws/base";

/**
 * Hook return type
 */
export interface UseWebSocketReturn<T> {
    /** Latest message received */
    data: T | null;
    /** Connection state */
    state: WebSocketState;
    /** Whether connected */
    isConnected: boolean;
    /** Send a message */
    send: (data: any) => void;
    /** Manually reconnect */
    reconnect: () => void;
    /** Manually disconnect */
    disconnect: () => void;
}

/**
 * Generic WebSocket hook
 * 
 * @param endpoint - WebSocket endpoint (e.g., "/api/ws/transport")
 * @param options - WebSocket options
 * @returns WebSocket state and controls
 * 
 * @example
 * ```tsx
 * const { data, isConnected } = useWebSocket<TransportMessage>("/api/ws/transport");
 * ```
 */
export function useWebSocket<T = any>(
    endpoint: string,
    options?: WebSocketOptions
): UseWebSocketReturn<T> {
    const [data, setData] = useState<T | null>(null);
    const [state, setState] = useState<WebSocketState>(WebSocketState.DISCONNECTED);
    const connectionRef = useRef(WebSocketManager.getConnection<T>(endpoint, options));

    useEffect(() => {
        const connection = connectionRef.current;

        // Subscribe to messages
        const unsubscribeMessage = connection.onMessage((message: T) => {
            setData(message);
        });

        // Subscribe to state changes
        const unsubscribeState = connection.onStateChange((newState) => {
            setState(newState);
        });

        // Set initial state
        setState(connection.getState());

        // Cleanup on unmount
        return () => {
            unsubscribeMessage();
            unsubscribeState();
        };
    }, [endpoint]);

    const send = useCallback((data: any) => {
        connectionRef.current.send(data);
    }, []);

    const reconnect = useCallback(() => {
        connectionRef.current.connect();
    }, []);

    const disconnect = useCallback(() => {
        WebSocketManager.disconnect(endpoint);
    }, [endpoint]);

    return {
        data,
        state,
        isConnected: state === WebSocketState.CONNECTED,
        send,
        reconnect,
        disconnect,
    };
}

/**
 * Hook with custom message handler
 * Use this when you need to process messages differently than just storing the latest
 * 
 * @example
 * ```tsx
 * useWebSocketWithHandler<MeterMessage>("/api/ws/meters", (message) => {
 *   setMeters(prev => ({ ...prev, [message.track_id]: message }));
 * });
 * ```
 */
export function useWebSocketWithHandler<T = any>(
    endpoint: string,
    handler: MessageHandler<T>,
    options?: WebSocketOptions
): { state: WebSocketState; isConnected: boolean } {
    const [state, setState] = useState<WebSocketState>(WebSocketState.DISCONNECTED);
    const connectionRef = useRef(WebSocketManager.getConnection<T>(endpoint, options));
    const handlerRef = useRef(handler);

    // Update handler ref when it changes
    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        const connection = connectionRef.current;

        // Subscribe to messages with custom handler
        const unsubscribeMessage = connection.onMessage((message: T) => {
            handlerRef.current(message);
        });

        // Subscribe to state changes
        const unsubscribeState = connection.onStateChange((newState) => {
            setState(newState);
        });

        // Set initial state
        setState(connection.getState());

        // Cleanup on unmount
        return () => {
            unsubscribeMessage();
            unsubscribeState();
        };
    }, [endpoint]);

    return {
        state,
        isConnected: state === WebSocketState.CONNECTED,
    };
}

