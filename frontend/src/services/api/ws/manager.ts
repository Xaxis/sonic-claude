/**
 * WebSocket Manager
 * Singleton service that manages all WebSocket connections
 * 
 * Features:
 * - Connection pooling (prevents duplicate connections)
 * - Centralized lifecycle management
 * - Connection health monitoring
 * - Automatic cleanup
 */

import { BaseWebSocketClient, WebSocketState } from "./base";

/**
 * WebSocket Manager - Singleton
 * Manages all WebSocket connections in the application
 */
class WebSocketManagerClass {
    private connections: Map<string, BaseWebSocketClient<any>> = new Map();

    /**
     * Get or create a WebSocket connection
     * Prevents duplicate connections to the same endpoint
     */
    public getConnection<T = any>(
        endpoint: string,
        options?: {
            autoReconnect?: boolean;
            reconnectDelay?: number;
            maxReconnectDelay?: number;
            backoffMultiplier?: number;
            maxReconnectAttempts?: number;
            debug?: boolean;
        }
    ): BaseWebSocketClient<T> {
        // Check if connection already exists
        if (this.connections.has(endpoint)) {
            return this.connections.get(endpoint) as BaseWebSocketClient<T>;
        }

        // Create new connection
        const connection = new BaseWebSocketClient<T>(endpoint, options);
        this.connections.set(endpoint, connection);

        // Auto-connect
        connection.connect();

        return connection;
    }

    /**
     * Disconnect and remove a specific connection
     */
    public disconnect(endpoint: string): void {
        const connection = this.connections.get(endpoint);
        if (connection) {
            connection.disconnect();
            this.connections.delete(endpoint);
        }
    }

    /**
     * Disconnect all connections
     */
    public disconnectAll(): void {
        this.connections.forEach((connection) => {
            connection.disconnect();
        });
        this.connections.clear();
    }

    /**
     * Get connection state for a specific endpoint
     */
    public getConnectionState(endpoint: string): WebSocketState | null {
        const connection = this.connections.get(endpoint);
        return connection ? connection.getState() : null;
    }

    /**
     * Check if a connection exists and is connected
     */
    public isConnected(endpoint: string): boolean {
        const connection = this.connections.get(endpoint);
        return connection ? connection.isConnected() : false;
    }

    /**
     * Get all active connections
     */
    public getActiveConnections(): string[] {
        return Array.from(this.connections.keys()).filter((endpoint) => {
            const connection = this.connections.get(endpoint);
            return connection && connection.isConnected();
        });
    }

    /**
     * Get connection health status
     */
    public getHealthStatus(): {
        total: number;
        connected: number;
        connecting: number;
        disconnected: number;
        reconnecting: number;
        failed: number;
    } {
        const status = {
            total: this.connections.size,
            connected: 0,
            connecting: 0,
            disconnected: 0,
            reconnecting: 0,
            failed: 0,
        };

        this.connections.forEach((connection) => {
            const state = connection.getState();
            switch (state) {
                case WebSocketState.CONNECTED:
                    status.connected++;
                    break;
                case WebSocketState.CONNECTING:
                    status.connecting++;
                    break;
                case WebSocketState.DISCONNECTED:
                    status.disconnected++;
                    break;
                case WebSocketState.RECONNECTING:
                    status.reconnecting++;
                    break;
                case WebSocketState.FAILED:
                    status.failed++;
                    break;
            }
        });

        return status;
    }
}

// Export singleton instance
export const WebSocketManager = new WebSocketManagerClass();

