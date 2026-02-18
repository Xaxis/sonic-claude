/**
 * useSequencerState - Custom hook for sequencer-specific state management
 *
 * Encapsulates all sequencer UI state (zoom, snap, grid, loop, recording, etc.)
 * Follows the same pattern as useTransportWebSocket, useMeterWebSocket, etc.
 *
 * This hook manages:
 * - Timeline view state (zoom, snap, grid)
 * - Playback state (recording, looping, pause)
 * - Selection state (selected clip, clipboard)
 * - Modal visibility state
 * - Piano roll state
 */

import { useState, useCallback } from "react";
import type { SequencerClip } from "../types.ts";

export interface SequencerState {
    // Timeline view
    zoom: number;
    snapEnabled: boolean;
    gridSize: number;

    // Playback
    isRecording: boolean;
    isLooping: boolean;
    isPaused: boolean;
    loopStart: number;
    loopEnd: number;

    // Selection & clipboard
    selectedClip: string | null;
    clipboardClip: SequencerClip | null;

    // Modals
    showSampleBrowser: boolean;
    showSequenceManager: boolean;
    showSequenceSettings: boolean;
    showTrackTypeDialog: boolean;

    // Piano Roll
    showPianoRoll: boolean;
    pianoRollClipId: string | null;

    // Sample Editor
    showSampleEditor: boolean;
    sampleEditorClipId: string | null;

    // Tempo input (local state for input field)
    tempoInput: string;
}

export interface SequencerActions {
    // Timeline view
    setZoom: (zoom: number) => void;
    setSnapEnabled: (enabled: boolean) => void;
    setGridSize: (size: number) => void;

    // Playback
    setIsRecording: (recording: boolean) => void;
    setIsLooping: (looping: boolean) => void;
    setIsPaused: (paused: boolean) => void;
    setLoopStart: (start: number) => void;
    setLoopEnd: (end: number) => void;

    // Selection & clipboard
    setSelectedClip: (clipId: string | null) => void;
    setClipboardClip: (clip: SequencerClip | null) => void;

    // Modals
    setShowSampleBrowser: (show: boolean) => void;
    setShowSequenceManager: (show: boolean) => void;
    setShowSequenceSettings: (show: boolean) => void;
    setShowTrackTypeDialog: (show: boolean) => void;

    // Piano Roll
    openPianoRoll: (clipId: string) => void;
    closePianoRoll: () => void;

    // Sample Editor
    openSampleEditor: (clipId: string) => void;
    closeSampleEditor: () => void;

    // Tempo input
    setTempoInput: (tempo: string) => void;

    // Convenience methods
    zoomIn: () => void;
    zoomOut: () => void;
    toggleSnap: () => void;
    toggleLoop: () => void;
}

export function useSequencerState(initialTempo: number = 120) {
    // Timeline view state
    const [zoom, setZoom] = useState(0.5);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [gridSize, setGridSize] = useState(16); // 1/16 note

    // Playback state
    const [isRecording, setIsRecording] = useState(false);
    const [isLooping, setIsLooping] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [loopStart, setLoopStart] = useState(0);
    const [loopEnd, setLoopEnd] = useState(16); // 4 bars

    // Selection & clipboard - don't persist selection
    const [selectedClip, setSelectedClip] = useState<string | null>(null);
    const [clipboardClip, setClipboardClip] = useState<SequencerClip | null>(null);

    // Modals
    const [showSampleBrowser, setShowSampleBrowser] = useState(false);
    const [showSequenceManager, setShowSequenceManager] = useState(false);
    const [showSequenceSettings, setShowSequenceSettings] = useState(false);
    const [showTrackTypeDialog, setShowTrackTypeDialog] = useState(false);

    // Piano Roll
    const [showPianoRoll, setShowPianoRoll] = useState(false);
    const [pianoRollClipId, setPianoRollClipId] = useState<string | null>(null);

    // Sample Editor
    const [showSampleEditor, setShowSampleEditor] = useState(false);
    const [sampleEditorClipId, setSampleEditorClipId] = useState<string | null>(null);

    // Tempo input
    const [tempoInput, setTempoInput] = useState(initialTempo.toString());

    // Convenience methods
    const zoomIn = useCallback(() => {
        setZoom((prev) => Math.min(prev * 1.2, 4));
    }, []);

    const zoomOut = useCallback(() => {
        setZoom((prev) => Math.max(prev / 1.2, 0.25));
    }, []);

    const toggleSnap = useCallback(() => {
        setSnapEnabled((prev) => !prev);
    }, []);

    const toggleLoop = useCallback(() => {
        setIsLooping((prev) => !prev);
    }, []);

    const openPianoRoll = useCallback((clipId: string) => {
        // Close sample editor if open (only one editor at a time)
        setShowSampleEditor(false);
        setSampleEditorClipId(null);

        // Open piano roll
        setPianoRollClipId(clipId);
        setShowPianoRoll(true);
        setSelectedClip(null); // Clear selection when opening editor
    }, []);

    const closePianoRoll = useCallback(() => {
        setShowPianoRoll(false);
        setPianoRollClipId(null);
    }, []);

    const openSampleEditor = useCallback((clipId: string) => {
        // Close piano roll if open (only one editor at a time)
        setShowPianoRoll(false);
        setPianoRollClipId(null);

        // Open sample editor
        setSampleEditorClipId(clipId);
        setShowSampleEditor(true);
        setSelectedClip(null); // Clear selection when opening editor
    }, []);

    const closeSampleEditor = useCallback(() => {
        setShowSampleEditor(false);
        setSampleEditorClipId(null);
    }, []);

    const state: SequencerState = {
        zoom,
        snapEnabled,
        gridSize,
        isRecording,
        isLooping,
        isPaused,
        loopStart,
        loopEnd,
        selectedClip,
        clipboardClip,
        showSampleBrowser,
        showSequenceManager,
        showSequenceSettings,
        showTrackTypeDialog,
        showPianoRoll,
        pianoRollClipId,
        showSampleEditor,
        sampleEditorClipId,
        tempoInput,
    };

    const actions: SequencerActions = {
        setZoom,
        setSnapEnabled,
        setGridSize,
        setIsRecording,
        setIsLooping,
        setIsPaused,
        setLoopStart,
        setLoopEnd,
        setSelectedClip,
        setClipboardClip,
        setShowSampleBrowser,
        setShowSequenceManager,
        setShowSequenceSettings,
        setShowTrackTypeDialog,
        openPianoRoll,
        closePianoRoll,
        openSampleEditor,
        closeSampleEditor,
        setTempoInput,
        zoomIn,
        zoomOut,
        toggleSnap,
        toggleLoop,
    };

    return { state, actions };
}

