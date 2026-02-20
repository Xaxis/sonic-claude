/**
 * Analytics WebSocket Hook
 *
 * Connects to backend WebSocket for real-time analytics data.
 * Provides system performance metrics and audio engine stats.
 */

import { useWebSocket } from "@/hooks/useWebSocket";
import type { AnalyticsMessage } from "@/services/api/ws";

// Re-export type for backward compatibility
export type { AnalyticsMessage as AnalyticsData };

/**
 * Hook for analytics WebSocket data
 * Refactored to use BaseWebSocketClient
 */
export function useAnalyticsWebSocket() {
    const { data: analytics, isConnected } = useWebSocket<AnalyticsMessage>("/ws/analytics", {
        debug: false,
    });

    return { analytics: analytics || null, isConnected };
}
