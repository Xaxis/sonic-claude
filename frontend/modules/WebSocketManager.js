/**
 * WebSocketManager Module - Handle WebSocket connections with auto-reconnect
 */

import { Logger } from './Logger.js';

export class WebSocketManager {
    constructor(url, stateManager) {
        this.url = url;
        this.stateManager = stateManager;
        this.logger = new Logger('WebSocket');
        this.ws = null;
        this.reconnectInterval = 3000;
        this.reconnectTimer = null;
        this.messageHandlers = new Map();
        this.isIntentionallyClosed = false;
    }

    /**
     * Connect to WebSocket server
     */
    connect() {
        this.isIntentionallyClosed = false;
        
        try {
            this.logger.info(`Connecting to ${this.url}`);
            this.ws = new WebSocket(this.url);
            
            this.ws.onopen = () => this._handleOpen();
            this.ws.onclose = () => this._handleClose();
            this.ws.onerror = (error) => this._handleError(error);
            this.ws.onmessage = (event) => this._handleMessage(event);
            
        } catch (error) {
            this.logger.error('Failed to create WebSocket connection', error);
            this._scheduleReconnect();
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        this.isIntentionallyClosed = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.logger.info('Disconnected');
    }

    /**
     * Send message to server
     * @param {Object} message - Message object
     */
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(message));
                this.logger.debug('Message sent', message);
            } catch (error) {
                this.logger.error('Failed to send message', error);
            }
        } else {
            this.logger.warn('Cannot send message - WebSocket not connected');
        }
    }

    /**
     * Register message handler
     * @param {string} type - Message type
     * @param {Function} handler - Handler function
     */
    on(type, handler) {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, []);
        }
        this.messageHandlers.get(type).push(handler);
        this.logger.debug(`Registered handler for message type: ${type}`);
    }

    _handleOpen() {
        this.logger.info('Connected successfully');
        this.stateManager.setState('connected', true);
    }

    _handleClose() {
        this.logger.info('Connection closed');
        this.stateManager.setState('connected', false);
        
        if (!this.isIntentionallyClosed) {
            this._scheduleReconnect();
        }
    }

    _handleError(error) {
        this.logger.error('WebSocket error', error);
    }

    _handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            this.logger.debug('Message received', data);
            
            // Call registered handlers
            if (data.type && this.messageHandlers.has(data.type)) {
                this.messageHandlers.get(data.type).forEach(handler => {
                    try {
                        handler(data);
                    } catch (error) {
                        this.logger.error(`Error in message handler for type ${data.type}`, error);
                    }
                });
            }
        } catch (error) {
            this.logger.error('Failed to parse message', error);
        }
    }

    _scheduleReconnect() {
        if (this.reconnectTimer) return;
        
        this.logger.info(`Reconnecting in ${this.reconnectInterval}ms`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, this.reconnectInterval);
    }

    /**
     * Check if WebSocket is connected
     * @returns {boolean}
     */
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

