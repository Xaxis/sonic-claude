/**
 * Audio Engine Context
 * Global state management for audio engine (synths, effects, mixer, sequencer)
 * Syncs across windows using BroadcastChannel
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
    useRef,
} from "react";
import { windowManager } from "@/services/window-manager";
import { audioEngineService } from "@/services/audio-engine/audio-engine.service";
import { api } from "@/services/api";
import { toast } from "sonner";
import type { AudioEngineStatus } from "@/types";
import type { Synth } from "@/modules/synthesis";
import type { Effect } from "@/modules/effects";
import type { MixerTrack } from "@/modules/mixer";
import type { Sequence } from "@/modules/sequencer";

// Import refactored WebSocket hooks
import { useTransportWebSocket } from "@/hooks/useTransportWebsocket";
import { useSpectrumWebSocket } from "@/hooks/useSpectrumWebsocket";
import { useWaveformWebSocket } from "@/hooks/useWaveformWebsocket";
import { useMeterWebSocket } from "@/hooks/useMeterWebsocket";

// Global composition change callback (set by CompositionContext)
let compositionChangeCallback: (() => void) | null = null;

export function setCompositionChangeCallback(callback: (() => void) | null) {
    compositionChangeCallback = callback;
}

function notifyCompositionChanged() {
    if (compositionChangeCallback) {
        compositionChangeCallback();
    }
}

interface AudioEngineState {
    // Engine
    engineStatus: AudioEngineStatus | null;
    isEngineRunning: boolean;

    // Synthesis
    activeSynths: Synth[];
    synthDefs: any[];

    // Effects
    activeEffects: Effect[];
    effectDefs: any[];

    // Mixer
    tracks: MixerTrack[];
    masterTrack: MixerTrack | null;

    // Sequencer
    sequences: Sequence[];
    activeSequenceId: string | null;
    sequencerTracks: any[]; // Sequencer tracks (separate from mixer tracks)
    isPlaying: boolean;
    currentPosition: number; // beats
    tempo: number; // BPM
    metronomeEnabled: boolean;

    // Dragging clips cache (for optimistic updates during drag)
    draggingClips: Map<string, { start_time: number; duration: number }>;

    // Real-time data (from WebSockets - SuperCollider output monitoring)
    spectrum: number[];
    meters: Record<string, { peakL: number; peakR: number; rmsL: number; rmsR: number }>;
    waveform: { left: number[]; right: number[] };
    analytics: {
        cpu: number;
        memory: number;
        activeVoices: number;
        bufferLoad: number;
    };

    // Real-time data (from browser audio input - system audio capture)
    inputSpectrum: number[];
    inputWaveform: { left: number[]; right: number[] };
    inputLevel: number; // dB
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
    pausePlayback: () => Promise<void>;
    resumePlayback: () => Promise<void>;
    setTempo: (tempo: number) => Promise<void>;
    toggleMetronome: () => Promise<void>;
    setSequences: (sequences: Sequence[]) => void;
    setActiveSequenceId: (sequenceId: string | null) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setCurrentPosition: (position: number) => void;
    setTempoValue: (tempo: number) => void;
    setMetronomeEnabled: (enabled: boolean) => void;

    // Clip actions (API-integrated)
    addClip: (sequenceId: string, request: any) => Promise<any>;
    updateClip: (sequenceId: string, clipId: string, request: any) => Promise<void>;
    deleteClip: (sequenceId: string, clipId: string) => Promise<void>;
    duplicateClip: (sequenceId: string, clipId: string) => Promise<void>;

    // Clip drag state (for optimistic updates)
    setClipDragging: (clipId: string, position: { start_time: number; duration: number }) => void;
    clearClipDragging: (clipId: string) => void;

    // Sequencer Track actions (API-integrated)
    loadSequencerTracks: (sequenceId?: string) => Promise<void>;
    createSequencerTrack: (sequenceId: string, name: string, type: string, options?: any) => Promise<void>;
    renameSequencerTrack: (trackId: string, newName: string) => Promise<void>;
    updateSequencerTrack: (trackId: string, updates: { volume?: number; pan?: number; instrument?: string }) => Promise<void>;
    deleteSequencerTrack: (trackId: string) => Promise<void>;
    muteSequencerTrack: (trackId: string, muted: boolean) => Promise<void>;
    soloSequencerTrack: (trackId: string, soloed: boolean) => Promise<void>;

    // Real-time data setters (called by WebSocket hooks)
    setSpectrum: (spectrum: number[]) => void;
    setMeters: (
        meters: Record<string, { peakL: number; peakR: number; rmsL: number; rmsR: number }>
    ) => void;

    // Input audio data setters (called by InputPanel)
    setInputSpectrum: (spectrum: number[]) => void;
    setInputWaveform: (waveform: { left: number[]; right: number[] }) => void;
    setInputLevel: (level: number) => void;
    setWaveform: (waveform: { left: number[]; right: number[] }) => void;
    setAnalytics: (analytics: {
        cpu: number;
        memory: number;
        activeVoices: number;
        bufferLoad: number;
    }) => void;
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
        sequencerTracks: [],
        isPlaying: false,
        currentPosition: 0,
        tempo: 120,
        metronomeEnabled: false,
        draggingClips: new Map(),
        spectrum: [],
        meters: {},
        waveform: { left: [], right: [] },
        analytics: { cpu: 0, memory: 0, activeVoices: 0, bufferLoad: 0 },
        inputSpectrum: [],
        inputWaveform: { left: [], right: [] },
        inputLevel: -60,
    });

    // Broadcast state changes to other windows (for multi-window sync)
    // Also notify composition context that changes happened (triggers autosave)
    const broadcastUpdate = useCallback((key: string, value: any) => {
        windowManager.broadcastState(key, value);
        notifyCompositionChanged();
    }, []);

    // NOTE: We do NOT listen for state updates from other windows because it causes
    // infinite loops. Each window maintains its own state and syncs via backend API.

    // WebSocket integration for real-time data using refactored hooks
    const { transport: transportData } = useTransportWebSocket();
    const { spectrum: spectrumData } = useSpectrumWebSocket();
    const { waveform: waveformData } = useWaveformWebSocket();
    const { meters: metersData } = useMeterWebSocket();

    // Sync WebSocket data from hooks to context state
    useEffect(() => {
        if (transportData) {
            setState((prev) => ({
                ...prev,
                isPlaying: transportData.is_playing,
                currentPosition: transportData.position_beats,
                tempo: transportData.tempo,
                metronomeEnabled: transportData.metronome_enabled ?? prev.metronomeEnabled,
            }));
        }
    }, [transportData]);

    useEffect(() => {
        if (spectrumData && spectrumData.length > 0) {
            setState((prev) => ({ ...prev, spectrum: spectrumData }));
        }
    }, [spectrumData]);

    useEffect(() => {
        if (waveformData) {
            setState((prev) => ({
                ...prev,
                waveform: {
                    left: waveformData.samples_left || [],
                    right: waveformData.samples_right || [],
                },
            }));
        }
    }, [waveformData]);

    useEffect(() => {
        if (metersData && Object.keys(metersData).length > 0) {
            setState((prev) => ({
                ...prev,
                meters: Object.entries(metersData).reduce((acc, [trackId, meter]) => {
                    acc[trackId] = {
                        peakL: meter.peakLeft,
                        peakR: meter.peakRight,
                        rmsL: meter.rmsLeft,
                        rmsR: meter.rmsRight,
                    };
                    return acc;
                }, {} as Record<string, { peakL: number; peakR: number; rmsL: number; rmsR: number }>),
            }));
        }
    }, [metersData]);

    // Load ALL saved compositions on mount
    const hasInitializedRef = useRef(false);
    useEffect(() => {
        const loadAllCompositions = async () => {
            if (hasInitializedRef.current) return;
            hasInitializedRef.current = true;

            try {
                // Wait a bit for backend to be ready
                await new Promise((resolve) => setTimeout(resolve, 1000));

                console.log("🔄 Loading all saved compositions from disk...");

                // Call backend to load ALL compositions into memory
                const data = await api.compositions.loadAll();
                console.log(`✅ Loaded ${data.loaded_count} compositions`);

                // Now fetch sequences from in-memory services
                const sequences = await audioEngineService.getSequences();
                if (sequences.length > 0) {
                    setState((prev) => ({
                        ...prev,
                        sequences: sequences as any[],
                        activeSequenceId: sequences[0].id,
                    }));
                    console.log(`✅ Restored ${sequences.length} sequences to UI`);
                } else {
                    // No sequences exist - user can create one manually
                    setState((prev) => ({
                        ...prev,
                        sequences: [],
                        activeSequenceId: null,
                    }));
                    console.log("ℹ️ No saved compositions found");
                }
            } catch (error) {
                console.error("❌ Failed to load compositions:", error);
            }
        };

        loadAllCompositions();
    }, []);

    // Engine actions
    const setEngineStatus = useCallback(
        (status: AudioEngineStatus) => {
            setState((prev) => ({ ...prev, engineStatus: status }));
            broadcastUpdate("audioEngine.engineStatus", status);
        },
        [broadcastUpdate]
    );

    const setIsEngineRunning = useCallback(
        (isRunning: boolean) => {
            setState((prev) => ({ ...prev, isEngineRunning: isRunning }));
            broadcastUpdate("audioEngine.isEngineRunning", isRunning);
        },
        [broadcastUpdate]
    );

    // Synthesis actions (API-integrated)
    const loadSynthDefs = useCallback(async () => {
        try {
            const defs = await audioEngineService.getSynthDefs();
            setState((prev) => ({ ...prev, synthDefs: defs as any[] }));
            broadcastUpdate("audioEngine.synthDefs", defs);
            toast.success(`Loaded ${defs.length} synth definitions`);
        } catch (error) {
            console.error("Failed to load synth definitions:", error);
            toast.error("Failed to load synth definitions");
        }
    }, [broadcastUpdate]);

    const createSynth = useCallback(
        async (synthdef: string, parameters?: Record<string, number>) => {
            try {
                const synth = await audioEngineService.createSynth({
                    synthdef,
                    parameters: parameters || {},
                });
                setState((prev) => {
                    const newSynths = [...prev.activeSynths, synth as any];
                    broadcastUpdate("audioEngine.activeSynths", newSynths);
                    return {
                        ...prev,
                        activeSynths: newSynths,
                    };
                });
                toast.success(`Created ${synthdef} synth`);
            } catch (error) {
                console.error("Failed to create synth:", error);
                toast.error(
                    `Failed to create synth: ${error instanceof Error ? error.message : "Unknown error"}`
                );
            }
        },
        [broadcastUpdate]
    );

    const updateSynthParameter = useCallback(
        async (synthId: number, parameter: string, value: number) => {
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
                toast.error("Failed to update synth parameter");
            }
        },
        []
    );

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

    const setActiveSynths = useCallback(
        (synths: Synth[]) => {
            setState((prev) => ({ ...prev, activeSynths: synths }));
            broadcastUpdate("audioEngine.activeSynths", synths);
        },
        [broadcastUpdate]
    );

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

    const createEffect = useCallback(
        async (effectdef: string, parameters?: Record<string, number>) => {
            try {
                const effect = await audioEngineService.createEffect({
                    effectdef,
                    parameters: parameters || {},
                });
                setState((prev) => {
                    const newEffects = [...prev.activeEffects, effect as any];
                    broadcastUpdate("audioEngine.activeEffects", newEffects);
                    return {
                        ...prev,
                        activeEffects: newEffects,
                    };
                });
            } catch (error) {
                console.error("Failed to create effect:", error);
            }
        },
        [broadcastUpdate]
    );

    const updateEffectParameter = useCallback(
        async (effectId: number, parameter: string, value: number) => {
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
        },
        []
    );

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

    const setActiveEffects = useCallback(
        (effects: Effect[]) => {
            setState((prev) => ({ ...prev, activeEffects: effects }));
            broadcastUpdate("audioEngine.activeEffects", effects);
        },
        [broadcastUpdate]
    );

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

    const createTrack = useCallback(
        async (name: string, _type: string) => {
            try {
                const track = await audioEngineService.createTrack({ name });
                setState((prev) => {
                    const newTracks = [...prev.tracks, track as any];
                    broadcastUpdate("audioEngine.tracks", newTracks);
                    return {
                        ...prev,
                        tracks: newTracks,
                    };
                });
            } catch (error) {
                console.error("Failed to create track:", error);
            }
        },
        [broadcastUpdate]
    );

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

    const setTracks = useCallback(
        (tracks: MixerTrack[]) => {
            setState((prev) => ({ ...prev, tracks }));
            broadcastUpdate("audioEngine.tracks", tracks);
        },
        [broadcastUpdate]
    );

    const setMasterTrack = useCallback(
        (track: MixerTrack) => {
            setState((prev) => ({ ...prev, masterTrack: track }));
            broadcastUpdate("audioEngine.masterTrack", track);
        },
        [broadcastUpdate]
    );

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

    const createSequence = useCallback(
        async (name: string, tempo?: number) => {
            try {
                const sequence = await audioEngineService.createSequence({
                    name,
                    tempo: tempo || 120,
                    time_signature: "4/4",
                });

                // Reload sequences from backend to ensure consistency
                await loadSequences();

                // Set the new sequence as active
                setState((prev) => ({
                    ...prev,
                    activeSequenceId: sequence.id,
                    sequencerTracks: [], // Clear tracks for new sequence
                }));

                toast.success(`Created sequence: ${name}`);
            } catch (error) {
                console.error("Failed to create sequence:", error);
                toast.error("Failed to create sequence");
            }
        },
        [loadSequences]
    );

    const deleteSequence = useCallback(async (sequenceId: string) => {
        try {
            await audioEngineService.deleteSequence(sequenceId);

            // Reload sequences from backend to ensure consistency
            await loadSequences();

            // If the deleted sequence was the active sequence, handle state cleanup
            setState((prev) => {
                const wasActiveSequence = prev.activeSequenceId === sequenceId;
                const remainingSequences = prev.sequences.filter((s) => s.id !== sequenceId);

                if (wasActiveSequence) {
                    // If there are remaining sequences, switch to the first one
                    // Otherwise, set activeSequenceId to null (empty state)
                    const newActiveId = remainingSequences.length > 0 ? remainingSequences[0].id : null;

                    return {
                        ...prev,
                        activeSequenceId: newActiveId,
                        sequencerTracks: [], // Clear tracks when switching/clearing
                    };
                }

                return prev;
            });

            toast.success("Sequence deleted");
        } catch (error) {
            console.error("Failed to delete sequence:", error);
            toast.error("Failed to delete sequence");
        }
    }, [loadSequences]);

    const playSequence = useCallback(
        async (sequenceId: string, position?: number) => {
            try {
                // Use provided position, or current position, or 0
                const startPosition = position !== undefined ? position : state.currentPosition;
                await audioEngineService.playSequence(sequenceId, startPosition);
                setState((prev) => ({
                    ...prev,
                    activeSequenceId: sequenceId,
                    isPlaying: true,
                }));
                broadcastUpdate("audioEngine.isPlaying", true);
                broadcastUpdate("audioEngine.activeSequenceId", sequenceId);
            } catch (error) {
                console.error("Failed to play sequence:", error);
                toast.error(
                    `Failed to play sequence: ${error instanceof Error ? error.message : "Unknown error"}`
                );
            }
        },
        [broadcastUpdate, state.currentPosition]
    );

    const stopPlayback = useCallback(async () => {
        try {
            await audioEngineService.stopPlayback();
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

    const pausePlayback = useCallback(async () => {
        try {
            await audioEngineService.pausePlayback();
            setState((prev) => ({
                ...prev,
                isPlaying: false,
            }));
            broadcastUpdate("audioEngine.isPlaying", false);
        } catch (error) {
            console.error("Failed to pause playback:", error);
        }
    }, [broadcastUpdate]);

    const resumePlayback = useCallback(async () => {
        try {
            await audioEngineService.resumePlayback();
            setState((prev) => ({
                ...prev,
                isPlaying: true,
            }));
            broadcastUpdate("audioEngine.isPlaying", true);
        } catch (error) {
            console.error("Failed to resume playback:", error);
        }
    }, [broadcastUpdate]);

    const setTempo = useCallback(
        async (tempo: number) => {
            try {
                await audioEngineService.setTempo({ tempo });
                setState((prev) => ({ ...prev, tempo }));
                broadcastUpdate("audioEngine.tempo", tempo);
                notifyCompositionChanged();
            } catch (error) {
                console.error("Failed to set tempo:", error);
            }
        },
        [broadcastUpdate]
    );

    const toggleMetronome = useCallback(async () => {
        try {
            const response = await audioEngineService.toggleMetronome();
            setState((prev) => ({ ...prev, metronomeEnabled: response.enabled }));
            broadcastUpdate("audioEngine.metronomeEnabled", response.enabled);
        } catch (error) {
            console.error("Failed to toggle metronome:", error);
        }
    }, [broadcastUpdate]);

    const setSequences = useCallback(
        (sequences: Sequence[]) => {
            setState((prev) => ({ ...prev, sequences }));
            broadcastUpdate("audioEngine.sequences", sequences);
        },
        [broadcastUpdate]
    );

    const setActiveSequenceId = useCallback(
        (sequenceId: string | null) => {
            setState((prev) => ({ ...prev, activeSequenceId: sequenceId }));
            broadcastUpdate("audioEngine.activeSequenceId", sequenceId);
        },
        [broadcastUpdate]
    );

    const setIsPlaying = useCallback(
        (isPlaying: boolean) => {
            setState((prev) => ({ ...prev, isPlaying }));
            broadcastUpdate("audioEngine.isPlaying", isPlaying);
        },
        [broadcastUpdate]
    );

    const setCurrentPosition = useCallback(
        (position: number) => {
            setState((prev) => ({ ...prev, currentPosition: position }));
            broadcastUpdate("audioEngine.currentPosition", position);
        },
        [broadcastUpdate]
    );

    const setTempoValue = useCallback(
        (tempo: number) => {
            setState((prev) => ({ ...prev, tempo }));
            broadcastUpdate("audioEngine.tempo", tempo);
        },
        [broadcastUpdate]
    );

    const setMetronomeEnabled = useCallback(
        (enabled: boolean) => {
            setState((prev) => ({ ...prev, metronomeEnabled: enabled }));
            broadcastUpdate("audioEngine.metronomeEnabled", enabled);
        },
        [broadcastUpdate]
    );

    // Clip actions (API-integrated)
    const addClip = useCallback(
        async (sequenceId: string, request: any) => {
            try {
                console.log("🔧 AudioEngineContext.addClip called:", { sequenceId, request });
                const clip = await audioEngineService.addClip(sequenceId, request);
                console.log("🔧 Clip created from backend:", clip);
                // Reload sequences to get updated clips
                await loadSequences();
                console.log("🔧 Sequences reloaded");
                toast.success(`Added clip to sequence`);
                notifyCompositionChanged();
                return clip;
            } catch (error) {
                console.error("Failed to add clip:", error);
                toast.error("Failed to add clip");
                throw error;
            }
        },
        [loadSequences]
    );

    const updateClip = useCallback(
        async (sequenceId: string, clipId: string, request: any) => {
            try {
                await audioEngineService.updateClip(sequenceId, clipId, request);
                // Reload sequences to get updated clips
                await loadSequences();
                notifyCompositionChanged();
            } catch (error) {
                console.error("Failed to update clip:", error);
                toast.error("Failed to update clip");
            }
        },
        [loadSequences]
    );

    const deleteClip = useCallback(
        async (sequenceId: string, clipId: string) => {
            try {
                await audioEngineService.removeClip(sequenceId, clipId);
                // Reload sequences to get updated clips
                await loadSequences();
                toast.success("Deleted clip");
                notifyCompositionChanged();
            } catch (error) {
                console.error("Failed to delete clip:", error);
                toast.error("Failed to delete clip");
            }
        },
        [loadSequences]
    );

    const duplicateClip = useCallback(
        async (sequenceId: string, clipId: string) => {
            try {
                await audioEngineService.duplicateClip(sequenceId, clipId);
                // Reload sequences to get updated clips
                await loadSequences();
                toast.success("Duplicated clip");
                notifyCompositionChanged();
            } catch (error) {
                console.error("Failed to duplicate clip:", error);
                toast.error("Failed to duplicate clip");
            }
        },
        [loadSequences]
    );

    // Clip drag state management (for optimistic updates during drag)
    const setClipDragging = useCallback((clipId: string, position: { start_time: number; duration: number }) => {
        setState((prev) => {
            const newDraggingClips = new Map(prev.draggingClips);
            newDraggingClips.set(clipId, position);
            return { ...prev, draggingClips: newDraggingClips };
        });
    }, []);

    const clearClipDragging = useCallback((clipId: string) => {
        setState((prev) => {
            const newDraggingClips = new Map(prev.draggingClips);
            newDraggingClips.delete(clipId);
            return { ...prev, draggingClips: newDraggingClips };
        });
    }, []);

    // Sequencer Track actions (API-integrated)
    const loadSequencerTracks = useCallback(async (sequenceId?: string) => {
        try {
            const tracks = await audioEngineService.getSequencerTracks(sequenceId);
            setState((prev) => ({ ...prev, sequencerTracks: tracks }));
        } catch (error) {
            console.error("Failed to load sequencer tracks:", error);
        }
    }, []);

    const createSequencerTrack = useCallback(
        async (sequenceId: string, name: string, type: string, options?: any) => {
            try {
                const track = await audioEngineService.createSequencerTrack({
                    sequence_id: sequenceId,
                    name,
                    type,
                    ...options,
                });
                await loadSequencerTracks(sequenceId);
                toast.success(`Track "${name}" created`);
                notifyCompositionChanged();
            } catch (error) {
                console.error("Failed to create sequencer track:", error);
                toast.error("Failed to create track");
            }
        },
        [loadSequencerTracks]
    );

    const renameSequencerTrack = useCallback(async (trackId: string, newName: string) => {
        try {
            await audioEngineService.renameSequencerTrack(trackId, newName);
            setState((prev) => ({
                ...prev,
                sequencerTracks: prev.sequencerTracks.map((t) =>
                    t.id === trackId ? { ...t, name: newName } : t
                ),
            }));
            toast.success(`Track renamed to "${newName}"`);
            notifyCompositionChanged();
        } catch (error) {
            console.error("Failed to rename sequencer track:", error);
            toast.error("Failed to rename track");
        }
    }, []);

    const updateSequencerTrack = useCallback(async (trackId: string, updates: { volume?: number; pan?: number; instrument?: string }) => {
        try {
            await audioEngineService.updateSequencerTrack(trackId, updates);
            setState((prev) => ({
                ...prev,
                sequencerTracks: prev.sequencerTracks.map((t) =>
                    t.id === trackId ? { ...t, ...updates } : t
                ),
            }));
            // Show success toast for instrument changes
            if (updates.instrument) {
                toast.success(`Instrument changed to ${updates.instrument}`);
            }
            notifyCompositionChanged();
        } catch (error) {
            console.error("Failed to update sequencer track:", error);
            toast.error("Failed to update track");
        }
    }, []);

    const deleteSequencerTrack = useCallback(async (trackId: string) => {
        try {
            await audioEngineService.deleteSequencerTrack(trackId);
            setState((prev) => ({
                ...prev,
                sequencerTracks: prev.sequencerTracks.filter((t) => t.id !== trackId),
            }));
            toast.success("Track deleted");
            notifyCompositionChanged();
        } catch (error) {
            console.error("Failed to delete sequencer track:", error);
            toast.error("Failed to delete track");
        }
    }, []);

    const muteSequencerTrack = useCallback(async (trackId: string, muted: boolean) => {
        try {
            await audioEngineService.muteSequencerTrack(trackId, muted);
            setState((prev) => ({
                ...prev,
                sequencerTracks: prev.sequencerTracks.map((t) =>
                    t.id === trackId ? { ...t, is_muted: muted } : t
                ),
            }));
            notifyCompositionChanged();
        } catch (error) {
            console.error("Failed to mute sequencer track:", error);
        }
    }, []);

    const soloSequencerTrack = useCallback(async (trackId: string, soloed: boolean) => {
        try {
            await audioEngineService.soloSequencerTrack(trackId, soloed);
            setState((prev) => ({
                ...prev,
                sequencerTracks: prev.sequencerTracks.map((t) =>
                    t.id === trackId ? { ...t, is_solo: soloed } : t
                ),
            }));
            notifyCompositionChanged();
        } catch (error) {
            console.error("Failed to solo sequencer track:", error);
        }
    }, []);

    // Real-time data setters (called by WebSocket hooks)
    const setSpectrum = useCallback((spectrum: number[]) => {
        setState((prev) => ({ ...prev, spectrum }));
        // Don't broadcast real-time data (too frequent)
    }, []);

    const setMeters = useCallback(
        (meters: Record<string, { peakL: number; peakR: number; rmsL: number; rmsR: number }>) => {
            setState((prev) => ({ ...prev, meters }));
            // Don't broadcast real-time data (too frequent)
        },
        []
    );

    const setWaveform = useCallback((waveform: { left: number[]; right: number[] }) => {
        setState((prev) => ({ ...prev, waveform }));
        // Don't broadcast real-time data (too frequent)
    }, []);

    const setAnalytics = useCallback(
        (analytics: { cpu: number; memory: number; activeVoices: number; bufferLoad: number }) => {
            setState((prev) => ({ ...prev, analytics }));
            // Don't broadcast real-time data (too frequent)
        },
        []
    );

    // Input audio data setters (called by InputPanel)
    const setInputSpectrum = useCallback((inputSpectrum: number[]) => {
        setState((prev) => ({ ...prev, inputSpectrum }));
        // Don't broadcast real-time data (too frequent)
    }, []);

    const setInputWaveform = useCallback((inputWaveform: { left: number[]; right: number[] }) => {
        setState((prev) => ({ ...prev, inputWaveform }));
        // Don't broadcast real-time data (too frequent)
    }, []);

    const setInputLevel = useCallback((inputLevel: number) => {
        setState((prev) => ({ ...prev, inputLevel }));
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
        pausePlayback,
        resumePlayback,
        setTempo,
        toggleMetronome,
        setSequences,
        setActiveSequenceId,
        setIsPlaying,
        setCurrentPosition,
        setTempoValue,
        setMetronomeEnabled,
        // Clips
        addClip,
        updateClip,
        deleteClip,
        duplicateClip,
        setClipDragging,
        clearClipDragging,
        // Sequencer Tracks
        loadSequencerTracks,
        createSequencerTrack,
        renameSequencerTrack,
        updateSequencerTrack,
        deleteSequencerTrack,
        muteSequencerTrack,
        soloSequencerTrack,
        // Real-time data
        setSpectrum,
        setMeters,
        setWaveform,
        setAnalytics,
        // Input audio data
        setInputSpectrum,
        setInputWaveform,
        setInputLevel,
    };

    return <AudioEngineContext.Provider value={value}>{children}</AudioEngineContext.Provider>;
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
