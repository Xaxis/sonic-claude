/**
 * useAIState - Custom hook for AI-specific UI state management
 *
 * Encapsulates all AI UI state (active tab, loading states, etc.)
 * Follows the same pattern as useSequencerState and useMixerState
 *
 * This hook manages:
 * - Active tab (chat, analysis, state)
 * - Loading states
 * - Auto-refresh settings
 */

import { useState, useCallback } from "react";

export type AITab = "chat" | "analysis" | "state";

export interface AIState {
    // Active tab
    activeTab: AITab;

    // Loading states
    isLoadingState: boolean;
    isSendingMessage: boolean;

    // Auto-refresh for state view
    autoRefreshEnabled: boolean;
    refreshInterval: number; // milliseconds
}

export interface AIActions {
    // Tab navigation
    setActiveTab: (tab: AITab) => void;

    // Loading states
    setIsLoadingState: (loading: boolean) => void;
    setIsSendingMessage: (sending: boolean) => void;

    // Auto-refresh
    setAutoRefreshEnabled: (enabled: boolean) => void;
    setRefreshInterval: (interval: number) => void;

    // Convenience methods
    toggleAutoRefresh: () => void;
}

export function useAIState() {
    // Active tab
    const [activeTab, setActiveTab] = useState<AITab>("chat");

    // Loading states
    const [isLoadingState, setIsLoadingState] = useState(false);
    const [isSendingMessage, setIsSendingMessage] = useState(false);

    // Auto-refresh settings
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(2000); // 2 seconds

    // Convenience methods
    const toggleAutoRefresh = useCallback(() => {
        setAutoRefreshEnabled((prev) => !prev);
    }, []);

    const state: AIState = {
        activeTab,
        isLoadingState,
        isSendingMessage,
        autoRefreshEnabled,
        refreshInterval,
    };

    const actions: AIActions = {
        setActiveTab,
        setIsLoadingState,
        setIsSendingMessage,
        setAutoRefreshEnabled,
        setRefreshInterval,
        toggleAutoRefresh,
    };

    return { state, actions };
}

