/**
 * Base WebSocket Client
 * Provides core WebSocket functionality with automatic reconnection, error handling, and typed messages
 *
 * Similar to BaseAPIClient but for WebSocket connections
 */

import { apiConfig } from "@/config/api.config";

/**
 * WebSocket connection states
 */
export enum WebSocketState {
    CONNECTING = "CONNECTING",
    CONNECTED = "CONNECTED",
    DISCONNECTED = "DISCONNECTED",
    RECONNECTING = "RECONNECTING",
    FAILED = "FAILED",
}

/**
 * WebSocket error class
 */
export class WebSocketError extends Error {
    constructor(
        message: string,
        public endpoint: string,
        public code?: number
    ) {
        super(message);
        this.name = "WebSocketError";
    }
}

/**
 * WebSocket message handler type
 */
export type MessageHandler<T = any> = (data: T) => void;

/**
 * WebSocket configuration options
 */
export interface WebSocketOptions {
    /** Enable automatic reconnection (default: true) */
    autoReconnect?: boolean;
    /** Initial reconnect delay in ms (default: 1000) */
    reconnectDelay?: number;
    /** Maximum reconnect delay in ms (default: 30000) */
    maxReconnectDelay?: number;
    /** Exponential backoff multiplier (default: 1.5) */
    backoffMultiplier?: number;
    /** Maximum number of reconnect attempts (default: Infinity) */
    maxReconnectAttempts?: number;
    /** Enable debug logging (default: false) */
    debug?: boolean;
}

/**
 * Base WebSocket Client
 * Handles connection lifecycle, reconnection with exponential backoff, and typed message handling
 */
export class BaseWebSocketClient<TMessage = any> {
    protected ws: WebSocket | null = null;
    protected endpoint: string;
    protected fullURL: string;
    protected state: WebSocketState = WebSocketState.DISCONNECTED;
    protected messageHandlers: Set<MessageHandler<TMessage>> = new Set();
    protected stateChangeHandlers: Set<(state: WebSocketState) => void> = new Set();

    // Reconnection state
    protected reconnectAttempts = 0;
    protected reconnectTimeout: number | undefined;
    protected currentReconnectDelay: number;
    protected isCleaningUp = false;

    // Options
    protected options: Required<WebSocketOptions>;

    constructor(endpoint: string, options: WebSocketOptions = {}) {
        this.endpoint = endpoint;
        this.fullURL = apiConfig.getWSURL(endpoint);

        // Set default options
        this.options = {
            autoReconnect: options.autoReconnect ?? true,
            reconnectDelay: options.reconnectDelay ?? 1000,
            maxReconnectDelay: options.maxReconnectDelay ?? 30000,
            backoffMultiplier: options.backoffMultiplier ?? 1.5,
            maxReconnectAttempts: options.maxReconnectAttempts ?? Infinity,
            debug: options.debug ?? false,
        };

        this.currentReconnectDelay = this.options.reconnectDelay;
    }

    /**
     * Connect to WebSocket
     */
    public connect(): void {
        if (this.isCleaningUp) return;
        if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
            this.log("Already connected or connecting");
            return;
        }

        try {
            this.setState(WebSocketState.CONNECTING);
            this.ws = new WebSocket(this.fullURL);

            this.ws.onopen = () => this.handleOpen();
            this.ws.onmessage = (event) => this.handleMessage(event);
            this.ws.onerror = (event) => this.handleError(event);
            this.ws.onclose = (event) => this.handleClose(event);

            this.log(`Connecting to ${this.endpoint}`);
        } catch (error) {
            this.handleConnectionError(error);
        }
    }

    /**
     * Disconnect from WebSocket
     */
    public disconnect(): void {
        this.isCleaningUp = true;
        this.clearReconnectTimeout();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.setState(WebSocketState.DISCONNECTED);
        this.log("Disconnected");
    }

    /**
     * Subscribe to messages
     */
    public onMessage(handler: MessageHandler<TMessage>): () => void {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }

    /**
     * Subscribe to state changes
     */
    public onStateChange(handler: (state: WebSocketState) => void): () => void {
        this.stateChangeHandlers.add(handler);
        return () => this.stateChangeHandlers.delete(handler);
    }

    /**
     * Get current connection state
     */
    public getState(): WebSocketState {
        return this.state;
    }

    /**
     * Check if connected
     */
    public isConnected(): boolean {
        return this.state === WebSocketState.CONNECTED;
    }

    /**
     * Send message to WebSocket
     */
    public send(data: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new WebSocketError("Cannot send message: WebSocket not connected", this.endpoint);
        }

        try {
            const message = typeof data === "string" ? data : JSON.stringify(data);
            this.ws.send(message);
            this.log("Sent message:", data);
        } catch (error) {
            throw new WebSocketError(
                `Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`,
                this.endpoint
            );
        }
    }

    // ========================================================================
    // Protected Methods (Internal)
    // ========================================================================

    protected handleOpen(): void {
        this.setState(WebSocketState.CONNECTED);
        this.reconnectAttempts = 0;
        this.currentReconnectDelay = this.options.reconnectDelay;
        this.log("✅ Connected");
    }

    protected handleMessage(event: MessageEvent): void {
        if (this.isCleaningUp) return;

        try {
            const data = JSON.parse(event.data) as TMessage;
            this.messageHandlers.forEach((handler) => handler(data));
        } catch (error) {
            console.error(`Failed to parse WebSocket message from ${this.endpoint}:`, error);
        }
    }

    protected handleError(_event: Event): void {
        if (this.isCleaningUp) return;
        if (this.ws?.readyState === WebSocket.CLOSED) return;

        this.log("⚠️ WebSocket error");
    }

    protected handleClose(event: CloseEvent): void {
        if (this.isCleaningUp) return;

        this.setState(WebSocketState.DISCONNECTED);
        this.log(`Closed (code: ${event.code}, reason: ${event.reason || "none"})`);

        // Attempt reconnection if enabled
        if (this.options.autoReconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
            this.scheduleReconnect();
        } else if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
            this.setState(WebSocketState.FAILED);
            this.log("❌ Max reconnect attempts reached");
        }
    }

    protected handleConnectionError(error: any): void {
        this.setState(WebSocketState.FAILED);
        console.error(`Failed to create WebSocket connection to ${this.endpoint}:`, error);
    }

    protected scheduleReconnect(): void {
        this.clearReconnectTimeout();
        this.setState(WebSocketState.RECONNECTING);

        this.reconnectAttempts++;
        this.log(`Reconnecting in ${this.currentReconnectDelay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimeout = window.setTimeout(() => {
            if (!this.isCleaningUp) {
                this.connect();
                // Increase delay for next attempt (exponential backoff)
                this.currentReconnectDelay = Math.min(
                    this.currentReconnectDelay * this.options.backoffMultiplier,
                    this.options.maxReconnectDelay
                );
            }
        }, this.currentReconnectDelay);
    }

    protected clearReconnectTimeout(): void {
        if (this.reconnectTimeout !== undefined) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = undefined;
        }
    }

    protected setState(newState: WebSocketState): void {
        if (this.state !== newState) {
            this.state = newState;
            this.stateChangeHandlers.forEach((handler) => handler(newState));
        }
    }

    protected log(...args: any[]): void {
        if (this.options.debug) {
            console.log(`[WebSocket:${this.endpoint}]`, ...args);
        }
    }
}