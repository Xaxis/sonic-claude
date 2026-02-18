/**
 * EffectsContext - React Context for effects state
 *
 * Provides ALL effects state to child components without prop-drilling:
 * - UI state (view settings, selection)
 * - Backend data (sequencer tracks, effect chains, effect definitions)
 * - Handlers (add/delete/update effects)
 *
 * This eliminates prop-drilling and creates a cohesive state machine.
 * Follows the exact pattern from MixerContext.
 */

import React, { createContext, useContext, ReactNode } from "react";
import type { EffectsState, EffectsActions } from "../hooks/useEffectsState";
import type { SequencerTrack } from "@/modules/sequencer/types";
import type { TrackEffectChain, EffectDefinition } from "@/services/effects";

interface EffectsContextValue {
    // UI State (from useEffectsState)
    state: EffectsState;
    actions: EffectsActions;

    // Backend Data (sequencer tracks with their effect chains)
    tracks: SequencerTrack[];
    effectChains: Record<string, TrackEffectChain>; // trackId -> effect chain
    effectDefinitions: EffectDefinition[];

    // Handlers (from useEffectsHandlers)
    handlers: {
        handleAddEffect: (trackId: string, effectName: string, slotIndex: number) => Promise<void>;
        handleDeleteEffect: (effectId: string, trackId: string) => Promise<void>;
        handleReorderEffect: (effectId: string, newSlotIndex: number, trackId: string) => Promise<void>;
        handleUpdateParameter: (effectId: string, paramName: string, value: number) => Promise<void>;
        handleToggleBypass: (effectId: string, trackId: string) => Promise<void>;
    };
}

const EffectsContext = createContext<EffectsContextValue | null>(null);

interface EffectsProviderProps {
    children: ReactNode;

    // UI State
    state: EffectsState;
    actions: EffectsActions;

    // Backend Data
    tracks: SequencerTrack[];
    effectChains: Record<string, TrackEffectChain>;
    effectDefinitions: EffectDefinition[];

    // Handlers
    handlers: EffectsContextValue["handlers"];
}

export function EffectsProvider({
    children,
    state,
    actions,
    tracks,
    effectChains,
    effectDefinitions,
    handlers,
}: EffectsProviderProps) {
    return (
        <EffectsContext.Provider
            value={{
                state,
                actions,
                tracks,
                effectChains,
                effectDefinitions,
                handlers,
            }}
        >
            {children}
        </EffectsContext.Provider>
    );
}

export function useEffectsContext() {
    const context = useContext(EffectsContext);
    if (!context) {
        throw new Error("useEffectsContext must be used within an EffectsProvider");
    }
    return context;
}

/**
 * Convenience hooks for accessing specific parts of the context
 */

// Get UI state and actions
export function useEffectsUIState() {
    const { state, actions } = useEffectsContext();
    return { state, actions };
}

// Get backend data
export function useEffectsData() {
    const { tracks, effectChains, effectDefinitions } = useEffectsContext();
    return { tracks, effectChains, effectDefinitions };
}

// Get handlers
export function useEffectsHandlers() {
    const { handlers } = useEffectsContext();
    return handlers;
}

