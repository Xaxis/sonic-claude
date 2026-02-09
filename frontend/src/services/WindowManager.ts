/**
 * WindowManager - Manages multi-window state synchronization
 * Uses BroadcastChannel API for real-time cross-window communication
 */

export type WindowType = "main" | "popout";

export interface WindowInfo {
    id: string;
    type: WindowType;
    tabId?: string;
    panelIds?: string[];
    timestamp: number;
}

export interface PopoutInfo {
    tabId: string;
    panelIds: string[];
    timestamp: number;
}

export interface SyncMessage {
    type: "state-update" | "window-register" | "window-unregister" | "window-ping" | "window-pong";
    windowId: string;
    timestamp: number;
    data?: any;
}

export interface StateUpdate {
    key: string;
    value: any;
    source: string;
}

class WindowManagerService {
    private windowId: string;
    private windowType: WindowType;
    private channel: BroadcastChannel;
    private windows: Map<string, WindowInfo> = new Map();
    private stateListeners: Map<string, Set<(value: any) => void>> = new Map();
    private heartbeatInterval: number | null = null;
    private cleanupInterval: number | null = null;
    private popouts: Map<string, PopoutInfo> = new Map(); // Track active popouts

    constructor() {
        this.windowId = this.generateWindowId();
        this.windowType = window.opener ? "popout" : "main";
        this.channel = new BroadcastChannel("sonic-claude-sync");

        this.setupMessageHandler();
        this.registerWindow();
        this.startHeartbeat();
        this.startCleanup();
        this.setupUnloadHandler();

        console.log(`🪟 WindowManager initialized: ${this.windowId} (${this.windowType})`);
    }

    private generateWindowId(): string {
        return `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private setupMessageHandler() {
        this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
            const message = event.data;

            // Ignore messages from self
            if (message.windowId === this.windowId) return;

            switch (message.type) {
                case "state-update":
                    this.handleStateUpdate(message.data as StateUpdate);
                    break;
                case "window-register":
                    this.handleWindowRegister(message.data as WindowInfo);
                    break;
                case "window-unregister":
                    this.handleWindowUnregister(message.windowId);
                    break;
                case "window-ping":
                    this.sendPong();
                    break;
                case "window-pong":
                    this.handleWindowPong(message.data as WindowInfo);
                    break;
            }
        };
    }

    private registerWindow() {
        const info: WindowInfo = {
            id: this.windowId,
            type: this.windowType,
            timestamp: Date.now(),
        };

        this.windows.set(this.windowId, info);

        this.channel.postMessage({
            type: "window-register",
            windowId: this.windowId,
            timestamp: Date.now(),
            data: info,
        } as SyncMessage);

        // Request other windows to identify themselves
        this.sendPing();
    }

    private sendPing() {
        this.channel.postMessage({
            type: "window-ping",
            windowId: this.windowId,
            timestamp: Date.now(),
        } as SyncMessage);
    }

    private sendPong() {
        const info: WindowInfo = {
            id: this.windowId,
            type: this.windowType,
            timestamp: Date.now(),
        };

        this.channel.postMessage({
            type: "window-pong",
            windowId: this.windowId,
            timestamp: Date.now(),
            data: info,
        } as SyncMessage);
    }

    private handleWindowRegister(info: WindowInfo) {
        this.windows.set(info.id, info);
        console.log(`🪟 Window registered: ${info.id} (${info.type})`);
    }

    private handleWindowUnregister(windowId: string) {
        this.windows.delete(windowId);
        console.log(`🪟 Window unregistered: ${windowId}`);
    }

    private handleWindowPong(info: WindowInfo) {
        this.windows.set(info.id, info);
    }

    private startHeartbeat() {
        this.heartbeatInterval = window.setInterval(() => {
            this.sendPing();
        }, 5000); // Ping every 5 seconds
    }

    private startCleanup() {
        this.cleanupInterval = window.setInterval(() => {
            const now = Date.now();
            const timeout = 15000; // 15 seconds

            for (const [id, info] of this.windows.entries()) {
                if (now - info.timestamp > timeout && id !== this.windowId) {
                    this.windows.delete(id);
                    console.log(`🪟 Window timed out: ${id}`);
                }
            }
        }, 10000); // Cleanup every 10 seconds
    }

    private setupUnloadHandler() {
        window.addEventListener("beforeunload", () => {
            this.cleanup();
        });
    }

    private handleStateUpdate(update: StateUpdate) {
        // Handle popout tracking
        if (update.key === "popout-opened") {
            this.popouts.set(update.value.tabId, update.value);
        } else if (update.key === "popout-closed") {
            this.popouts.delete(update.value.tabId);
        }

        const listeners = this.stateListeners.get(update.key);
        if (listeners) {
            listeners.forEach((listener) => listener(update.value));
        }
    }

    // Public API

    /**
     * Broadcast state update to all windows
     */
    public broadcastState(key: string, value: any) {
        const update: StateUpdate = {
            key,
            value,
            source: this.windowId,
        };

        this.channel.postMessage({
            type: "state-update",
            windowId: this.windowId,
            timestamp: Date.now(),
            data: update,
        } as SyncMessage);
    }

    /**
     * Subscribe to state updates for a specific key
     */
    public subscribeToState(key: string, listener: (value: any) => void): () => void {
        if (!this.stateListeners.has(key)) {
            this.stateListeners.set(key, new Set());
        }

        this.stateListeners.get(key)!.add(listener);

        // Return unsubscribe function
        return () => {
            const listeners = this.stateListeners.get(key);
            if (listeners) {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    this.stateListeners.delete(key);
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
        }

        return popout;
    }

    /**
     * Get all active windows
     */
    public getWindows(): WindowInfo[] {
        return Array.from(this.windows.values());
    }

    /**
     * Get current window info
     */
    public getCurrentWindow(): WindowInfo {
        return this.windows.get(this.windowId)!;
    }

    /**
     * Check if this is the main window
     */
    public isMainWindow(): boolean {
        return this.windowType === "main";
    }

    /**
     * Get all active popouts
     */
    public getPopouts(): PopoutInfo[] {
        return Array.from(this.popouts.values());
    }

    /**
     * Check if a tab is currently popped out
     */
    public isTabPoppedOut(tabId: string): boolean {
        return this.popouts.has(tabId);
    }

    /**
     * Cleanup on window close
     */
    public cleanup() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        this.channel.postMessage({
            type: "window-unregister",
            windowId: this.windowId,
            timestamp: Date.now(),
        } as SyncMessage);

        this.channel.close();
        console.log(`🪟 WindowManager cleaned up: ${this.windowId}`);
    }
}

// Singleton instance
export const windowManager = new WindowManagerService();

