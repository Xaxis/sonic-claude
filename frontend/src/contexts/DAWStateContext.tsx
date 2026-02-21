/**
 * DAWStateContext - Thin coordination layer for DAW state (SOURCE OF TRUTH for engine status)
 *
 * This context is a THIN COORDINATION LAYER that:
 * - Manages engine status (running/stopped)
 * - Provides composition change notifications (for autosave)
 * - Coordinates cross-cutting concerns that don't belong to a specific domain
 *
 * WHY THIS EXISTS:
 * - Engine status is cross-cutting (affects all domains)
 * - Composition change notifications need to be centralized
 * - Provides a single point for DAW-wide initialization
 *
 * WHAT THIS DOES NOT DO:
 * - Does NOT manage domain state (sequencer, mixer, effects, synthesis)
 * - Does NOT manage real-time data (that's TelemetryContext)
 * - Does NOT duplicate state from other contexts
 *
 * ARCHITECTURE:
 * - Thin layer that coordinates between domain contexts
 * - Uses domain contexts for actual state management
 * - Provides convenience methods that delegate to domain contexts
 */

import {
    createContext,
    useContext,
    useState,
    ReactNode,
} from "react";
import type { AudioEngineStatus } from "@/types";

// ============================================================================
// GLOBAL COMPOSITION CHANGE CALLBACK
// ============================================================================

// Global composition change callback (set by CompositionContext)
// This is used to notify CompositionContext when any domain state changes
let compositionChangeCallback: (() => void) | null = null;

export function setCompositionChangeCallback(callback: (() => void) | null) {
    compositionChangeCallback = callback;
}

export function notifyCompositionChanged() {
    if (compositionChangeCallback) {
        compositionChangeCallback();
    }
}

// ============================================================================
// STATE TYPES
// ============================================================================

interface DAWState {
    // Engine status
    engineStatus: AudioEngineStatus | null;
    isEngineRunning: boolean;
}

// ============================================================================
// CONTEXT VALUE TYPE
// ============================================================================

interface DAWStateContextValue extends DAWState {
    // Engine actions
    setEngineStatus: (status: AudioEngineStatus) => void;
    setIsEngineRunning: (isRunning: boolean) => void;
}

const DAWStateContext = createContext<DAWStateContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function DAWStateProvider({ children }: { children: ReactNode }) {
    // Engine status
    const [engineStatus, setEngineStatus] = useState<AudioEngineStatus | null>(null);
    const [isEngineRunning, setIsEngineRunning] = useState(false);

    const value: DAWStateContextValue = {
        // State
        engineStatus,
        isEngineRunning,

        // Actions
        setEngineStatus,
        setIsEngineRunning,
    };

    return (
        <DAWStateContext.Provider value={value}>
            {children}
        </DAWStateContext.Provider>
    );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useDAWState() {
    const context = useContext(DAWStateContext);
    if (context === undefined) {
        throw new Error("useDAWState must be used within a DAWStateProvider");
    }
    return context;
}

// Convenience hook for engine status only
export function useEngineStatus() {
    const { engineStatus, isEngineRunning } = useDAWState();
    return { engineStatus, isEngineRunning };
}
