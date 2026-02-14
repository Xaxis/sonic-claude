/**
 * WindowManager - Simple multi-window state synchronization
 *
 * Uses BroadcastChannel API to sync state across all windows/tabs.
 * Handles popout window creation and tracking.
 */

export interface StateUpdate {
    key: string;
    value: any;
    timestamp: number;
}

class WindowManagerService {
    private channel: BroadcastChannel;
    private listeners: Map<string, Set<(value: any) => void>> = new Map();

    constructor() {
        this.channel = new BroadcastChannel("sonic-claude-sync");
        this.setupMessageHandler();
        console.log("🪟 WindowManager initialized");
    }

    private setupMessageHandler() {
        this.channel.onmessage = (event: MessageEvent<StateUpdate>) => {
            const { key, value } = event.data;

            // Notify all listeners for this key
            const keyListeners = this.listeners.get(key);
            if (keyListeners) {
                keyListeners.forEach((listener) => listener(value));
            }
        };
    }

    /**
     * Broadcast state update to all windows
     */
    public broadcastState(key: string, value: any) {
        const update: StateUpdate = {
            key,
            value,
            timestamp: Date.now(),
        };

        this.channel.postMessage(update);
    }

    /**
     * Subscribe to state updates for a specific key
     */
    public subscribeToState(key: string, listener: (value: any) => void): () => void {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }

        this.listeners.get(key)!.add(listener);

        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(key);
            if (listeners) {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    this.listeners.delete(key);
                }
            }
        };
    }

    /**
     * Open a new popout window for a tab
     */
    public openPopout(tabId: string, panelIds: string[]): Window | null {
        const width = 1200;
        const height = 800;
        const left = window.screenX + 50;
        const top = window.screenY + 50;

        const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
        const url = `/popout?tab=${tabId}&panels=${panelIds.join(",")}`;

        const popout = window.open(url, `popout-${tabId}`, features);

        if (popout) {
            console.log(`🪟 Opened popout for tab: ${tabId}`);

            // Broadcast that this tab is now popped out
            this.broadcastState("popout-opened", { tabId, panelIds });
        }

        return popout;
    }

    /**
     * Cleanup on window close
     */
    public cleanup() {
        this.channel.close();
        console.log("🪟 WindowManager cleaned up");
    }
}

// Singleton instance
export const windowManager = new WindowManagerService();

// Cleanup on window unload
window.addEventListener("beforeunload", () => {
    windowManager.cleanup();
});
