/**
 * SequencerContext - React Context for sequencer state
 *
 * Provides ALL sequencer state to child components without prop-drilling:
 * - UI state (zoom, snap, grid, loop settings, modals, etc.)
 * - Backend data (sequences, tracks, clips)
 * - Playback state (currentPosition, isPlaying, tempo)
 *
 * This eliminates prop-drilling and creates a cohesive state machine.
 */

import React, { createContext, useContext, ReactNode } from "react";
import type { SequencerState, SequencerActions } from "../hooks/useSequencerState.ts";
import type { Sequence, SequencerTrack, SequencerClip } from "../types.ts";

interface SequencerContextValue {
    // UI State (from useSequencerState)
    state: SequencerState;
    actions: SequencerActions;

    // Backend Data
    sequences: Sequence[];
    activeSequenceId: string | null;
    tracks: SequencerTrack[];
    clips: SequencerClip[];

    // Playback State
    currentPosition: number; // beats
    isPlaying: boolean;
    tempo: number;
}

const SequencerContext = createContext<SequencerContextValue | null>(null);

interface SequencerProviderProps {
    children: ReactNode;

    // UI State
    state: SequencerState;
    actions: SequencerActions;

    // Backend Data
    sequences: Sequence[];
    activeSequenceId: string | null;
    tracks: SequencerTrack[];
    clips: SequencerClip[];

    // Playback State
    currentPosition: number;
    isPlaying: boolean;
    tempo: number;
}

export function SequencerProvider({
    children,
    state,
    actions,
    sequences,
    activeSequenceId,
    tracks,
    clips,
    currentPosition,
    isPlaying,
    tempo,
}: SequencerProviderProps) {
    return (
        <SequencerContext.Provider value={{
            state,
            actions,
            sequences,
            activeSequenceId,
            tracks,
            clips,
            currentPosition,
            isPlaying,
            tempo,
        }}>
            {children}
        </SequencerContext.Provider>
    );
}

export function useSequencerContext() {
    const context = useContext(SequencerContext);
    if (!context) {
        throw new Error("useSequencerContext must be used within a SequencerProvider");
    }
    return context;
}

/**
 * Convenience hooks for accessing specific parts of the context
 */

// Get UI state and actions
export function useSequencerState() {
    const { state, actions } = useSequencerContext();
    return { state, actions };
}

// Get backend data
export function useSequencerData() {
    const { sequences, activeSequenceId, tracks, clips } = useSequencerContext();
    return { sequences, activeSequenceId, tracks, clips };
}

// Get playback state
export function useSequencerPlayback() {
    const { currentPosition, isPlaying, tempo } = useSequencerContext();
    return { currentPosition, isPlaying, tempo };
}

