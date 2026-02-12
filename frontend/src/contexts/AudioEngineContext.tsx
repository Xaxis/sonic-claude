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
import { windowManager } from "@/services/WindowManager";
import { audioEngineService } from "@/services/api/audio-engine.service";
import { toast } from "sonner";
import type { AudioEngineStatus } from "@/types";
import type { Synth } from "@/components/features/synthesis";
import type { Effect } from "@/components/features/effects";
import type { MixerTrack } from "@/components/features/mixer";
import type { Sequence } from "@/components/features/sequencer";

// WebSocket message types
interface TransportWebSocketData {
    type: "transport";
    is_playing: boolean;
    position_beats: number;
    position_seconds: number;
    tempo: number;
    time_signature_num: number;
    time_signature_den: number;
    loop_enabled?: boolean;
    loop_start?: number;
    loop_end?: number;
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
    setSequences: (sequences: Sequence[]) => void;
    setActiveSequenceId: (sequenceId: string | null) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setCurrentPosition: (position: number) => void;
    setTempoValue: (tempo: number) => void;

    // Clip actions (API-integrated)
    addClip: (sequenceId: string, request: any) => Promise<void>;
    updateClip: (sequenceId: string, clipId: string, request: any) => Promise<void>;
    deleteClip: (sequenceId: string, clipId: string) => Promise<void>;
    duplicateClip: (sequenceId: string, clipId: string) => Promise<void>;

    // Sequencer Track actions (API-integrated)
    loadSequencerTracks: (sequenceId?: string) => Promise<void>;
    createSequencerTrack: (sequenceId: string, name: string, type: string, options?: any) => Promise<void>;
    renameSequencerTrack: (trackId: string, newName: string) => Promise<void>;
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
        spectrum: [],
        meters: {},
        waveform: { left: [], right: [] },
        analytics: { cpu: 0, memory: 0, activeVoices: 0, bufferLoad: 0 },
        inputSpectrum: [],
        inputWaveform: { left: [], right: [] },
        inputLevel: -60,
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

    // WebSocket integration for real-time data
    const transportWsRef = useRef<WebSocket | null>(null);
    const spectrumWsRef = useRef<WebSocket | null>(null);
    const waveformWsRef = useRef<WebSocket | null>(null);
    const metersWsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | undefined>(undefined);
    const isCleaningUpRef = useRef(false);

    useEffect(() => {
        isCleaningUpRef.current = false;

        const connect = () => {
            if (isCleaningUpRef.current) return;

            try {
                // Transport WebSocket
                const transportWs = new WebSocket("ws://localhost:8000/audio-engine/ws/transport");
                transportWsRef.current = transportWs;

                transportWs.onopen = () => {
                    if (!isCleaningUpRef.current) {
                        console.log("🔌 Transport WebSocket connected");
                    }
                };

                transportWs.onmessage = (event) => {
                    if (isCleaningUpRef.current) return;
                    try {
                        const message: TransportWebSocketData = JSON.parse(event.data);
                        if (message.type === "transport") {
                            setState((prev) => ({
                                ...prev,
                                isPlaying: message.is_playing,
                                currentPosition: message.position_beats,
                                tempo: message.tempo,
                            }));
                        }
                    } catch (error) {
                        console.error("Failed to parse transport message:", error);
                    }
                };

                transportWs.onerror = () => {
                    if (!isCleaningUpRef.current && transportWs.readyState !== WebSocket.CLOSED) {
                        console.warn("⚠️ Transport WebSocket error, will retry...");
                    }
                };

                transportWs.onclose = () => {
                    if (isCleaningUpRef.current) return;
                    reconnectTimeoutRef.current = window.setTimeout(() => {
                        if (!isCleaningUpRef.current) {
                            connect();
                        }
                    }, 2000);
                };

                // Spectrum WebSocket
                const spectrumWs = new WebSocket("ws://localhost:8000/audio-engine/ws/spectrum");
                spectrumWsRef.current = spectrumWs;

                spectrumWs.onopen = () => {
                    if (!isCleaningUpRef.current) {
                        console.log("🔌 Spectrum WebSocket connected");
                    }
                };

                let spectrumMessageCount = 0;
                spectrumWs.onmessage = (event) => {
                    if (isCleaningUpRef.current) return;
                    try {
                        const message = JSON.parse(event.data);
                        if (message.type === "spectrum" && Array.isArray(message.magnitudes)) {
                            // Debug: Log first few messages
                            if (spectrumMessageCount < 3) {
                                console.log(`🔊 Spectrum message ${spectrumMessageCount + 1}:`, {
                                    bins: message.magnitudes.length,
                                    range: [Math.min(...message.magnitudes), Math.max(...message.magnitudes)],
                                    sample: message.magnitudes.slice(0, 5)
                                });
                                spectrumMessageCount++;
                            }
                            setState((prev) => ({ ...prev, spectrum: message.magnitudes }));
                        }
                    } catch (error) {
                        console.error("Failed to parse spectrum message:", error);
                    }
                };

                spectrumWs.onerror = () => {
                    if (!isCleaningUpRef.current && spectrumWs.readyState !== WebSocket.CLOSED) {
                        console.warn("⚠️ Spectrum WebSocket error");
                    }
                };

                // Waveform WebSocket
                const waveformWs = new WebSocket("ws://localhost:8000/audio-engine/ws/waveform");
                waveformWsRef.current = waveformWs;

                waveformWs.onopen = () => {
                    if (!isCleaningUpRef.current) {
                        console.log("🔌 Waveform WebSocket connected");
                    }
                };

                let waveformMessageCount = 0;
                waveformWs.onmessage = (event) => {
                    if (isCleaningUpRef.current) return;
                    try {
                        const message = JSON.parse(event.data);
                        if (message.type === "waveform") {
                            // Debug: Log first few messages
                            if (waveformMessageCount < 3) {
                                console.log(`📊 Waveform message ${waveformMessageCount + 1}:`, {
                                    leftSamples: message.samples_left?.length || 0,
                                    rightSamples: message.samples_right?.length || 0
                                });
                                waveformMessageCount++;
                            }
                            setState((prev) => ({
                                ...prev,
                                waveform: {
                                    left: message.samples_left || [],
                                    right: message.samples_right || []
                                }
                            }));
                        }
                    } catch (error) {
                        console.error("Failed to parse waveform message:", error);
                    }
                };

                waveformWs.onerror = () => {
                    if (!isCleaningUpRef.current && waveformWs.readyState !== WebSocket.CLOSED) {
                        console.warn("⚠️ Waveform WebSocket error");
                    }
                };

                // Meters WebSocket
                const metersWs = new WebSocket("ws://localhost:8000/audio-engine/ws/meters");
                metersWsRef.current = metersWs;

                metersWs.onopen = () => {
                    if (!isCleaningUpRef.current) {
                        console.log("🔌 Meters WebSocket connected");
                    }
                };

                metersWs.onmessage = (event) => {
                    if (isCleaningUpRef.current) return;
                    try {
                        const message = JSON.parse(event.data);
                        if (message.type === "meters") {
                            setState((prev) => ({
                                ...prev,
                                meters: {
                                    ...prev.meters,
                                    [message.track_id]: {
                                        peakL: message.peak_left,
                                        peakR: message.peak_right,
                                        rmsL: message.rms_left,
                                        rmsR: message.rms_right,
                                    }
                                }
                            }));
                        }
                    } catch (error) {
                        console.error("Failed to parse meters message:", error);
                    }
                };

                metersWs.onerror = () => {
                    if (!isCleaningUpRef.current && metersWs.readyState !== WebSocket.CLOSED) {
                        console.warn("⚠️ Meters WebSocket error");
                    }
                };

            } catch (error) {
                if (!isCleaningUpRef.current) {
                    console.error("Failed to create WebSocket connections:", error);
                }
            }
        };

        connect();

        return () => {
            isCleaningUpRef.current = true;

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            // Close all WebSocket connections
            if (transportWsRef.current) {
                transportWsRef.current.close();
            }
            if (spectrumWsRef.current) {
                spectrumWsRef.current.close();
            }
            if (waveformWsRef.current) {
                waveformWsRef.current.close();
            }
            if (metersWsRef.current) {
                metersWsRef.current.close();
            }
        };
    }, []);

