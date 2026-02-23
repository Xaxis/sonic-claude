/**
 * API Configuration
 * Centralized configuration for all backend API and WebSocket URLs
 * 
 * Environment Variables:
 * - VITE_API_BASE_URL: Base URL for HTTP API (default: http://localhost:8000)
 * - VITE_WS_BASE_URL: Base URL for WebSocket connections (default: ws://localhost:8000)
 */

// Get base URLs from environment variables with fallbacks
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000";

/**
 * API Configuration
 */
export const apiConfig = {
    /**
     * Base URL for HTTP API requests
     */
    baseURL: API_BASE_URL,

    /**
     * Base URL for WebSocket connections
     */
    wsBaseURL: WS_BASE_URL,

    /**
     * API endpoint paths
     */
    endpoints: {
        // Audio Engine
        audioEngine: "/audio-engine",

        // REST API endpoints
        api: {
            // NOTE: /api/sequencer/* routes have been removed - use /api/compositions/* instead
            mixer: "/api/mixer",
            effects: "/api/effects",
            audio: "/api/audio",
            samples: "/api/samples",
            compositions: "/api/compositions",
            playback: "/api/playback",
            ai: "/api/ai",
        },

        // WebSocket endpoints
        ws: {
            spectrum: "/api/ws/spectrum",
            waveform: "/api/ws/waveform",
            meters: "/api/ws/meters",
            transport: "/api/ws/transport",
        },
    },

    /**
     * Get full HTTP URL for an endpoint
     */
    getURL(path: string): string {
        return `${API_BASE_URL}${path}`;
    },

    /**
     * Get full WebSocket URL for an endpoint
     */
    getWSURL(path: string): string {
        return `${WS_BASE_URL}${path}`;
    },
};

/**
 * WebSocket URLs (for convenience)
 */
export const wsURLs = {
    spectrum: apiConfig.getWSURL(apiConfig.endpoints.ws.spectrum),
    waveform: apiConfig.getWSURL(apiConfig.endpoints.ws.waveform),
    meters: apiConfig.getWSURL(apiConfig.endpoints.ws.meters),
    transport: apiConfig.getWSURL(apiConfig.endpoints.ws.transport),
    analytics: apiConfig.getWSURL("/ws/analytics"), // Note: This endpoint is not under /api
};

// Export for backward compatibility
export const API_BASE = API_BASE_URL;
export const WS_BASE = WS_BASE_URL;

