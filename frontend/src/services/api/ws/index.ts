/**
 * WebSocket API Infrastructure
 * Core WebSocket classes and types (hooks are in @/hooks)
 */

// Core classes and types
export { BaseWebSocketClient, WebSocketState, WebSocketError } from "./base";
export type { WebSocketOptions, MessageHandler } from "./base";

// Manager
export { WebSocketManager } from "./manager";

// React hooks (re-exported from @/hooks for convenience)
export { useWebSocket, useWebSocketWithHandler } from "@/hooks/useWebSocket";
export type { UseWebSocketReturn } from "@/hooks/useWebSocket";

// Message types
export type {
    BaseWebSocketMessage,
    TransportMessage,
    SpectrumMessage,
    WaveformMessage,
    MeterMessage,
    AnalyticsMessage,
    WebSocketMessage,
} from "./types";