    // Initialize with a default test sequence
    const hasInitializedRef = useRef(false);
    useEffect(() => {
        const initializeDefaultSequence = async () => {
            if (hasInitializedRef.current) return;
            hasInitializedRef.current = true;

            try {
                // Wait a bit for backend to be ready
                await new Promise((resolve) => setTimeout(resolve, 1000));

                // Check if sequences already exist
                const sequences = await audioEngineService.getSequences();
                if (sequences.length > 0) {
                    setState((prev) => ({
                        ...prev,
                        sequences: sequences as any[],
                        activeSequenceId: sequences[0].id,
                    }));
                    return;
                }

                // Create a default test sequence
                const sequence = await audioEngineService.createSequence({
                    name: "Test Sequence",
                    tempo: 120,
                    time_signature: "4/4",
                });

                setState((prev) => ({
                    ...prev,
                    sequences: [sequence as any],
                    activeSequenceId: sequence.id,
                }));

                toast.success("Created default test sequence");
            } catch (error) {
                console.error("Failed to initialize default sequence:", error);
            }
        };

        initializeDefaultSequence();
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
                setState((prev) => {
                    const newSequences = [...prev.sequences, sequence as any];
                    broadcastUpdate("audioEngine.sequences", newSequences);
                    return {
                        ...prev,
                        sequences: newSequences,
                    };
                });
            } catch (error) {
                console.error("Failed to create sequence:", error);
            }
        },
        [broadcastUpdate]
    );

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

    const playSequence = useCallback(
        async (sequenceId: string) => {
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
                toast.error(
                    `Failed to play sequence: ${error instanceof Error ? error.message : "Unknown error"}`
                );
            }
        },
        [broadcastUpdate]
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
            } catch (error) {
                console.error("Failed to set tempo:", error);
            }
        },
        [broadcastUpdate]
    );

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

    // Clip actions (API-integrated)
    const addClip = useCallback(
        async (sequenceId: string, request: any) => {
            try {
                const clip = await audioEngineService.addClip(sequenceId, request);
                // Reload sequences to get updated clips
                await loadSequences();
                toast.success(`Added clip to sequence`);
            } catch (error) {
                console.error("Failed to add clip:", error);
                toast.error("Failed to add clip");
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
            } catch (error) {
                console.error("Failed to duplicate clip:", error);
                toast.error("Failed to duplicate clip");
            }
        },
        [loadSequences]
    );

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
        } catch (error) {
            console.error("Failed to rename sequencer track:", error);
            toast.error("Failed to rename track");
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
        setSequences,
        setActiveSequenceId,
        setIsPlaying,
        setCurrentPosition,
        setTempoValue,
        // Clips
        addClip,
        updateClip,
        deleteClip,
        duplicateClip,
        // Sequencer Tracks
        loadSequencerTracks,
        createSequencerTrack,
        renameSequencerTrack,
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
