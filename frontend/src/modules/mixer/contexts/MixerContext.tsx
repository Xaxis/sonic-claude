/**
 * MixerContext - React Context for mixer state
 *
 * Provides ALL mixer state to child components without prop-drilling:
 * - UI state (view settings, selection)
 * - Backend data (sequencer tracks as mixer channels, master)
 * - Handlers (update track volume/pan/mute/solo)
 *
 * This eliminates prop-drilling and creates a cohesive state machine.
 */

import React, { createContext, useContext, ReactNode } from "react";
import type { MixerState, MixerActions } from "../hooks/useMixerState";
import type { MasterChannel } from "../types";
import type { SequencerTrack } from "@/modules/sequencer/types";
import type { TrackMeters } from "@/hooks/useMeterWebsocket";

interface MixerContextValue {
    // UI State (from useMixerState)
    state: MixerState;
    actions: MixerActions;

    // Backend Data (sequencer tracks displayed as mixer channels)
    tracks: SequencerTrack[];
    master: MasterChannel;

    // Real-time metering data (from WebSocket)
    meters: TrackMeters;

    // Handlers (from useMixerHandlers)
    handlers: {
        handleFaderChange: (trackId: string, volume: number) => Promise<void>;
        handleMasterFaderChange: (fader: number) => Promise<void>;
        handlePanChange: (trackId: string, pan: number) => Promise<void>;
        handleToggleMute: (trackId: string) => Promise<void>;
        handleToggleSolo: (trackId: string) => Promise<void>;
        handleToggleLimiter: () => Promise<void>;
        handleLimiterThresholdChange: (threshold: number) => Promise<void>;
    };
}

const MixerContext = createContext<MixerContextValue | null>(null);

interface MixerProviderProps {
    children: ReactNode;

    // UI State
    state: MixerState;
    actions: MixerActions;

    // Backend Data
    tracks: SequencerTrack[];
    master: MasterChannel;

    // Real-time metering
    meters: TrackMeters;

    // Handlers
    handlers: MixerContextValue["handlers"];
}

export function MixerProvider({
    children,
    state,
    actions,
    tracks,
    master,
    meters,
    handlers,
}: MixerProviderProps) {
    return (
        <MixerContext.Provider
            value={{
                state,
                actions,
                tracks,
                master,
                meters,
                handlers,
            }}
        >
            {children}
        </MixerContext.Provider>
    );
}

export function useMixerContext() {
    const context = useContext(MixerContext);
    if (!context) {
        throw new Error("useMixerContext must be used within a MixerProvider");
    }
    return context;
}

/**
 * Convenience hooks for accessing specific parts of the context
 */

// Get UI state and actions
export function useMixerUIState() {
    const { state, actions } = useMixerContext();
    return { state, actions };
}

// Get backend data
export function useMixerData() {
    const { tracks, master } = useMixerContext();
    return { tracks, master };
}

// Get handlers
export function useMixerHandlers() {
    const { handlers } = useMixerContext();
    return handlers;
}

