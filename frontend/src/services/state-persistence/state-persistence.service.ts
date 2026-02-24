/**
 * Unified State Persistence Service
 * 
 * SINGLE SOURCE OF TRUTH for all frontend state persistence.
 * Replaces scattered localStorage usage with a cohesive system.
 * 
 * Architecture:
 * - All localStorage keys defined in ONE place
 * - Type-safe get/set methods
 * - Automatic JSON serialization
 * - Validation and error handling
 * - Clear separation of concerns
 */

// ============================================================================
// STORAGE KEYS - ALL IN ONE PLACE
// ============================================================================

export const STORAGE_KEYS = {
    // Layout & UI
    LAYOUT: "sonic-claude-layout-v2",
    WINDOW_STATE: "sonic-claude-window-state",

    // Sequencer
    ACTIVE_SEQUENCE_ID: "sonic-claude-active-sequence",
    SEQUENCER_SPLIT_RATIO: "sonic-claude-sequencer-split",

    // Sequencer UI State
    ZOOM: "sonic-claude-zoom",
    SNAP_ENABLED: "sonic-claude-snap-enabled",
    GRID_SIZE: "sonic-claude-grid-size",

    // Composition
    ACTIVE_COMPOSITION_ID: "sonic-claude-active-composition",

    // Assistant
    ACTIVE_ASSISTANT_TAB: "sonic-claude-active-assistant-tab",

    // Settings
    SETTINGS: "sonic-claude-settings",

    // Session
    LAST_SESSION: "sonic-claude-last-session",
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SessionState {
    activeSequenceId: string | null;
    lastActiveTimestamp: string;
    tempo: number;
    isPlaying: boolean;
}

export interface SequencerUIState {
    splitRatio: number;
    zoom: number;
    snapEnabled: boolean;
    gridSize: number;
}

// ============================================================================
// PERSISTENCE SERVICE
// ============================================================================

export class StatePersistenceService {
    /**
     * Get value from localStorage with type safety
     */
    private get<T>(key: string, defaultValue: T): T {
        try {
            const stored = localStorage.getItem(key);
            if (!stored) return defaultValue;
            return JSON.parse(stored) as T;
        } catch (error) {
            console.error(`Failed to parse localStorage key "${key}":`, error);
            return defaultValue;
        }
    }

    /**
     * Set value in localStorage with automatic JSON serialization
     */
    private set<T>(key: string, value: T): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Failed to save to localStorage key "${key}":`, error);
        }
    }

    /**
     * Remove value from localStorage
     */
    private remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Failed to remove localStorage key "${key}":`, error);
        }
    }

    // ========================================================================
    // SESSION STATE
    // ========================================================================

    getLastSession(): SessionState | null {
        return this.get<SessionState | null>(STORAGE_KEYS.LAST_SESSION, null);
    }

    saveSession(session: SessionState): void {
        this.set(STORAGE_KEYS.LAST_SESSION, session);
    }

    clearSession(): void {
        this.remove(STORAGE_KEYS.LAST_SESSION);
    }

    // ========================================================================
    // ACTIVE SEQUENCE
    // ========================================================================

    // @TODO - This is clearly not correct as composition id is the refacored state/store paradigm. Fix!
    getActiveSequenceId(): string | null {
        return this.get<string | null>(STORAGE_KEYS.ACTIVE_SEQUENCE_ID, null);
    }

    setActiveSequenceId(sequenceId: string | null): void {
        if (sequenceId === null) {
            this.remove(STORAGE_KEYS.ACTIVE_SEQUENCE_ID);
        } else {
            this.set(STORAGE_KEYS.ACTIVE_SEQUENCE_ID, sequenceId);
        }
    }

    // ========================================================================
    // ACTIVE COMPOSITION
    // ========================================================================

    getActiveCompositionId(): string | null {
        return this.get<string | null>(STORAGE_KEYS.ACTIVE_COMPOSITION_ID, null);
    }

    setActiveCompositionId(compositionId: string | null): void {
        if (compositionId === null) {
            this.remove(STORAGE_KEYS.ACTIVE_COMPOSITION_ID);
        } else {
            this.set(STORAGE_KEYS.ACTIVE_COMPOSITION_ID, compositionId);
        }
    }

    // ========================================================================
    // SEQUENCER UI STATE
    // ========================================================================

    getSequencerSplitRatio(): number {
        return this.get<number>(STORAGE_KEYS.SEQUENCER_SPLIT_RATIO, 60);
    }

    setSequencerSplitRatio(ratio: number): void {
        this.set(STORAGE_KEYS.SEQUENCER_SPLIT_RATIO, ratio);
    }

    getZoom(): number {
        return this.get<number>(STORAGE_KEYS.ZOOM, 0.5);
    }

    setZoom(zoom: number): void {
        this.set(STORAGE_KEYS.ZOOM, zoom);
    }

    getSnapEnabled(): boolean {
        return this.get<boolean>(STORAGE_KEYS.SNAP_ENABLED, true);
    }

    setSnapEnabled(enabled: boolean): void {
        this.set(STORAGE_KEYS.SNAP_ENABLED, enabled);
    }

    getGridSize(): number {
        return this.get<number>(STORAGE_KEYS.GRID_SIZE, 16);
    }

    setGridSize(size: number): void {
        this.set(STORAGE_KEYS.GRID_SIZE, size);
    }

    // ========================================================================
    // LAYOUT STATE
    // ========================================================================

    getLayout<T>(): T | null {
        return this.get<T | null>(STORAGE_KEYS.LAYOUT, null);
    }

    setLayout<T>(layout: T): void {
        this.set(STORAGE_KEYS.LAYOUT, layout);
    }

    // ========================================================================
    // ASSISTANT UI STATE
    // ========================================================================

    getActiveAssistantTab(): "chat" | "analysis" {
        return this.get<"chat" | "analysis">(STORAGE_KEYS.ACTIVE_ASSISTANT_TAB, "chat");
    }

    setActiveAssistantTab(tab: "chat" | "analysis"): void {
        this.set(STORAGE_KEYS.ACTIVE_ASSISTANT_TAB, tab);
    }

    // ========================================================================
    // SETTINGS
    // ========================================================================

    getSettings<T>(): T | null {
        return this.get<T | null>(STORAGE_KEYS.SETTINGS, null);
    }

    setSettings<T>(settings: T): void {
        this.set(STORAGE_KEYS.SETTINGS, settings);
    }

    // ========================================================================
    // UTILITY
    // ========================================================================

    /**
     * Clear ALL Sonic Claude state from localStorage
     * Useful for debugging or reset functionality
     */
    clearAll(): void {
        Object.values(STORAGE_KEYS).forEach(key => {
            this.remove(key);
        });
        console.log("🗑️ Cleared all Sonic Claude state from localStorage");
    }
}

// Export singleton instance
export const statePersistence = new StatePersistenceService();

