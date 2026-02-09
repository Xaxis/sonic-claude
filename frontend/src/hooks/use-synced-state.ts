import { useState, useEffect, useCallback, useRef } from "react";
import { windowManager } from "@/services/WindowManager";

/**
 * Hook for state that syncs across all windows
 * Similar to useState but broadcasts changes to all windows
 */
export function useSyncedState<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
    const [state, setState] = useState<T>(() => {
        // Try to load from localStorage first
        const stored = localStorage.getItem(`synced-${key}`);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error(`Failed to parse stored state for ${key}:`, e);
            }
        }
        return initialValue;
    });

    const isUpdatingRef = useRef(false);

    // Subscribe to updates from other windows
    useEffect(() => {
        const unsubscribe = windowManager.subscribeToState(key, (value: T) => {
            if (!isUpdatingRef.current) {
                setState(value);
                localStorage.setItem(`synced-${key}`, JSON.stringify(value));
            }
        });

        return unsubscribe;
    }, [key]);

    // Broadcast state changes to other windows
    const setSyncedState = useCallback(
        (value: T | ((prev: T) => T)) => {
            isUpdatingRef.current = true;

            setState((prev) => {
                const newValue = value instanceof Function ? value(prev) : value;

                // Save to localStorage
                localStorage.setItem(`synced-${key}`, JSON.stringify(newValue));

                // Broadcast to other windows
                windowManager.broadcastState(key, newValue);

                isUpdatingRef.current = false;
                return newValue;
            });
        },
        [key]
    );

    return [state, setSyncedState];
}

/**
 * Hook for subscribing to state updates from other windows
 * Useful for read-only state that's managed elsewhere
 */
export function useSubscribedState<T>(key: string, initialValue: T): T {
    const [state, setState] = useState<T>(() => {
        const stored = localStorage.getItem(`synced-${key}`);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return initialValue;
            }
        }
        return initialValue;
    });

    useEffect(() => {
        const unsubscribe = windowManager.subscribeToState(key, (value: T) => {
            setState(value);
        });

        return unsubscribe;
    }, [key]);

    return state;
}

/**
 * Hook for broadcasting events to other windows
 */
export function useBroadcast() {
    const broadcast = useCallback((key: string, value: any) => {
        windowManager.broadcastState(key, value);
    }, []);

    return broadcast;
}

