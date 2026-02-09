/**
 * useSampleLibrary - Custom hook for auto-updating sample library
 * 
 * Uses a combination of:
 * 1. Polling (setInterval) - Industry standard for real-time data sync
 * 2. BroadcastChannel - Cross-tab/window communication
 * 3. Manual refresh trigger - For immediate updates after user actions
 * 
 * This pattern is used by apps like Slack, Discord, Notion, etc.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type { Sample } from "@/types";

const POLL_INTERVAL = 3000; // 3 seconds - balanced between responsiveness and server load
const BROADCAST_CHANNEL_NAME = "sample-library-updates";

export function useSampleLibrary() {
    const [samples, setSamples] = useState<Sample[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const broadcastChannel = useRef<BroadcastChannel | null>(null);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    // Load samples from API
    const loadSamples = useCallback(async (silent = false) => {
        try {
            if (!silent) {
                setIsLoading(true);
            }
            setError(null);

            const sampleList = await api.listSamples();
            setSamples(sampleList);

            // Broadcast to other tabs/windows
            if (broadcastChannel.current) {
                try {
                    broadcastChannel.current.postMessage({
                        type: "samples-updated",
                        samples: sampleList,
                        timestamp: Date.now(),
                    });
                } catch (broadcastErr) {
                    // Ignore broadcast errors
                    console.warn("Failed to broadcast sample update:", broadcastErr);
                }
            }
        } catch (err) {
            console.error("Failed to load samples:", err);
            if (!silent) {
                setError(err instanceof Error ? err.message : "Failed to load samples");
            }
        } finally {
            if (!silent) {
                setIsLoading(false);
            }
        }
    }, []);

    // Manual refresh function for immediate updates
    const refreshSamples = useCallback(() => {
        return loadSamples(false);
    }, [loadSamples]);

    // Initialize BroadcastChannel and polling
    useEffect(() => {
        try {
            // Create BroadcastChannel for cross-tab communication
            broadcastChannel.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME);

            // Listen for updates from other tabs/windows
            broadcastChannel.current.onmessage = (event) => {
                try {
                    if (event.data.type === "samples-updated") {
                        console.log("📡 Received sample library update from another window");
                        setSamples(event.data.samples);
                    } else if (event.data.type === "sample-library-changed") {
                        console.log("📡 Sample library changed, refreshing...");
                        loadSamples(true);
                    }
                } catch (err) {
                    console.error("Error handling broadcast message:", err);
                }
            };
        } catch (err) {
            console.warn("BroadcastChannel not available:", err);
        }

        // Initial load
        loadSamples(false);

        // Start polling
        pollInterval.current = setInterval(() => {
            loadSamples(true); // Silent polling
        }, POLL_INTERVAL);

        // Cleanup
        return () => {
            if (broadcastChannel.current) {
                try {
                    broadcastChannel.current.close();
                } catch (err) {
                    // Ignore cleanup errors
                }
            }
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
            }
        };
    }, [loadSamples]);

    return {
        samples,
        isLoading,
        error,
        refreshSamples,
    };
}

/**
 * Utility function to notify all tabs/windows that the sample library has changed
 * Call this after recording, deleting, or renaming samples
 */
export function notifySampleLibraryChanged() {
    try {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channel.postMessage({
            type: "sample-library-changed",
            timestamp: Date.now(),
        });
        channel.close();
    } catch (err) {
        console.error("Failed to broadcast sample library change:", err);
    }
}

