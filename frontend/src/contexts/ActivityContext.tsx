/**
 * Activity Context - AI Agent Activity Animation System
 *
 * Tracks and animates AI agent actions across the entire application.
 * Provides beautiful, themed visual indicators for every AI operation.
 *
 * Features:
 * - Real-time activity tracking for all AI actions
 * - Animated visual indicators with theme colors
 * - Cross-tab visibility (works with x-ray mode)
 * - Activity history and state persistence
 * - Multi-window synchronization
 *
 *
 * @TODO - Should this best be implemented in the AIContext or not? Research
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { windowManager } from "@/services/window-manager";

// ============================================================================
// TYPES
// ============================================================================

export type ActivityStatus = "pending" | "in-progress" | "success" | "error";
export type ActivityTargetType = "track" | "clip" | "effect" | "mixer" | "tempo" | "playback";

export interface AIActivity {
    id: string;
    action: string; // Action type (create_track, add_effect, etc.)
    status: ActivityStatus;
    message: string;
    timestamp: number;
    duration?: number; // Animation duration in ms
    targetId?: string; // Track ID, clip ID, effect ID, etc.
    targetType?: ActivityTargetType;
    tabId?: string; // Which tab this activity belongs to
    metadata?: Record<string, any>;
}

interface ActivityState {
    activities: AIActivity[]; // Currently active/animating activities
    history: AIActivity[]; // Recently completed activities (last 50)
    isAIActive: boolean; // Is AI currently performing actions?
}

interface ActivityContextValue extends ActivityState {
    // Activity management
    startActivity: (
        action: string,
        message: string,
        options?: {
            targetId?: string;
            targetType?: ActivityTargetType;
            tabId?: string;
            duration?: number;
            metadata?: Record<string, any>;
        }
    ) => string; // Returns activity ID
    completeActivity: (id: string, success: boolean, message?: string) => void;
    updateActivity: (id: string, updates: Partial<AIActivity>) => void;
    clearActivities: () => void;
    clearHistory: () => void;

    // Query methods
    getActivitiesForTarget: (targetId: string) => AIActivity[];
    getActivitiesForTab: (tabId: string) => AIActivity[];
    getActivityById: (id: string) => AIActivity | undefined;
}

const ActivityContext = createContext<ActivityContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

const MAX_HISTORY = 50;
const AUTO_CLEANUP_DELAY = 5000; // Remove completed activities after 5s

export function ActivityProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<ActivityState>({
        activities: [],
        history: [],
        isAIActive: false,
    });

    // Broadcast state changes to other windows
    const broadcastState = useCallback((newState: ActivityState) => {
        windowManager.broadcastState("ai-activity", newState);
    }, []);

    // Listen for state changes from other windows
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "state-update" && event.data?.key === "ai-activity") {
                setState(event.data.value);
            }
        };

        windowManager.channel.addEventListener("message", handleMessage);
        return () => windowManager.channel.removeEventListener("message", handleMessage);
    }, []);

    // Start a new activity
    const startActivity = useCallback(
        (
            action: string,
            message: string,
            options?: {
                targetId?: string;
                targetType?: ActivityTargetType;
                tabId?: string;
                duration?: number;
                metadata?: Record<string, any>;
            }
        ): string => {
            const id = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const activity: AIActivity = {
                id,
                action,
                status: "in-progress",
                message,
                timestamp: Date.now(),
                duration: options?.duration || 1500, // Default 1.5s
                targetId: options?.targetId,
                targetType: options?.targetType,
                tabId: options?.tabId,
                metadata: options?.metadata,
            };

            setState((prev) => {
                const newState = {
                    ...prev,
                    activities: [...prev.activities, activity],
                    isAIActive: true,
                };
                broadcastState(newState);
                return newState;
            });

            return id;
        },
        [broadcastState]
    );

    // Complete an activity (success or error)
    const completeActivity = useCallback(
        (id: string, success: boolean, message?: string) => {
            setState((prev) => {
                const activity = prev.activities.find((a) => a.id === id);
                if (!activity) return prev;

                const completedActivity: AIActivity = {
                    ...activity,
                    status: success ? "success" : "error",
                    message: message || activity.message,
                };

                // Move to history
                const newHistory = [completedActivity, ...prev.history].slice(0, MAX_HISTORY);

                // Remove from active activities
                const newActivities = prev.activities.filter((a) => a.id !== id);

                const newState = {
                    ...prev,
                    activities: newActivities,
                    history: newHistory,
                    isAIActive: newActivities.length > 0,
                };

                broadcastState(newState);
                return newState;
            });

            // Auto-cleanup: remove from history after delay
            setTimeout(() => {
                setState((prev) => ({
                    ...prev,
                    history: prev.history.filter((a) => a.id !== id),
                }));
            }, AUTO_CLEANUP_DELAY);
        },
        [broadcastState]
    );

    // Update an existing activity
    const updateActivity = useCallback(
        (id: string, updates: Partial<AIActivity>) => {
            setState((prev) => {
                const newState = {
                    ...prev,
                    activities: prev.activities.map((a) =>
                        a.id === id ? { ...a, ...updates } : a
                    ),
                };
                broadcastState(newState);
                return newState;
            });
        },
        [broadcastState]
    );

    // Clear all active activities
    const clearActivities = useCallback(() => {
        setState((prev) => {
            const newState = {
                ...prev,
                activities: [],
                isAIActive: false,
            };
            broadcastState(newState);
            return newState;
        });
    }, [broadcastState]);

    // Clear history
    const clearHistory = useCallback(() => {
        setState((prev) => ({ ...prev, history: [] }));
    }, []);

    // Query methods
    const getActivitiesForTarget = useCallback(
        (targetId: string) => {
            return state.activities.filter((a) => a.targetId === targetId);
        },
        [state.activities]
    );

    const getActivitiesForTab = useCallback(
        (tabId: string) => {
            return state.activities.filter((a) => a.tabId === tabId);
        },
        [state.activities]
    );

    const getActivityById = useCallback(
        (id: string) => {
            return state.activities.find((a) => a.id === id);
        },
        [state.activities]
    );

    const value: ActivityContextValue = {
        ...state,
        startActivity,
        completeActivity,
        updateActivity,
        clearActivities,
        clearHistory,
        getActivitiesForTarget,
        getActivitiesForTab,
        getActivityById,
    };

    return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useActivity() {
    const context = useContext(ActivityContext);
    if (!context) {
        throw new Error("useActivity must be used within ActivityProvider");
    }
    return context;
}

