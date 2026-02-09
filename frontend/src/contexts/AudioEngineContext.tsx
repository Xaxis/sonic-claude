/**
 * Audio Engine Context
 * Global state management for audio engine (synths, effects, mixer, sequencer)
 * Syncs across windows using BroadcastChannel
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { windowManager } from "@/services/WindowManager";
import type {
    AudioEngineStatus,
    Synth,
    Effect,
    MixerTrack,
    Sequence,
} from "@/types";

interface AudioEngineState {
    // Engine
    engineStatus: AudioEngineStatus | null;
    isEngineRunning: boolean;

    // Synthesis
    activeSynths: Synth[];

    // Effects
    activeEffects: Effect[];

    // Mixer
    tracks: MixerTrack[];
    masterTrack: MixerTrack | null;

    // Sequencer
    sequences: Sequence[];
    activeSequenceId: string | null;
    isPlaying: boolean;
    currentPosition: number;  // beats
}

interface AudioEngineContextValue extends AudioEngineState {
    // Engine actions
    setEngineStatus: (status: AudioEngineStatus) => void;
    setIsEngineRunning: (isRunning: boolean) => void;

    // Synthesis actions
    addSynth: (synth: Synth) => void;
    updateSynth: (synthId: string, synth: Synth) => void;
    removeSynth: (synthId: string) => void;
    setActiveSynths: (synths: Synth[]) => void;

    // Effects actions
    addEffect: (effect: Effect) => void;
    updateEffect: (effectId: string, effect: Effect) => void;
    removeEffect: (effectId: string) => void;
    setActiveEffects: (effects: Effect[]) => void;

    // Mixer actions
    addTrack: (track: MixerTrack) => void;
    updateTrack: (trackId: string, track: MixerTrack) => void;
    removeTrack: (trackId: string) => void;
    setTracks: (tracks: MixerTrack[]) => void;
    setMasterTrack: (track: MixerTrack) => void;

    // Sequencer actions
    addSequence: (sequence: Sequence) => void;
    updateSequence: (sequenceId: string, sequence: Sequence) => void;
    removeSequence: (sequenceId: string) => void;
    setSequences: (sequences: Sequence[]) => void;
    setActiveSequenceId: (sequenceId: string | null) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setCurrentPosition: (position: number) => void;
}

const AudioEngineContext = createContext<AudioEngineContextValue | undefined>(undefined);

const BROADCAST_CHANNEL = "audio-engine-state";

export function AudioEngineProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AudioEngineState>({
        engineStatus: null,
        isEngineRunning: false,
        activeSynths: [],
        activeEffects: [],
        tracks: [],
        masterTrack: null,
        sequences: [],
        activeSequenceId: null,
        isPlaying: false,
        currentPosition: 0,
    });

    // Broadcast state changes to other windows
    const broadcastUpdate = useCallback((key: string, value: any) => {
        windowManager.broadcastState(key, value);
    }, []);

    // Listen for state updates from other windows
    useEffect(() => {
        const unsubscribe = windowManager.subscribeToState("state-update", (data: any) => {
            if (data.key.startsWith("audioEngine.")) {
                const stateKey = data.key.replace("audioEngine.", "");
                setState((prev) => ({
                    ...prev,
                    [stateKey]: data.value,
                }));
            }
        });

        return unsubscribe;
    }, []);

    // Engine actions
    const setEngineStatus = useCallback((status: AudioEngineStatus) => {
        setState((prev) => ({ ...prev, engineStatus: status }));
        broadcastUpdate("audioEngine.engineStatus", status);
    }, [broadcastUpdate]);

    const setIsEngineRunning = useCallback((isRunning: boolean) => {
        setState((prev) => ({ ...prev, isEngineRunning: isRunning }));
        broadcastUpdate("audioEngine.isEngineRunning", isRunning);
    }, [broadcastUpdate]);

    // Synthesis actions
    const addSynth = useCallback((synth: Synth) => {
        setState((prev) => ({
            ...prev,
            activeSynths: [...prev.activeSynths, synth],
        }));
        broadcastUpdate("audioEngine.activeSynths", [...state.activeSynths, synth]);
    }, [broadcastUpdate, state.activeSynths]);

    const updateSynth = useCallback((synthId: string, synth: Synth) => {
        setState((prev) => ({
            ...prev,
            activeSynths: prev.activeSynths.map((s) => (s.id === synthId ? synth : s)),
        }));
    }, []);

    const removeSynth = useCallback((synthId: string) => {
        setState((prev) => ({
            ...prev,
            activeSynths: prev.activeSynths.filter((s) => s.id !== synthId),
        }));
    }, []);

    const setActiveSynths = useCallback((synths: Synth[]) => {
        setState((prev) => ({ ...prev, activeSynths: synths }));
        broadcastUpdate("audioEngine.activeSynths", synths);
    }, [broadcastUpdate]);



    // Effects actions
    const addEffect = useCallback((effect: Effect) => {
        setState((prev) => ({
            ...prev,
            activeEffects: [...prev.activeEffects, effect],
        }));
        broadcastUpdate("audioEngine.activeEffects", [...state.activeEffects, effect]);
    }, [broadcastUpdate, state.activeEffects]);

    const updateEffect = useCallback((effectId: string, effect: Effect) => {
        setState((prev) => ({
            ...prev,
            activeEffects: prev.activeEffects.map((e) => (e.id === effectId ? effect : e)),
        }));
    }, []);

    const removeEffect = useCallback((effectId: string) => {
        setState((prev) => ({
            ...prev,
            activeEffects: prev.activeEffects.filter((e) => e.id !== effectId),
        }));
    }, []);

    const setActiveEffects = useCallback((effects: Effect[]) => {
        setState((prev) => ({ ...prev, activeEffects: effects }));
        broadcastUpdate("audioEngine.activeEffects", effects);
    }, [broadcastUpdate]);

    // Mixer actions
    const addTrack = useCallback((track: MixerTrack) => {
        setState((prev) => ({
            ...prev,
            tracks: [...prev.tracks, track],
        }));
        broadcastUpdate("audioEngine.tracks", [...state.tracks, track]);
    }, [broadcastUpdate, state.tracks]);

    const updateTrack = useCallback((trackId: string, track: MixerTrack) => {
        setState((prev) => ({
            ...prev,
            tracks: prev.tracks.map((t) => (t.id === trackId ? track : t)),
        }));
    }, []);

    const removeTrack = useCallback((trackId: string) => {
        setState((prev) => ({
            ...prev,
            tracks: prev.tracks.filter((t) => t.id !== trackId),
        }));
    }, []);

    const setTracks = useCallback((tracks: MixerTrack[]) => {
        setState((prev) => ({ ...prev, tracks }));
        broadcastUpdate("audioEngine.tracks", tracks);
    }, [broadcastUpdate]);

    const setMasterTrack = useCallback((track: MixerTrack) => {
        setState((prev) => ({ ...prev, masterTrack: track }));
        broadcastUpdate("audioEngine.masterTrack", track);
    }, [broadcastUpdate]);

    // Sequencer actions
    const addSequence = useCallback((sequence: Sequence) => {
        setState((prev) => ({
            ...prev,
            sequences: [...prev.sequences, sequence],
        }));
        broadcastUpdate("audioEngine.sequences", [...state.sequences, sequence]);
    }, [broadcastUpdate, state.sequences]);

    const updateSequence = useCallback((sequenceId: string, sequence: Sequence) => {
        setState((prev) => ({
            ...prev,
            sequences: prev.sequences.map((s) => (s.id === sequenceId ? sequence : s)),
        }));
    }, []);

    const removeSequence = useCallback((sequenceId: string) => {
        setState((prev) => ({
            ...prev,
            sequences: prev.sequences.filter((s) => s.id !== sequenceId),
        }));
    }, []);

    const setSequences = useCallback((sequences: Sequence[]) => {
        setState((prev) => ({ ...prev, sequences }));
        broadcastUpdate("audioEngine.sequences", sequences);
    }, [broadcastUpdate]);

    const setActiveSequenceId = useCallback((sequenceId: string | null) => {
        setState((prev) => ({ ...prev, activeSequenceId: sequenceId }));
        broadcastUpdate("audioEngine.activeSequenceId", sequenceId);
    }, [broadcastUpdate]);

    const setIsPlaying = useCallback((isPlaying: boolean) => {
        setState((prev) => ({ ...prev, isPlaying }));
        broadcastUpdate("audioEngine.isPlaying", isPlaying);
    }, [broadcastUpdate]);

    const setCurrentPosition = useCallback((position: number) => {
        setState((prev) => ({ ...prev, currentPosition: position }));
        broadcastUpdate("audioEngine.currentPosition", position);
    }, [broadcastUpdate]);

    const value: AudioEngineContextValue = {
        ...state,
        setEngineStatus,
        setIsEngineRunning,
        addSynth,
        updateSynth,
        removeSynth,
        setActiveSynths,
        addEffect,
        updateEffect,
        removeEffect,
        setActiveEffects,
        addTrack,
        updateTrack,
        removeTrack,
        setTracks,
        setMasterTrack,
        addSequence,
        updateSequence,
        removeSequence,
        setSequences,
        setActiveSequenceId,
        setIsPlaying,
        setCurrentPosition,
    };

    return (
        <AudioEngineContext.Provider value={value}>
            {children}
        </AudioEngineContext.Provider>
    );
}

/**
 * Hook to access audio engine context
 */
export function useAudioEngine() {
    const context = useContext(AudioEngineContext);
    if (context === undefined) {
        throw new Error("useAudioEngine must be used within an AudioEngineProvider");
    }
    return context;
}