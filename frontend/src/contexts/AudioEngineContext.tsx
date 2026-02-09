/**
 * Audio Engine Context
 * Global state management for audio engine (synths, effects, mixer, sequencer)
 * Syncs across windows using BroadcastChannel
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { windowManager } from "@/services/WindowManager";
import { audioEngineService } from "@/services/api/audio-engine.service";
import type { AudioEngineStatus } from "@/types";
import type { Synth } from "@/components/features/synthesis";
import type { Effect } from "@/components/features/effects";
import type { MixerTrack } from "@/components/features/mixer";
import type { Sequence } from "@/components/features/sequencer";

interface AudioEngineState {
    // Engine
    engineStatus: AudioEngineStatus | null;
    isEngineRunning: boolean;

    // Synthesis
    activeSynths: Synth[];
    synthDefs: any[];  // Available synth definitions

    // Effects
    activeEffects: Effect[];
    effectDefs: any[];  // Available effect definitions

    // Mixer
    tracks: MixerTrack[];
    masterTrack: MixerTrack | null;

    // Sequencer
    sequences: Sequence[];
    activeSequenceId: string | null;
    isPlaying: boolean;
    currentPosition: number;  // beats
    tempo: number;  // BPM

    // Real-time data (from WebSockets)
    spectrum: number[];
    meters: Record<string, { peakL: number; peakR: number; rmsL: number; rmsR: number }>;
    waveform: { left: number[]; right: number[] };
    analytics: {
        cpu: number;
        memory: number;
        activeVoices: number;
        bufferLoad: number;
    };
}

interface AudioEngineContextValue extends AudioEngineState {
    // Engine actions
    setEngineStatus: (status: AudioEngineStatus) => void;
    setIsEngineRunning: (isRunning: boolean) => void;

    // Synthesis actions (API-integrated)
    loadSynthDefs: () => Promise<void>;
    createSynth: (synthdef: string, parameters?: Record<string, number>) => Promise<void>;
    updateSynthParameter: (synthId: number, parameter: string, value: number) => Promise<void>;
    deleteSynth: (synthId: number) => Promise<void>;
    setActiveSynths: (synths: Synth[]) => void;

    // Effects actions (API-integrated)
    loadEffectDefs: () => Promise<void>;
    createEffect: (effectdef: string, parameters?: Record<string, number>) => Promise<void>;
    updateEffectParameter: (effectId: number, parameter: string, value: number) => Promise<void>;
    deleteEffect: (effectId: number) => Promise<void>;
    bypassEffect: (effectId: number, bypass: boolean) => Promise<void>;
    setActiveEffects: (effects: Effect[]) => void;

    // Mixer actions (API-integrated)
    loadTracks: () => Promise<void>;
    createTrack: (name: string, type: string) => Promise<void>;
    updateTrackVolume: (trackId: string, volume: number) => Promise<void>;
    updateTrackPan: (trackId: string, pan: number) => Promise<void>;
    muteTrack: (trackId: string, muted: boolean) => Promise<void>;
    soloTrack: (trackId: string, soloed: boolean) => Promise<void>;
    deleteTrack: (trackId: string) => Promise<void>;
    setTracks: (tracks: MixerTrack[]) => void;
    setMasterTrack: (track: MixerTrack) => void;

    // Sequencer actions (API-integrated)
    loadSequences: () => Promise<void>;
    createSequence: (name: string, tempo?: number) => Promise<void>;
    deleteSequence: (sequenceId: string) => Promise<void>;
    playSequence: (sequenceId: string) => Promise<void>;
    stopPlayback: () => Promise<void>;
    setTempo: (tempo: number) => Promise<void>;
    setSequences: (sequences: Sequence[]) => void;
    setActiveSequenceId: (sequenceId: string | null) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setCurrentPosition: (position: number) => void;
    setTempoValue: (tempo: number) => void;

    // Real-time data setters (called by WebSocket hooks)
    setSpectrum: (spectrum: number[]) => void;
    setMeters: (meters: Record<string, { peakL: number; peakR: number; rmsL: number; rmsR: number }>) => void;
    setWaveform: (waveform: { left: number[]; right: number[] }) => void;
    setAnalytics: (analytics: { cpu: number; memory: number; activeVoices: number; bufferLoad: number }) => void;
}

const AudioEngineContext = createContext<AudioEngineContextValue | undefined>(undefined);

// TODO: Implement BroadcastChannel for multi-window state sync
// const BROADCAST_CHANNEL = "audio-engine-state";

export function AudioEngineProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AudioEngineState>({
        engineStatus: null,
        isEngineRunning: false,
        activeSynths: [],
        synthDefs: [],
        activeEffects: [],
        effectDefs: [],
        tracks: [],
        masterTrack: null,
        sequences: [],
        activeSequenceId: null,
        isPlaying: false,
        currentPosition: 0,
        tempo: 120,
        spectrum: [],
        meters: {},
        waveform: { left: [], right: [] },
        analytics: { cpu: 0, memory: 0, activeVoices: 0, bufferLoad: 0 },
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

    // Synthesis actions (API-integrated)
    const loadSynthDefs = useCallback(async () => {
        try {
            const defs = await audioEngineService.getSynthDefs();
            setState((prev) => ({ ...prev, synthDefs: defs as any[] }));
            broadcastUpdate("audioEngine.synthDefs", defs);
        } catch (error) {
            console.error("Failed to load synth definitions:", error);
        }
    }, [broadcastUpdate]);

    const createSynth = useCallback(async (synthdef: string, parameters?: Record<string, number>) => {
        try {
            const synth = await audioEngineService.createSynth({
                synthdef,
                parameters: parameters || {},
            });
            setState((prev) => ({
                ...prev,
                activeSynths: [...prev.activeSynths, synth as any],
            }));
            broadcastUpdate("audioEngine.activeSynths", [...state.activeSynths, synth]);
        } catch (error) {
            console.error("Failed to create synth:", error);
        }
    }, [broadcastUpdate, state.activeSynths]);

    const updateSynthParameter = useCallback(async (synthId: number, parameter: string, value: number) => {
        try {
            await audioEngineService.updateSynth(synthId.toString(), {
                parameters: { [parameter]: value },
            });
            setState((prev) => ({
                ...prev,
                activeSynths: prev.activeSynths.map((s) =>
                    (s as any).id === synthId
                        ? { ...s, parameters: { ...(s as any).parameters, [parameter]: value } }
                        : s
                ),
            }));
        } catch (error) {
            console.error("Failed to update synth parameter:", error);
        }
    }, []);

    const deleteSynth = useCallback(async (synthId: number) => {
        try {
            await audioEngineService.freeSynth(synthId.toString());
            setState((prev) => ({
                ...prev,
                activeSynths: prev.activeSynths.filter((s) => (s as any).id !== synthId),
            }));
        } catch (error) {
            console.error("Failed to delete synth:", error);
        }
    }, []);

    const setActiveSynths = useCallback((synths: Synth[]) => {
        setState((prev) => ({ ...prev, activeSynths: synths }));
        broadcastUpdate("audioEngine.activeSynths", synths);
    }, [broadcastUpdate]);



    // Effects actions (API-integrated)
    const loadEffectDefs = useCallback(async () => {
        try {
            const defs = await audioEngineService.getEffectDefs();
            setState((prev) => ({ ...prev, effectDefs: defs as any[] }));
            broadcastUpdate("audioEngine.effectDefs", defs);
        } catch (error) {
            console.error("Failed to load effect definitions:", error);
        }
    }, [broadcastUpdate]);

    const createEffect = useCallback(async (effectdef: string, parameters?: Record<string, number>) => {
        try {
            const effect = await audioEngineService.createEffect({
                effectdef,
                parameters: parameters || {},
            });
            setState((prev) => ({
                ...prev,
                activeEffects: [...prev.activeEffects, effect as any],
            }));
            broadcastUpdate("audioEngine.activeEffects", [...state.activeEffects, effect]);
        } catch (error) {
            console.error("Failed to create effect:", error);
        }
    }, [broadcastUpdate, state.activeEffects]);

    const updateEffectParameter = useCallback(async (effectId: number, parameter: string, value: number) => {
        try {
            await audioEngineService.updateEffect(effectId.toString(), {
                parameters: { [parameter]: value },
            });
            setState((prev) => ({
                ...prev,
                activeEffects: prev.activeEffects.map((e) =>
                    (e as any).id === effectId
                        ? { ...e, parameters: { ...(e as any).parameters, [parameter]: value } }
                        : e
                ),
            }));
        } catch (error) {
            console.error("Failed to update effect parameter:", error);
        }
    }, []);

    const deleteEffect = useCallback(async (effectId: number) => {
        try {
            await audioEngineService.freeEffect(effectId.toString());
            setState((prev) => ({
                ...prev,
                activeEffects: prev.activeEffects.filter((e) => (e as any).id !== effectId),
            }));
        } catch (error) {
            console.error("Failed to delete effect:", error);
        }
    }, []);

    const bypassEffect = useCallback(async (effectId: number, bypass: boolean) => {
        try {
            // Note: Backend doesn't have bypass endpoint yet, just update local state
            setState((prev) => ({
                ...prev,
                activeEffects: prev.activeEffects.map((e) =>
                    (e as any).id === effectId ? { ...e, is_active: !bypass } : e
                ),
            }));
        } catch (error) {
            console.error("Failed to bypass effect:", error);
        }
    }, []);

    const setActiveEffects = useCallback((effects: Effect[]) => {
        setState((prev) => ({ ...prev, activeEffects: effects }));
        broadcastUpdate("audioEngine.activeEffects", effects);
    }, [broadcastUpdate]);

    // Mixer actions (API-integrated)
    const loadTracks = useCallback(async () => {
        try {
            const tracks = await audioEngineService.getTracks();
            setState((prev) => ({ ...prev, tracks: tracks as any[] }));
            broadcastUpdate("audioEngine.tracks", tracks);
        } catch (error) {
            console.error("Failed to load tracks:", error);
        }
    }, [broadcastUpdate]);

    const createTrack = useCallback(async (name: string, _type: string) => {
        try {
            const track = await audioEngineService.createTrack({ name });
            setState((prev) => ({
                ...prev,
                tracks: [...prev.tracks, track as any],
            }));
            broadcastUpdate("audioEngine.tracks", [...state.tracks, track]);
        } catch (error) {
            console.error("Failed to create track:", error);
        }
    }, [broadcastUpdate, state.tracks]);

    const updateTrackVolume = useCallback(async (trackId: string, volume: number) => {
        try {
            await audioEngineService.setTrackVolume(trackId, { volume });
            setState((prev) => ({
                ...prev,
                tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, volume } : t)),
            }));
        } catch (error) {
            console.error("Failed to update track volume:", error);
        }
    }, []);

    const updateTrackPan = useCallback(async (trackId: string, pan: number) => {
        try {
            await audioEngineService.setTrackPan(trackId, { pan });
            setState((prev) => ({
                ...prev,
                tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, pan } : t)),
            }));
        } catch (error) {
            console.error("Failed to update track pan:", error);
        }
    }, []);

    const muteTrack = useCallback(async (trackId: string, muted: boolean) => {
        try {
            if (muted) {
                await audioEngineService.muteTrack(trackId);
            } else {
                await audioEngineService.unmuteTrack(trackId);
            }
            setState((prev) => ({
                ...prev,
                tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, is_muted: muted } : t)),
            }));
        } catch (error) {
            console.error("Failed to mute track:", error);
        }
    }, []);

    const soloTrack = useCallback(async (trackId: string, soloed: boolean) => {
        try {
            if (soloed) {
                await audioEngineService.soloTrack(trackId);
            } else {
                await audioEngineService.unsoloTrack(trackId);
            }
            setState((prev) => ({
                ...prev,
                tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, is_solo: soloed } : t)),
            }));
        } catch (error) {
            console.error("Failed to solo track:", error);
        }
    }, []);

    const deleteTrack = useCallback(async (trackId: string) => {
        try {
            await audioEngineService.deleteTrack(trackId);
            setState((prev) => ({
                ...prev,
                tracks: prev.tracks.filter((t) => t.id !== trackId),
            }));
        } catch (error) {
            console.error("Failed to delete track:", error);
        }
    }, []);

    const setTracks = useCallback((tracks: MixerTrack[]) => {
        setState((prev) => ({ ...prev, tracks }));
        broadcastUpdate("audioEngine.tracks", tracks);
    }, [broadcastUpdate]);

    const setMasterTrack = useCallback((track: MixerTrack) => {
        setState((prev) => ({ ...prev, masterTrack: track }));
        broadcastUpdate("audioEngine.masterTrack", track);
    }, [broadcastUpdate]);

    // Sequencer actions (API-integrated)
    const loadSequences = useCallback(async () => {
        try {
            const sequences = await audioEngineService.getSequences();
            setState((prev) => ({ ...prev, sequences: sequences as any[] }));
            broadcastUpdate("audioEngine.sequences", sequences);
        } catch (error) {
            console.error("Failed to load sequences:", error);
        }
    }, [broadcastUpdate]);

    const createSequence = useCallback(async (name: string, tempo?: number) => {
        try {
            const sequence = await audioEngineService.createSequence({
                name,
                tempo: tempo || 120,
                time_signature: "4/4",
            });
            setState((prev) => ({
                ...prev,
                sequences: [...prev.sequences, sequence as any],
            }));
            broadcastUpdate("audioEngine.sequences", [...state.sequences, sequence]);
        } catch (error) {
            console.error("Failed to create sequence:", error);
        }
    }, [broadcastUpdate, state.sequences]);

    const deleteSequence = useCallback(async (sequenceId: string) => {
        try {
            await audioEngineService.deleteSequence(sequenceId);
            setState((prev) => ({
                ...prev,
                sequences: prev.sequences.filter((s) => s.id !== sequenceId),
            }));
        } catch (error) {
            console.error("Failed to delete sequence:", error);
        }
    }, []);

    const playSequence = useCallback(async (sequenceId: string) => {
        try {
            await audioEngineService.playSequence(sequenceId);
            setState((prev) => ({
                ...prev,
                activeSequenceId: sequenceId,
                isPlaying: true,
            }));
            broadcastUpdate("audioEngine.isPlaying", true);
            broadcastUpdate("audioEngine.activeSequenceId", sequenceId);
        } catch (error) {
            console.error("Failed to play sequence:", error);
        }
    }, [broadcastUpdate]);

    const stopPlayback = useCallback(async () => {
        try {
            await audioEngineService.stopAll();
            setState((prev) => ({
                ...prev,
                isPlaying: false,
                currentPosition: 0,
            }));
            broadcastUpdate("audioEngine.isPlaying", false);
            broadcastUpdate("audioEngine.currentPosition", 0);
        } catch (error) {
            console.error("Failed to stop playback:", error);
        }
    }, [broadcastUpdate]);

    const setTempo = useCallback(async (tempo: number) => {
        try {
            // Set tempo on active sequence if one exists
            if (state.activeSequenceId) {
                await audioEngineService.setTempo(state.activeSequenceId, { tempo });
            }
            setState((prev) => ({ ...prev, tempo }));
            broadcastUpdate("audioEngine.tempo", tempo);
        } catch (error) {
            console.error("Failed to set tempo:", error);
        }
    }, [broadcastUpdate, state.activeSequenceId]);

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

    const setTempoValue = useCallback((tempo: number) => {
        setState((prev) => ({ ...prev, tempo }));
        broadcastUpdate("audioEngine.tempo", tempo);
    }, [broadcastUpdate]);

    // Real-time data setters (called by WebSocket hooks)
    const setSpectrum = useCallback((spectrum: number[]) => {
        setState((prev) => ({ ...prev, spectrum }));
        // Don't broadcast real-time data (too frequent)
    }, []);

    const setMeters = useCallback((meters: Record<string, { peakL: number; peakR: number; rmsL: number; rmsR: number }>) => {
        setState((prev) => ({ ...prev, meters }));
        // Don't broadcast real-time data (too frequent)
    }, []);

    const setWaveform = useCallback((waveform: { left: number[]; right: number[] }) => {
        setState((prev) => ({ ...prev, waveform }));
        // Don't broadcast real-time data (too frequent)
    }, []);

    const setAnalytics = useCallback((analytics: { cpu: number; memory: number; activeVoices: number; bufferLoad: number }) => {
        setState((prev) => ({ ...prev, analytics }));
        // Don't broadcast real-time data (too frequent)
    }, []);

    const value: AudioEngineContextValue = {
        ...state,
        setEngineStatus,
        setIsEngineRunning,
        // Synthesis
        loadSynthDefs,
        createSynth,
        updateSynthParameter,
        deleteSynth,
        setActiveSynths,
        // Effects
        loadEffectDefs,
        createEffect,
        updateEffectParameter,
        deleteEffect,
        bypassEffect,
        setActiveEffects,
        // Mixer
        loadTracks,
        createTrack,
        updateTrackVolume,
        updateTrackPan,
        muteTrack,
        soloTrack,
        deleteTrack,
        setTracks,
        setMasterTrack,
        // Sequencer
        loadSequences,
        createSequence,
        deleteSequence,
        playSequence,
        stopPlayback,
        setTempo,
        setSequences,
        setActiveSequenceId,
        setIsPlaying,
        setCurrentPosition,
        setTempoValue,
        // Real-time data
        setSpectrum,
        setMeters,
        setWaveform,
        setAnalytics,
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