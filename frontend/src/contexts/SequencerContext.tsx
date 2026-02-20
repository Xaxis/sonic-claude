/**
 * SequencerContext - Global context for sequencer state (SOURCE OF TRUTH)
 *
 * This is the GLOBAL sequencer context that manages ALL sequencer state:
 * - Backend data (sequences, tracks, clips)
 * - Playback state (isPlaying, currentPosition, tempo)
 * - UI state (zoom, snap, grid, modals)
 * - Handlers (play, stop, pause, createSequence, addClip, etc.)
 * - Cross-window synchronization via BroadcastChannel
 *
 * This replaces the module-level SequencerContext and eliminates duplication
 * with AudioEngineContext.
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import { windowManager } from "@/services/window-manager";
import { api } from "@/services/api";
import { toast } from "sonner";
import type { Sequence, SequencerTrack, SequencerClip, SynthDefInfo } from "@/modules/sequencer/types";

// ============================================================================
// STATE TYPES
// ============================================================================

interface SequencerState {
    // Backend Data
    sequences: Sequence[];
    activeSequenceId: string | null;
    tracks: SequencerTrack[];
    clips: SequencerClip[];
    synthDefs: SynthDefInfo[];

    // Playback State
    isPlaying: boolean;
    currentPosition: number; // beats
    tempo: number;
    metronomeEnabled: boolean;

    // UI State (per-sequence settings)
    zoom: number;
    snapEnabled: boolean;
    gridSize: number;
    isRecording: boolean;
    isLooping: boolean;
    loopStart: number;
    loopEnd: number;

    // Selection & Modals
    selectedClipId: string | null;
    showSampleBrowser: boolean;
    showSequenceManager: boolean;
    showSequenceSettings: boolean;
    showPianoRoll: boolean;
    pianoRollClipId: string | null;

    // Dragging state (for optimistic updates)
    draggingClips: Map<string, { start_time: number; duration: number }>;
}

// ============================================================================
// CONTEXT VALUE TYPE
// ============================================================================

interface SequencerContextValue extends SequencerState {
    // Sequence Management
    loadSequences: () => Promise<void>;
    createSequence: (name: string, tempo?: number) => Promise<void>;
    deleteSequence: (id: string) => Promise<void>;
    setActiveSequenceId: (id: string | null) => void;

    // Playback Control
    playSequence: (id: string, position?: number) => Promise<void>;
    stopPlayback: () => Promise<void>;
    pausePlayback: () => Promise<void>;
    resumePlayback: () => Promise<void>;
    setTempo: (tempo: number) => Promise<void>;
    toggleMetronome: () => Promise<void>;

    // Track Management
    loadTracks: (sequenceId?: string) => Promise<void>;
    createTrack: (sequenceId: string, name: string, type: string, synthdef?: string) => Promise<void>;
    deleteTrack: (trackId: string) => Promise<void>;
    renameTrack: (trackId: string, name: string) => Promise<void>;
    muteTrack: (trackId: string, muted: boolean) => Promise<void>;
    soloTrack: (trackId: string, soloed: boolean) => Promise<void>;

    // Clip Management
    addClip: (request: any) => Promise<void>;
    updateClip: (clipId: string, request: any) => Promise<void>;
    deleteClip: (clipId: string) => Promise<void>;

    // UI Actions
    setZoom: (zoom: number) => void;
    setSnapEnabled: (enabled: boolean) => void;
    setGridSize: (size: number) => void;
    setSelectedClipId: (clipId: string | null) => void;
    openPianoRoll: (clipId: string) => void;
    closePianoRoll: () => void;
    setShowSampleBrowser: (show: boolean) => void;
    setShowSequenceManager: (show: boolean) => void;
    setShowSequenceSettings: (show: boolean) => void;

    // Dragging state
    setDraggingClip: (clipId: string, position: { start_time: number; duration: number } | null) => void;
}

const SequencerContext = createContext<SequencerContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function SequencerProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<SequencerState>({
        sequences: [],
        activeSequenceId: null,
        tracks: [],
        clips: [],
        synthDefs: [],
        isPlaying: false,
        currentPosition: 0,
        tempo: 120,
        metronomeEnabled: false,
        zoom: 0.5,
        snapEnabled: true,
        gridSize: 16,
        isRecording: false,
        isLooping: true,
        loopStart: 0,
        loopEnd: 16,
        selectedClipId: null,
        showSampleBrowser: false,
        showSequenceManager: false,
        showSequenceSettings: false,
        showPianoRoll: false,
        pianoRollClipId: null,
        draggingClips: new Map(),
    });

    // Broadcast state changes to other windows
    const broadcastUpdate = useCallback((key: string, value: any) => {
        windowManager.broadcastState(`sequencer.${key}`, value);
    }, []);

    // Listen for state updates from other windows
    useEffect(() => {
        const unsubscribers: (() => void)[] = [];

        // Subscribe to all sequencer state keys
        const keys = ['sequences', 'activeSequenceId', 'tracks', 'clips', 'isPlaying', 'currentPosition', 'tempo', 'metronomeEnabled'];
        keys.forEach(key => {
            const unsub = windowManager.subscribeToState(`sequencer.${key}`, (value: any) => {
                setState(prev => ({ ...prev, [key]: value }));
            });
            unsubscribers.push(unsub);
        });

        return () => unsubscribers.forEach(unsub => unsub());
    }, []);

    // ========================================================================
    // SEQUENCE MANAGEMENT
    // ========================================================================

    const loadSequences = useCallback(async () => {
        try {
            const sequences = await api.sequencer.getSequences();
            setState(prev => ({ ...prev, sequences: sequences as any[] }));
            broadcastUpdate('sequences', sequences);
        } catch (error) {
            console.error("Failed to load sequences:", error);
            toast.error("Failed to load sequences");
        }
    }, [broadcastUpdate]);

    const createSequence = useCallback(async (name: string, tempo: number = 120) => {
        try {
            const sequence = await api.sequencer.createSequence({
                name,
                tempo,
                time_signature_num: 4,
                time_signature_den: 4,
            });
            setState(prev => {
                const newSequences = [...prev.sequences, sequence as any];
                broadcastUpdate('sequences', newSequences);
                return { ...prev, sequences: newSequences, activeSequenceId: sequence.id };
            });
            toast.success(`Created sequence: ${name}`);
        } catch (error) {
            console.error("Failed to create sequence:", error);
            toast.error("Failed to create sequence");
        }
    }, [broadcastUpdate]);

    const deleteSequence = useCallback(async (id: string) => {
        try {
            await api.sequencer.deleteSequence(id);
            setState(prev => {
                const newSequences = prev.sequences.filter(s => s.id !== id);
                const newActiveId = prev.activeSequenceId === id
                    ? (newSequences[0]?.id || null)
                    : prev.activeSequenceId;
                broadcastUpdate('sequences', newSequences);
                broadcastUpdate('activeSequenceId', newActiveId);
                return { ...prev, sequences: newSequences, activeSequenceId: newActiveId };
            });
            toast.success("Sequence deleted");
        } catch (error) {
            console.error("Failed to delete sequence:", error);
            toast.error("Failed to delete sequence");
        }
    }, [broadcastUpdate]);

    const setActiveSequenceId = useCallback((id: string | null) => {
        setState(prev => ({ ...prev, activeSequenceId: id }));
        broadcastUpdate('activeSequenceId', id);
    }, [broadcastUpdate]);

    // ========================================================================
    // PLAYBACK CONTROL
    // ========================================================================

    const playSequence = useCallback(async (id: string, position?: number) => {
        try {
            await api.sequencer.play(id, position !== undefined ? { position } : undefined);
            setState(prev => ({ ...prev, isPlaying: true, activeSequenceId: id }));
            broadcastUpdate('isPlaying', true);
        } catch (error) {
            console.error("Failed to play sequence:", error);
            toast.error("Failed to play sequence");
        }
    }, [broadcastUpdate]);

    const stopPlayback = useCallback(async () => {
        if (!state.activeSequenceId) return;
        try {
            await api.sequencer.stop(state.activeSequenceId);
            setState(prev => ({ ...prev, isPlaying: false, currentPosition: 0 }));
            broadcastUpdate('isPlaying', false);
            broadcastUpdate('currentPosition', 0);
        } catch (error) {
            console.error("Failed to stop playback:", error);
            toast.error("Failed to stop playback");
        }
    }, [state.activeSequenceId, broadcastUpdate]);

    const pausePlayback = useCallback(async () => {
        if (!state.activeSequenceId) return;
        try {
            await api.sequencer.pause(state.activeSequenceId);
            setState(prev => ({ ...prev, isPlaying: false }));
            broadcastUpdate('isPlaying', false);
        } catch (error) {
            console.error("Failed to pause playback:", error);
            toast.error("Failed to pause playback");
        }
    }, [state.activeSequenceId, broadcastUpdate]);

    const resumePlayback = useCallback(async () => {
        if (!state.activeSequenceId) return;
        try {
            await api.sequencer.resume(state.activeSequenceId);
            setState(prev => ({ ...prev, isPlaying: true }));
            broadcastUpdate('isPlaying', true);
        } catch (error) {
            console.error("Failed to resume playback:", error);
            toast.error("Failed to resume playback");
        }
    }, [state.activeSequenceId, broadcastUpdate]);

    const setTempo = useCallback(async (tempo: number) => {
        if (!state.activeSequenceId) return;
        try {
            await api.sequencer.setTempo(state.activeSequenceId, { tempo });
            setState(prev => ({ ...prev, tempo }));
            broadcastUpdate('tempo', tempo);
        } catch (error) {
            console.error("Failed to set tempo:", error);
            toast.error("Failed to set tempo");
        }
    }, [state.activeSequenceId, broadcastUpdate]);

    const toggleMetronome = useCallback(async () => {
        try {
            const response = await api.sequencer.toggleMetronome();
            setState(prev => ({ ...prev, metronomeEnabled: response.enabled }));
            broadcastUpdate('metronomeEnabled', response.enabled);
        } catch (error) {
            console.error("Failed to toggle metronome:", error);
            toast.error("Failed to toggle metronome");
        }
    }, [broadcastUpdate]);

    // ========================================================================
    // TRACK MANAGEMENT
    // ========================================================================

    const loadTracks = useCallback(async (sequenceId?: string) => {
        const id = sequenceId || state.activeSequenceId;
        if (!id) return;
        try {
            const sequence = await api.sequencer.getSequence(id);
            setState(prev => ({ ...prev, tracks: sequence.tracks || [] }));
            broadcastUpdate('tracks', sequence.tracks || []);
        } catch (error) {
            console.error("Failed to load tracks:", error);
            toast.error("Failed to load tracks");
        }
    }, [state.activeSequenceId, broadcastUpdate]);

    const createTrack = useCallback(async (sequenceId: string, name: string, type: string, synthdef?: string) => {
        try {
            const track = await api.sequencer.createTrack({
                sequence_id: sequenceId,
                name,
                track_type: type as "midi" | "audio",
                synthdef,
            });
            setState(prev => {
                const newTracks = [...prev.tracks, track as any];
                broadcastUpdate('tracks', newTracks);
                return { ...prev, tracks: newTracks };
            });
            toast.success(`Created track: ${name}`);
        } catch (error) {
            console.error("Failed to create track:", error);
            toast.error("Failed to create track");
        }
    }, [broadcastUpdate]);

    const deleteTrack = useCallback(async (trackId: string) => {
        try {
            // Note: Backend route doesn't exist yet - this is a placeholder
            // await api.sequencer.deleteTrack(trackId);
            setState(prev => {
                const newTracks = prev.tracks.filter(t => t.id !== trackId);
                broadcastUpdate('tracks', newTracks);
                return { ...prev, tracks: newTracks };
            });
            toast.success("Track deleted");
        } catch (error) {
            console.error("Failed to delete track:", error);
            toast.error("Failed to delete track");
        }
    }, [broadcastUpdate]);

    const renameTrack = useCallback(async (trackId: string, name: string) => {
        try {
            await api.sequencer.updateTrack(trackId, { name });
            setState(prev => ({
                ...prev,
                tracks: prev.tracks.map(t => t.id === trackId ? { ...t, name } : t),
            }));
        } catch (error) {
            console.error("Failed to rename track:", error);
            toast.error("Failed to rename track");
        }
    }, []);

    const muteTrack = useCallback(async (trackId: string, muted: boolean) => {
        try {
            await api.sequencer.muteTrack(trackId, { muted });
            setState(prev => ({
                ...prev,
                tracks: prev.tracks.map(t => t.id === trackId ? { ...t, is_muted: muted } : t),
            }));
        } catch (error) {
            console.error("Failed to mute track:", error);
            toast.error("Failed to mute track");
        }
    }, []);

    const soloTrack = useCallback(async (trackId: string, soloed: boolean) => {
        try {
            await api.sequencer.soloTrack(trackId, { soloed });
            setState(prev => ({
                ...prev,
                tracks: prev.tracks.map(t => t.id === trackId ? { ...t, is_solo: soloed } : t),
            }));
        } catch (error) {
            console.error("Failed to solo track:", error);
            toast.error("Failed to solo track");
        }
    }, []);

    // ========================================================================
    // CLIP MANAGEMENT
    // ========================================================================

    const addClip = useCallback(async (request: any) => {
        try {
            const clip = await api.sequencer.addClip(request);
            setState(prev => {
                const newClips = [...prev.clips, clip as any];
                return { ...prev, clips: newClips };
            });
            toast.success("Clip added");
        } catch (error) {
            console.error("Failed to add clip:", error);
            toast.error("Failed to add clip");
        }
    }, []);

    const updateClip = useCallback(async (clipId: string, request: any) => {
        try {
            const updatedClip = await api.sequencer.updateClip(clipId, request);
            setState(prev => ({
                ...prev,
                clips: prev.clips.map(c => c.id === clipId ? updatedClip as any : c),
            }));
        } catch (error) {
            console.error("Failed to update clip:", error);
            toast.error("Failed to update clip");
        }
    }, []);

    const deleteClip = useCallback(async (clipId: string) => {
        try {
            await api.sequencer.deleteClip(clipId);
            setState(prev => ({
                ...prev,
                clips: prev.clips.filter(c => c.id !== clipId),
            }));
            toast.success("Clip deleted");
        } catch (error) {
            console.error("Failed to delete clip:", error);
            toast.error("Failed to delete clip");
        }
    }, []);

    // ========================================================================
    // UI ACTIONS
    // ========================================================================

    const setZoom = useCallback((zoom: number) => {
        setState(prev => ({ ...prev, zoom }));
    }, []);

    const setSnapEnabled = useCallback((enabled: boolean) => {
        setState(prev => ({ ...prev, snapEnabled: enabled }));
    }, []);

    const setGridSize = useCallback((size: number) => {
        setState(prev => ({ ...prev, gridSize: size }));
    }, []);

    const setSelectedClipId = useCallback((clipId: string | null) => {
        setState(prev => ({ ...prev, selectedClipId: clipId }));
    }, []);

    const openPianoRoll = useCallback((clipId: string) => {
        setState(prev => ({ ...prev, showPianoRoll: true, pianoRollClipId: clipId }));
    }, []);

    const closePianoRoll = useCallback(() => {
        setState(prev => ({ ...prev, showPianoRoll: false, pianoRollClipId: null }));
    }, []);

    const setShowSampleBrowser = useCallback((show: boolean) => {
        setState(prev => ({ ...prev, showSampleBrowser: show }));
    }, []);

    const setShowSequenceManager = useCallback((show: boolean) => {
        setState(prev => ({ ...prev, showSequenceManager: show }));
    }, []);

    const setShowSequenceSettings = useCallback((show: boolean) => {
        setState(prev => ({ ...prev, showSequenceSettings: show }));
    }, []);

    const setDraggingClip = useCallback((clipId: string, position: { start_time: number; duration: number } | null) => {
        setState(prev => {
            const newDraggingClips = new Map(prev.draggingClips);
            if (position) {
                newDraggingClips.set(clipId, position);
            } else {
                newDraggingClips.delete(clipId);
            }
            return { ...prev, draggingClips: newDraggingClips };
        });
    }, []);

    // ========================================================================
    // CONTEXT VALUE
    // ========================================================================

    const value: SequencerContextValue = {
        ...state,
        loadSequences,
        createSequence,
        deleteSequence,
        setActiveSequenceId,
        playSequence,
        stopPlayback,
        pausePlayback,
        resumePlayback,
        setTempo,
        toggleMetronome,
        loadTracks,
        createTrack,
        deleteTrack,
        renameTrack,
        muteTrack,
        soloTrack,
        addClip,
        updateClip,
        deleteClip,
        setZoom,
        setSnapEnabled,
        setGridSize,
        setSelectedClipId,
        openPianoRoll,
        closePianoRoll,
        setShowSampleBrowser,
        setShowSequenceManager,
        setShowSequenceSettings,
        setDraggingClip,
    };

    return (
        <SequencerContext.Provider value={value}>
            {children}
        </SequencerContext.Provider>
    );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useSequencer() {
    const context = useContext(SequencerContext);
    if (context === undefined) {
        throw new Error("useSequencer must be used within a SequencerProvider");
    }
    return context;
}

// Convenience hooks for accessing specific parts of the context
export function useSequencerData() {
    const { sequences, activeSequenceId, tracks, clips } = useSequencer();
    return { sequences, activeSequenceId, tracks, clips };
}

export function useSequencerPlayback() {
    const { isPlaying, currentPosition, tempo, metronomeEnabled, playSequence, stopPlayback, pausePlayback, resumePlayback, setTempo, toggleMetronome } = useSequencer();
    return { isPlaying, currentPosition, tempo, metronomeEnabled, playSequence, stopPlayback, pausePlayback, resumePlayback, setTempo, toggleMetronome };
}

export function useSequencerUI() {
    const { zoom, snapEnabled, gridSize, selectedClipId, showPianoRoll, pianoRollClipId, setZoom, setSnapEnabled, setGridSize, setSelectedClipId, openPianoRoll, closePianoRoll } = useSequencer();
    return { zoom, snapEnabled, gridSize, selectedClipId, showPianoRoll, pianoRollClipId, setZoom, setSnapEnabled, setGridSize, setSelectedClipId, openPianoRoll, closePianoRoll };
}

