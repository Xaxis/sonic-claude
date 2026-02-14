/**
 * usePianoRollState - Piano roll specific state management
 * 
 * Manages piano roll UI state separate from timeline:
 * - Piano roll zoom (independent from timeline zoom)
 * - Piano roll grid size (independent from timeline grid)
 * - Piano roll snap enabled (independent from timeline snap)
 * 
 * This allows users to have fine-grained zoom in piano roll
 * while keeping broader zoom on timeline.
 */

import { useState, useCallback } from "react";

export interface PianoRollState {
    // Piano roll specific zoom (independent from timeline)
    pianoRollZoom: number;
    
    // Piano roll specific grid (independent from timeline)
    pianoRollSnapEnabled: boolean;
    pianoRollGridSize: number;
}

export interface PianoRollActions {
    setPianoRollZoom: (zoom: number) => void;
    setPianoRollSnapEnabled: (enabled: boolean) => void;
    setPianoRollGridSize: (size: number) => void;
    zoomInPianoRoll: () => void;
    zoomOutPianoRoll: () => void;
    togglePianoRollSnap: () => void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.25;

export function usePianoRollState() {
    // Piano roll starts with more zoom than timeline for detailed editing
    const [pianoRollZoom, setPianoRollZoom] = useState(1.0);
    const [pianoRollSnapEnabled, setPianoRollSnapEnabled] = useState(true);
    const [pianoRollGridSize, setPianoRollGridSize] = useState(16); // 1/16 note

    const zoomInPianoRoll = useCallback(() => {
        setPianoRollZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
    }, []);

    const zoomOutPianoRoll = useCallback(() => {
        setPianoRollZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
    }, []);

    const togglePianoRollSnap = useCallback(() => {
        setPianoRollSnapEnabled((prev) => !prev);
    }, []);

    const state: PianoRollState = {
        pianoRollZoom,
        pianoRollSnapEnabled,
        pianoRollGridSize,
    };

    const actions: PianoRollActions = {
        setPianoRollZoom,
        setPianoRollSnapEnabled,
        setPianoRollGridSize,
        zoomInPianoRoll,
        zoomOutPianoRoll,
        togglePianoRollSnap,
    };

    return { state, actions };
}

