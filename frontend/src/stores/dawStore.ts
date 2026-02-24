/**
 * DAW Zustand Store
 * 
 * Complete state management for the DAW using Zustand.
 * Handles both real-time WebSocket streams (30-60Hz) and HTTP CRUD operations.
 * 
 * Architecture:
 * - Layer 1: Audio Engine State (WebSocket real-time)
 * - Layer 2: Application State (HTTP CRUD)
 * - Layer 3: UI State (local)
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { windowManager } from '@/services/window-manager';
import { statePersistence } from '@/services/state-persistence';

// ============================================================================
// TYPE IMPORTS
// ============================================================================

// WebSocket Types
import type { TransportData } from '@/hooks/useTransportWebsocket';
import type { TrackMeters } from '@/hooks/useMeterWebsocket';
import type { WaveformData } from '@/hooks/useWaveformWebsocket';
import type { AnalyticsData } from '@/hooks/useAnalyticsWebsocket';

// Application Types
import type { SequencerTrack, SequencerClip, SynthDefInfo } from '@/modules/sequencer/types';
import type { MixerChannel, MasterChannel } from '@/modules/mixer/types';
import type { EffectDefinition, TrackEffectChain } from '@/services/api/providers';
import type { SampleMetadata } from '@/services/api/providers/samples.provider';
import type { CompositionMetadata } from '@/services/api/providers/compositions.provider';

// Composition (complete project state)
// This contains EVERYTHING needed to recreate the exact state
export interface Composition {
    // === IDENTITY ===
    id: string;
    name: string;

    // === TIMELINE ===
    tempo: number;
    time_signature: string;
    tracks: SequencerTrack[];
    clips: SequencerClip[];

    // === PLAYBACK STATE ===
    is_playing: boolean;
    current_position: number;

    // === LOOP SETTINGS ===
    loop_enabled: boolean;
    loop_start: number;
    loop_end: number;

    // === AUDIO STATE ===
    mixer_state: any;
    track_effects: TrackEffectChain[];
    sample_assignments: Record<string, string>;

    // === AI CONTEXT ===
    chat_history: any[];
    metadata: Record<string, any>;

    // === TIMESTAMPS ===
    created_at: string;
    updated_at: string;
}

// AI & Activity Types
import type { ChatMessage, AnalysisEvent, DAWStateSnapshot } from '@/modules/ai/types';

export type ActivityStatus = "pending" | "in-progress" | "success" | "error";
export type ActivityTargetType = "track" | "clip" | "effect" | "mixer" | "tempo" | "playback";

export interface AIActivity {
    id: string;
    action: string;
    status: ActivityStatus;
    message: string;
    timestamp: number;
    duration?: number;
    targetId?: string;
    targetType?: ActivityTargetType;
    tabId?: string;
    metadata?: Record<string, any>;
}

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

interface ActiveSynth {
    id: number;
    synthdef: string;
    group: number;
    bus: number | null;
}

interface DAWStore {
    // ========================================================================
    // AUDIO ENGINE STATE (WebSocket Real-Time 30-60Hz)
    // ========================================================================
    transport: TransportData | null;
    meters: TrackMeters;
    spectrum: number[];
    waveform: WaveformData | null;
    analytics: AnalyticsData | null;

    // ========================================================================
    // APPLICATION STATE (HTTP CRUD)
    // ========================================================================

    // Compositions (PRIMARY - this is what users think about)
    // A composition = project file (contains tracks, clips, and all state)
    activeComposition: Composition | null;  // Currently loaded composition
    compositions: CompositionMetadata[];             // List of all compositions (for browsing)
    hasUnsavedChanges: boolean;

    // Sequencer (INTERNAL - part of active composition)
    // These are derived from activeComposition (for convenience/performance)
    tracks: SequencerTrack[];
    clips: SequencerClip[];
    synthDefs: SynthDefInfo[];

    // Mixer (INTERNAL - part of active composition)
    channels: MixerChannel[];
    master: MasterChannel | null;

    // Effects (INTERNAL - part of active composition)
    effectDefinitions: EffectDefinition[];
    effectChains: Record<string, TrackEffectChain>; // trackId -> chain

    // Samples (INTERNAL - part of active composition)
    samples: SampleMetadata[];
    sampleAssignments: Record<string, string>; // trackId -> sampleId

    // Synthesis (INTERNAL - runtime state)
    activeSynths: Record<number, ActiveSynth>; // synthId -> synth

    // ========================================================================
    // UI STATE (Local)
    // ========================================================================

    // Sequencer UI
    zoom: number;
    snapEnabled: boolean;
    gridSize: number;
    isLooping: boolean;
    loopStart: number;
    loopEnd: number;
    selectedClipId: string | null;

    // Scroll State (for synchronized scrolling between timeline/piano roll/sample editor)
    timelineScrollLeft: number;
    pianoRollScrollLeft: number;
    sampleEditorScrollLeft: number;

    // Modals
    showSampleBrowser: boolean;
    showSequenceManager: boolean;
    showSequenceSettings: boolean;
    showPianoRoll: boolean;
    pianoRollClipId: string | null;

    // Mixer UI
    showMeters: boolean;
    meterMode: "peak" | "rms" | "both";
    selectedChannelId: string | null;

    // Effects UI
    selectedEffectId: string | null;
    showEffectBrowser: boolean;

    // AI State
    chatHistory: ChatMessage[];
    analysisEvents: AnalysisEvent[];
    dawStateSnapshot: DAWStateSnapshot | null;
    aiContext: string | null;

    // Activity State
    activities: AIActivity[];
    activityHistory: AIActivity[];
    isAIActive: boolean;

    // ========================================================================
    // AUDIO ENGINE ACTIONS (WebSocket Updates)
    // ========================================================================
    setTransport: (transport: TransportData) => void;
    setMeters: (meters: TrackMeters) => void;
    setSpectrum: (spectrum: number[]) => void;
    setWaveform: (waveform: WaveformData) => void;
    setAnalytics: (analytics: AnalyticsData) => void;

    // ========================================================================
    // COMPOSITION ACTIONS (PRIMARY - what users interact with)
    // ========================================================================
    loadCompositions: () => Promise<void>;
    createComposition: (name: string, tempo?: number, timeSignature?: string) => Promise<void>;
    loadComposition: (compositionId: string) => Promise<void>;
    saveComposition: (createHistory?: boolean, isAutosave?: boolean) => Promise<void>;
    updateCompositionMetadata: (name?: string, tempo?: number, timeSignature?: string) => Promise<void>;
    deleteComposition: (compositionId: string) => Promise<void>;
    markCompositionChanged: () => void;
    markCompositionSaved: () => void;

    // ========================================================================
    // SEQUENCER ACTIONS (INTERNAL - operate on active composition)
    // ========================================================================

    // Playback (operates on active composition)
    play: () => Promise<void>;
    stop: () => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    setTempo: (tempo: number) => Promise<void>;
    toggleMetronome: () => Promise<void>;
    seek: (position: number, triggerAudio?: boolean) => Promise<void>;

    // Tracks (operate on active composition)
    createTrack: (name: string, type: string, instrument?: string) => Promise<void>;
    deleteTrack: (trackId: string) => Promise<void>;
    renameTrack: (trackId: string, name: string) => Promise<void>;
    updateTrack: (trackId: string, updates: { volume?: number; pan?: number; instrument?: string }) => Promise<void>;
    updateTrackVolume: (trackId: string, volume: number) => Promise<void>;
    updateTrackPan: (trackId: string, pan: number) => Promise<void>;
    muteTrack: (trackId: string, muted: boolean) => Promise<void>;
    soloTrack: (trackId: string, soloed: boolean) => Promise<void>;

    // Clips
    addClip: (request: any) => Promise<void>;
    updateClip: (clipId: string, request: any) => Promise<void>;
    deleteClip: (clipId: string) => Promise<void>;
    duplicateClip: (sequenceId: string, clipId: string) => Promise<void>;

    // SynthDefs
    loadSynthDefs: () => Promise<void>;

    // ========================================================================
    // MIXER ACTIONS
    // ========================================================================
    loadChannels: (sequenceId: string) => Promise<void>;
    loadMixerState: (mixerState: any) => Promise<void>;
    updateChannelVolume: (channelId: string, volume: number) => Promise<void>;
    updateChannelPan: (channelId: string, pan: number) => Promise<void>;
    toggleChannelMute: (channelId: string) => Promise<void>;
    toggleChannelSolo: (channelId: string) => Promise<void>;

    loadMaster: () => Promise<void>;
    updateMasterFader: (fader: number) => Promise<void>;
    toggleMasterMute: () => Promise<void>;
    toggleLimiter: () => Promise<void>;
    setLimiterThreshold: (threshold: number) => Promise<void>;

    // ========================================================================
    // EFFECTS ACTIONS
    // ========================================================================
    loadEffectDefinitions: () => Promise<void>;
    loadEffectChain: (trackId: string) => Promise<void>;
    loadEffectChains: (chains: TrackEffectChain[]) => Promise<void>;
    addEffect: (trackId: string, effectName: string, slotIndex?: number) => Promise<void>;
    deleteEffect: (effectId: string) => Promise<void>;
    moveEffect: (effectId: string, newSlotIndex: number) => Promise<void>;
    toggleEffectBypass: (effectId: string) => Promise<void>;
    updateEffectParameter: (effectId: string, paramName: string, value: number) => Promise<void>;

    // ========================================================================
    // SAMPLES ACTIONS
    // ========================================================================
    loadSamples: () => Promise<void>;
    uploadSample: (file: File, name: string, category?: string) => Promise<void>;
    deleteSample: (sampleId: string) => Promise<void>;
    updateSample: (sampleId: string, name?: string, category?: string) => Promise<void>;
    loadSampleAssignments: (assignments: Record<string, string>) => Promise<void>;
    assignSample: (trackId: string, samplePath: string) => void;
    unassignSample: (trackId: string) => void;

    // ========================================================================
    // SYNTHESIS ACTIONS
    // ========================================================================
    createSynth: (synthdef: string, params?: Record<string, number>, group?: number, bus?: number | null) => Promise<ActiveSynth>;
    setSynthParam: (synthId: number, param: string, value: number) => Promise<void>;
    releaseSynth: (synthId: number) => Promise<void>;
    freeSynth: (synthId: number, immediate?: boolean) => Promise<void>;
    freeAllSynths: () => Promise<void>;
    previewNote: (note: number, velocity?: number, duration?: number, instrument?: string) => Promise<void>;

    // ========================================================================
    // UI ACTIONS
    // ========================================================================
    setZoom: (zoom: number) => void;
    setSnapEnabled: (enabled: boolean) => void;
    setGridSize: (size: number) => void;
    setIsLooping: (looping: boolean) => void;
    setLoopStart: (start: number) => void;
    setLoopEnd: (end: number) => void;
    setSelectedClipId: (id: string | null) => void;

    // Scroll actions (for synchronized scrolling)
    setTimelineScrollLeft: (scrollLeft: number) => void;
    setPianoRollScrollLeft: (scrollLeft: number) => void;
    setSampleEditorScrollLeft: (scrollLeft: number) => void;

    setShowSampleBrowser: (show: boolean) => void;
    setShowSequenceManager: (show: boolean) => void;
    setShowSequenceSettings: (show: boolean) => void;
    openPianoRoll: (clipId: string) => void;
    closePianoRoll: () => void;
    setShowMeters: (show: boolean) => void;
    setMeterMode: (mode: "peak" | "rms" | "both") => void;
    setSelectedChannelId: (id: string | null) => void;
    setSelectedEffectId: (id: string | null) => void;
    setShowEffectBrowser: (show: boolean) => void;

    // ========================================================================
    // AI ACTIONS
    // ========================================================================
    addChatMessage: (message: ChatMessage) => void;
    clearChatHistory: () => void;
    addAnalysisEvent: (event: AnalysisEvent) => void;
    clearAnalysisEvents: () => void;
    setDAWStateSnapshot: (snapshot: DAWStateSnapshot | null) => void;
    setAIContext: (context: string | null) => void;

    // ========================================================================
    // ACTIVITY ACTIONS
    // ========================================================================
    startActivity: (
        action: string,
        message: string,
        options?: {
            targetId?: string;
            targetType?: ActivityTargetType;
            tabId?: string;
            duration?: number;
            metadata?: Record<string, any>;
        }
    ) => string;
    completeActivity: (id: string, success: boolean, message?: string) => void;
    updateActivity: (id: string, updates: Partial<AIActivity>) => void;
    clearActivities: () => void;
    clearActivityHistory: () => void;
    getActivitiesForTarget: (targetId: string) => AIActivity[];
    getActivitiesForTab: (tabId: string) => AIActivity[];
    getActivityById: (id: string) => AIActivity | undefined;
}

// ============================================================================
// CREATE STORE
// ============================================================================

export const useDAWStore = create<DAWStore>()(
    subscribeWithSelector((set, get) => ({
        // ====================================================================
        // INITIAL STATE
        // ====================================================================

        // Audio Engine State
        transport: null,
        meters: {},
        spectrum: [],
        waveform: null,
        analytics: null,

        // Application State - Composition First
        activeComposition: null,
        compositions: [],
        hasUnsavedChanges: false,

        // Derived from active composition
        tracks: [],
        clips: [],
        synthDefs: [],
        channels: [],
        master: null,
        effectDefinitions: [],
        effectChains: {},
        samples: [],
        sampleAssignments: {},
        activeSynths: {},

        // UI State
        zoom: 0.5,
        snapEnabled: true,
        gridSize: 16,
        isLooping: true,
        loopStart: 0,
        loopEnd: 16,
        selectedClipId: null,

        // Scroll State
        timelineScrollLeft: 0,
        pianoRollScrollLeft: 0,
        sampleEditorScrollLeft: 0,

        showSampleBrowser: false,
        showSequenceManager: false,
        showSequenceSettings: false,
        showPianoRoll: false,
        pianoRollClipId: null,
        showMeters: true,
        meterMode: "both",
        selectedChannelId: null,
        selectedEffectId: null,
        showEffectBrowser: false,

        // AI State
        chatHistory: [],
        analysisEvents: [],
        dawStateSnapshot: null,
        aiContext: null,

        // Activity State
        activities: [],
        activityHistory: [],
        isAIActive: false,

        // ====================================================================
        // AUDIO ENGINE ACTIONS (WebSocket Updates)
        // ====================================================================

        setTransport: (transport) => set({ transport }),
        setMeters: (meters) => set({ meters }),
        setSpectrum: (spectrum) => set({ spectrum }),
        setWaveform: (waveform) => set({ waveform }),
        setAnalytics: (analytics) => set({ analytics }),

        // ====================================================================
        // SEQUENCER ACTIONS (INTERNAL - operate on active composition)
        // ====================================================================

        // Playback Actions (operate on active composition)
        play: async () => {
            try {
                const { activeComposition } = get();
                if (!activeComposition) {
                    toast.error("No active composition");
                    return;
                }
                await api.playback.play({ position: 0.0 });
                // Transport state will be updated via WebSocket
            } catch (error) {
                console.error("Failed to play:", error);
                toast.error("Failed to play");
            }
        },

        stop: async () => {
            try {
                const { activeComposition } = get();
                if (activeComposition) {
                    await api.playback.stop();
                }
            } catch (error) {
                console.error("Failed to stop playback:", error);
                toast.error("Failed to stop playback");
            }
        },

        pause: async () => {
            try {
                const { activeComposition } = get();
                if (activeComposition) {
                    await api.playback.pause();
                    // Transport state will be updated via WebSocket
                }
            } catch (error) {
                console.error("Failed to pause playback:", error);
                toast.error("Failed to pause playback");
            }
        },

        resume: async () => {
            try {
                const { activeComposition } = get();
                if (activeComposition) {
                    await api.playback.resume();
                    // Transport state will be updated via WebSocket
                }
            } catch (error) {
                console.error("Failed to resume playback:", error);
                toast.error("Failed to resume playback");
            }
        },

        setTempo: async (tempo) => {
            try {
                const { activeComposition } = get();
                if (activeComposition) {
                    await api.playback.setTempo({ tempo });

                    // Update local state
                    // Backend auto-persists, so just update local state
                    set((state) => ({
                        activeComposition: state.activeComposition ? {
                            ...state.activeComposition,
                            tempo
                        } : null,
                    }));

                }
            } catch (error) {
                console.error("Failed to set tempo:", error);
                toast.error("Failed to set tempo");
            }
        },

        toggleMetronome: async () => {
            try {
                // Toggle metronome - backend will handle state
                await api.audio.updateMetronome(undefined, undefined);
            } catch (error) {
                console.error("Failed to toggle metronome:", error);
                toast.error("Failed to toggle metronome");
            }
        },

        seek: async (position, triggerAudio = false) => {
            try {
                const { activeComposition } = get();
                if (!activeComposition) {
                    return;
                }

                await api.playback.seek({ position, trigger_audio: triggerAudio });
            } catch (error) {
                console.error("Failed to seek:", error);
                toast.error("Failed to seek");
            }
        },

        // ====================================================================
        // TRACK ACTIONS (operate on active composition)
        // ====================================================================

        createTrack: async (name, type, instrument) => {
            try {
                const { activeComposition } = get();
                if (!activeComposition) {
                    toast.error("No active composition");
                    return;
                }

                const track = await api.compositions.createTrack({
                    composition_id: activeComposition.id,
                    name,
                    type: type as "midi" | "audio" | "sample",
                    instrument,
                });

                // Backend auto-persists, so just update local state
                set((state) => ({
                    tracks: [...state.tracks, track],
                }));

                windowManager.broadcastState('tracks', get().tracks);
                toast.success(`Created track: ${name}`);
            } catch (error) {
                console.error("Failed to create track:", error);
                toast.error("Failed to create track");
            }
        },

        deleteTrack: async (trackId) => {
            try {
                const { activeComposition } = get();
                if (!activeComposition) {
                    toast.error("No active composition");
                    return;
                }

                await api.compositions.deleteTrack(activeComposition.id, trackId);

                // Backend auto-persists, so just update local state
                set((state) => ({
                    tracks: state.tracks.filter(t => t.id !== trackId),
                    clips: state.clips.filter(c => c.track_id !== trackId),
                }));

                windowManager.broadcastState('tracks', get().tracks);
                windowManager.broadcastState('clips', get().clips);
                toast.success("Track deleted");
            } catch (error) {
                console.error("Failed to delete track:", error);
                toast.error("Failed to delete track");
            }
        },

        renameTrack: async (trackId, name) => {
            try {
                const { activeComposition } = get();
                if (!activeComposition) return;

                await api.compositions.updateTrack(activeComposition.id, trackId, { name });

                // Backend auto-persists, so just update local state
                set((state) => ({
                    tracks: state.tracks.map(t => t.id === trackId ? { ...t, name } : t),
                }));

            } catch (error) {
                console.error("Failed to rename track:", error);
                toast.error("Failed to rename track");
            }
        },

        updateTrack: async (trackId, updates) => {
            try {
                const { activeComposition } = get();
                if (!activeComposition) return;

                await api.compositions.updateTrack(activeComposition.id, trackId, updates);

                // Backend auto-persists, so just update local state
                set((state) => ({
                    tracks: state.tracks.map(t => t.id === trackId ? { ...t, ...updates } : t),
                }));

            } catch (error) {
                console.error("Failed to update track:", error);
                toast.error("Failed to update track");
            }
        },

        updateTrackVolume: async (trackId, volume) => {
            try {
                const { activeComposition } = get();
                if (!activeComposition) return;

                await api.compositions.updateTrack(activeComposition.id, trackId, { volume });

                // Backend auto-persists, so just update local state
                set((state) => ({
                    tracks: state.tracks.map(t => t.id === trackId ? { ...t, volume } : t),
                }));
            } catch (error) {
                console.error("Failed to update track volume:", error);
                toast.error("Failed to update track volume");
            }
        },

        updateTrackPan: async (trackId, pan) => {
            try {
                const { activeComposition } = get();
                if (!activeComposition) return;

                await api.compositions.updateTrack(activeComposition.id, trackId, { pan });

                // Backend auto-persists, so just update local state
                set((state) => ({
                    tracks: state.tracks.map(t => t.id === trackId ? { ...t, pan } : t),
                }));
            } catch (error) {
                console.error("Failed to update track pan:", error);
                toast.error("Failed to update track pan");
            }
        },

        muteTrack: async (trackId, muted) => {
            try {
                const { activeComposition } = get();
                if (!activeComposition) return;

                await api.compositions.muteTrack({
                    composition_id: activeComposition.id,
                    track_id: trackId,
                    is_muted: muted,
                });

                // Backend auto-persists, so just update local state
                set((state) => ({
                    tracks: state.tracks.map(t => t.id === trackId ? { ...t, is_muted: muted } : t),
                }));
            } catch (error) {
                console.error("Failed to mute track:", error);
                toast.error("Failed to mute track");
            }
        },

        soloTrack: async (trackId, soloed) => {
            try {
                const { activeComposition } = get();
                if (!activeComposition) return;

                await api.compositions.soloTrack({
                    composition_id: activeComposition.id,
                    track_id: trackId,
                    is_solo: soloed,
                });

                // Backend auto-persists, so just update local state
                set((state) => ({
                    tracks: state.tracks.map(t => t.id === trackId ? { ...t, is_solo: soloed } : t),
                }));
            } catch (error) {
                console.error("Failed to solo track:", error);
                toast.error("Failed to solo track");
            }
        },

        // ====================================================================
        // CLIP ACTIONS
        // ====================================================================

        addClip: async (request) => {
            try {
                const clip = await api.compositions.addClip(request);

                // Backend auto-persists, so just update local state
                set((state) => ({
                    clips: [...state.clips, clip],
                }));

                windowManager.broadcastState('clips', get().clips);
            } catch (error) {
                console.error("Failed to add clip:", error);
                toast.error("Failed to add clip");
            }
        },

        updateClip: async (clipId, request) => {
            try {
                const { activeComposition } = get();
                if (!activeComposition) return;

                const updatedClip = await api.compositions.updateClip(activeComposition.id, clipId, request);

                // Backend auto-persists, so just update local state
                set((state) => ({
                    clips: state.clips.map(c => c.id === clipId ? updatedClip : c),
                }));

                windowManager.broadcastState('clips', get().clips);
            } catch (error) {
                console.error("Failed to update clip:", error);
                toast.error("Failed to update clip");
            }
        },

        deleteClip: async (clipId) => {
            try {
                const { activeComposition } = get();
                if (!activeComposition) return;

                await api.compositions.deleteClip(activeComposition.id, clipId);

                // Backend auto-persists, so just update local state
                set((state) => ({
                    clips: state.clips.filter(c => c.id !== clipId),
                }));

                windowManager.broadcastState('clips', get().clips);
            } catch (error) {
                console.error("Failed to delete clip:", error);
                toast.error("Failed to delete clip");
            }
        },

        duplicateClip: async (sequenceId, clipId) => {
            try {
                // Duplicate not supported in new API - get clip and create new one
                const clip = get().clips.find(c => c.id === clipId);
                if (!clip) {
                    toast.error("Clip not found");
                    return;
                }

                const newClip = await api.compositions.addClip({
                    sequence_id: sequenceId,
                    clip_type: clip.type,
                    track_id: clip.track_id,
                    start_time: clip.start_time + clip.duration, // Place after original
                    duration: clip.duration,
                    midi_events: clip.midi_events,
                    audio_file_path: clip.audio_file_path,
                    name: clip.name ? `${clip.name} (copy)` : undefined,
                });

                set((state) => ({
                    clips: [...state.clips, newClip],
                }));

                windowManager.broadcastState('clips', get().clips);
                toast.success("Clip duplicated");
            } catch (error) {
                console.error("Failed to duplicate clip:", error);
                toast.error("Failed to duplicate clip");
            }
        },

        // ====================================================================
        // SYNTHDEF ACTIONS
        // ====================================================================

        loadSynthDefs: async () => {
            try {
                const synthDefs = await api.audio.getSynthDefs();
                set({ synthDefs });
            } catch (error) {
                console.error("Failed to load synth defs:", error);
                toast.error("Failed to load synth defs");
            }
        },

        // ====================================================================
        // MIXER ACTIONS
        // ====================================================================

        loadChannels: async () => {
            try {
                const channels = await api.mixer.getChannels();
                set({ channels });
                windowManager.broadcastState('channels', channels);
            } catch (error) {
                console.error("Failed to load channels:", error);
                toast.error("Failed to load channels");
            }
        },

        loadMixerState: async (mixerState) => {
            try {
                const channels = mixerState.channels || [];
                const master = mixerState.master || null;

                set({ channels, master });
                windowManager.broadcastState('channels', channels);
                windowManager.broadcastState('master', master);
            } catch (error) {
                console.error("Failed to load mixer state:", error);
                toast.error("Failed to load mixer state");
                throw error;
            }
        },

        updateChannelVolume: async (channelId, volume) => {
            try {
                const updated = await api.mixer.updateChannel(channelId, { fader: volume });

                set((state) => ({
                    channels: state.channels.map(c => c.id === channelId ? updated : c),
                }));

                windowManager.broadcastState('channels', get().channels);
            } catch (error) {
                console.error("Failed to update channel volume:", error);
                toast.error("Failed to update channel volume");
            }
        },

        updateChannelPan: async (channelId, pan) => {
            try {
                const updated = await api.mixer.updateChannel(channelId, { pan });

                set((state) => ({
                    channels: state.channels.map(c => c.id === channelId ? updated : c),
                }));

                windowManager.broadcastState('channels', get().channels);
            } catch (error) {
                console.error("Failed to update channel pan:", error);
                toast.error("Failed to update channel pan");
            }
        },

        toggleChannelMute: async (channelId) => {
            try {
                const channel = get().channels.find(c => c.id === channelId);
                if (!channel) return;

                const updated = await api.mixer.updateChannel(channelId, { mute: !channel.mute });

                set((state) => ({
                    channels: state.channels.map(c => c.id === channelId ? updated : c),
                }));

                windowManager.broadcastState('channels', get().channels);
            } catch (error) {
                console.error("Failed to toggle channel mute:", error);
                toast.error("Failed to toggle channel mute");
            }
        },

        toggleChannelSolo: async (channelId) => {
            try {
                const channel = get().channels.find(c => c.id === channelId);
                if (!channel) return;

                const updated = await api.mixer.updateChannel(channelId, { solo: !channel.solo });

                set((state) => ({
                    channels: state.channels.map(c => c.id === channelId ? updated : c),
                }));

                windowManager.broadcastState('channels', get().channels);
            } catch (error) {
                console.error("Failed to toggle channel solo:", error);
                toast.error("Failed to toggle channel solo");
            }
        },

        loadMaster: async () => {
            try {
                const master = await api.mixer.getMaster();
                set({ master });
                windowManager.broadcastState('master', master);
            } catch (error) {
                console.error("Failed to load master channel:", error);
                toast.error("Failed to load master channel");
            }
        },

        updateMasterFader: async (fader) => {
            try {
                const updated = await api.mixer.updateMaster({ fader });
                set({ master: updated });
                windowManager.broadcastState('master', updated);
            } catch (error) {
                console.error("Failed to update master fader:", error);
                toast.error("Failed to update master fader");
            }
        },

        toggleMasterMute: async () => {
            try {
                const { master } = get();
                if (!master) return;

                const updated = await api.mixer.updateMaster({ mute: !master.mute });
                set({ master: updated });
                windowManager.broadcastState('master', updated);
            } catch (error) {
                console.error("Failed to toggle master mute:", error);
                toast.error("Failed to toggle master mute");
            }
        },

        toggleLimiter: async () => {
            try {
                const { master } = get();
                if (!master) return;

                const updated = await api.mixer.updateMaster({ limiter_enabled: !master.limiter_enabled });
                set({ master: updated });
                windowManager.broadcastState('master', updated);
            } catch (error) {
                console.error("Failed to toggle limiter:", error);
                toast.error("Failed to toggle limiter");
            }
        },

        setLimiterThreshold: async (threshold) => {
            try {
                const updated = await api.mixer.updateMaster({ limiter_threshold: threshold });
                set({ master: updated });
                windowManager.broadcastState('master', updated);
            } catch (error) {
                console.error("Failed to set limiter threshold:", error);
                toast.error("Failed to set limiter threshold");
            }
        },

        // ====================================================================
        // EFFECTS ACTIONS
        // ====================================================================

        loadEffectDefinitions: async () => {
            try {
                const definitions = await api.effects.getDefinitions();
                set({ effectDefinitions: definitions });
                windowManager.broadcastState('effectDefinitions', definitions);
            } catch (error) {
                console.error("Failed to load effect definitions:", error);
                toast.error("Failed to load effect definitions");
            }
        },

        loadEffectChain: async (trackId) => {
            try {
                const chain = await api.effects.getTrackEffectChain(trackId);

                set((state) => ({
                    effectChains: { ...state.effectChains, [trackId]: chain },
                }));

                windowManager.broadcastState('effectChains', get().effectChains);
            } catch (error) {
                console.error("Failed to load effect chain:", error);
                toast.error("Failed to load effect chain");
            }
        },

        loadEffectChains: async (chains) => {
            try {
                const chainsRecord: Record<string, TrackEffectChain> = {};
                for (const chain of chains) {
                    chainsRecord[chain.track_id] = chain;
                }

                set({ effectChains: chainsRecord });
                windowManager.broadcastState('effectChains', chainsRecord);
            } catch (error) {
                console.error("Failed to load effect chains:", error);
                toast.error("Failed to load effect chains");
                throw error;
            }
        },

        addEffect: async (trackId, effectName, slotIndex) => {
            try {
                const effect = await api.effects.addEffect({
                    track_id: trackId,
                    effect_name: effectName,
                    slot_index: slotIndex
                });

                set((state) => {
                    const chain = state.effectChains[trackId] || { track_id: trackId, effects: [] };
                    const newEffects = [...chain.effects, effect];
                    const newChain = { ...chain, effects: newEffects };

                    return {
                        effectChains: { ...state.effectChains, [trackId]: newChain },
                    };
                });

                windowManager.broadcastState('effectChains', get().effectChains);
                toast.success(`Added effect: ${effectName}`);
            } catch (error) {
                console.error("Failed to add effect:", error);
                toast.error("Failed to add effect");
            }
        },

        deleteEffect: async (effectId) => {
            try {
                await api.effects.deleteEffect(effectId);

                set((state) => {
                    const newChains = { ...state.effectChains };
                    Object.keys(newChains).forEach(trackId => {
                        newChains[trackId] = {
                            ...newChains[trackId],
                            effects: newChains[trackId].effects.filter(e => e.id !== effectId),
                        };
                    });
                    return { effectChains: newChains };
                });

                windowManager.broadcastState('effectChains', get().effectChains);
                toast.success("Effect deleted");
            } catch (error) {
                console.error("Failed to delete effect:", error);
                toast.error("Failed to delete effect");
            }
        },

        moveEffect: async (effectId, newSlotIndex) => {
            try {
                await api.effects.moveEffect(effectId, { new_slot_index: newSlotIndex });

                set((state) => {
                    const newChains = { ...state.effectChains };
                    Object.keys(newChains).forEach(trackId => {
                        const effectIndex = newChains[trackId].effects.findIndex(e => e.id === effectId);
                        if (effectIndex !== -1) {
                            const effects = [...newChains[trackId].effects];
                            const [effect] = effects.splice(effectIndex, 1);
                            effects.splice(newSlotIndex, 0, effect);
                            newChains[trackId] = { ...newChains[trackId], effects };
                        }
                    });
                    return { effectChains: newChains };
                });

            } catch (error) {
                console.error("Failed to move effect:", error);
                toast.error("Failed to move effect");
            }
        },

        toggleEffectBypass: async (effectId) => {
            try {
                let currentBypass = false;
                const { effectChains } = get();

                Object.values(effectChains).forEach(chain => {
                    const effect = chain.effects.find(e => e.id === effectId);
                    if (effect) {
                        currentBypass = effect.is_bypassed;
                    }
                });

                await api.effects.updateEffect(effectId, { bypassed: !currentBypass });

                set((state) => {
                    const newChains = { ...state.effectChains };
                    Object.keys(newChains).forEach(trackId => {
                        newChains[trackId] = {
                            ...newChains[trackId],
                            effects: newChains[trackId].effects.map(e =>
                                e.id === effectId ? { ...e, bypassed: !currentBypass } : e
                            ),
                        };
                    });
                    return { effectChains: newChains };
                });
            } catch (error) {
                console.error("Failed to toggle effect bypass:", error);
                toast.error("Failed to toggle effect bypass");
            }
        },

        updateEffectParameter: async (effectId, paramName, value) => {
            try {
                await api.effects.updateEffect(effectId, { parameters: { [paramName]: value } });

                set((state) => {
                    const newChains = { ...state.effectChains };
                    Object.keys(newChains).forEach(trackId => {
                        newChains[trackId] = {
                            ...newChains[trackId],
                            effects: newChains[trackId].effects.map(e =>
                                e.id === effectId
                                    ? { ...e, parameters: { ...e.parameters, [paramName]: value } }
                                    : e
                            ),
                        };
                    });
                    return { effectChains: newChains };
                });
            } catch (error) {
                console.error("Failed to update effect parameter:", error);
                toast.error("Failed to update effect parameter");
            }
        },

        // ====================================================================
        // SAMPLES ACTIONS
        // ====================================================================

        loadSamples: async () => {
            try {
                const response = await api.samples.getAll();
                set({ samples: response.samples });
                windowManager.broadcastState('samples', response.samples);
            } catch (error) {
                console.error("Failed to load samples:", error);
                toast.error("Failed to load samples");
            }
        },

        uploadSample: async (file, name, category = "Uncategorized") => {
            try {
                await api.samples.upload(file, name, category);
                await get().loadSamples();
                toast.success(`Uploaded sample: ${name}`);
            } catch (error) {
                console.error("Failed to upload sample:", error);
                toast.error("Failed to upload sample");
            }
        },

        deleteSample: async (sampleId) => {
            try {
                await api.samples.deleteSample(sampleId);
                await get().loadSamples();
                toast.success("Sample deleted");
            } catch (error) {
                console.error("Failed to delete sample:", error);
                toast.error("Failed to delete sample");
            }
        },

        updateSample: async (sampleId, name, category) => {
            try {
                await api.samples.update(sampleId, { name, category });
                await get().loadSamples();
                toast.success("Sample updated");
            } catch (error) {
                console.error("Failed to update sample:", error);
                toast.error("Failed to update sample");
            }
        },

        loadSampleAssignments: async (assignments) => {
            try {
                set({ sampleAssignments: assignments });
                windowManager.broadcastState('sampleAssignments', assignments);
            } catch (error) {
                console.error("Failed to load sample assignments:", error);
                toast.error("Failed to load sample assignments");
                throw error;
            }
        },

        assignSample: (trackId, samplePath) => {
            set((state) => {
                const newAssignments = { ...state.sampleAssignments, [trackId]: samplePath };
                windowManager.broadcastState('sampleAssignments', newAssignments);
                return { sampleAssignments: newAssignments };
            });
        },

        unassignSample: (trackId) => {
            set((state) => {
                const newAssignments = { ...state.sampleAssignments };
                delete newAssignments[trackId];
                windowManager.broadcastState('sampleAssignments', newAssignments);
                return { sampleAssignments: newAssignments };
            });
        },

        // ====================================================================
        // SYNTHESIS ACTIONS
        // ====================================================================

        createSynth: async (synthdef, params, group, bus) => {
            try {
                const response = await api.audio.createSynth({
                    synthdef,
                    params,
                    group,
                    bus: bus ?? undefined,
                });

                const synth: ActiveSynth = {
                    id: response.synth_id,
                    synthdef,
                    group: group ?? response.group,
                    bus: bus ?? null,
                };

                set((state) => ({
                    activeSynths: { ...state.activeSynths, [synth.id]: synth },
                }));

                return synth;
            } catch (error) {
                console.error("Failed to create synth:", error);
                toast.error("Failed to create synth");
                throw error;
            }
        },

        setSynthParam: async (synthId, param, value) => {
            try {
                await api.audio.setSynthParam(synthId, { param, value });
                // Note: We don't track params in ActiveSynth anymore
            } catch (error) {
                console.error("Failed to set synth param:", error);
                toast.error("Failed to set synth param");
            }
        },

        releaseSynth: async (synthId) => {
            try {
                await api.audio.deleteSynth(synthId, true); // release=true
                // Synth will be removed from activeSynths when it finishes releasing
            } catch (error) {
                console.error("Failed to release synth:", error);
                toast.error("Failed to release synth");
            }
        },

        freeSynth: async (synthId, immediate = false) => {
            try {
                await api.audio.deleteSynth(synthId, !immediate); // release=!immediate

                set((state) => {
                    const newSynths = { ...state.activeSynths };
                    delete newSynths[synthId];
                    return { activeSynths: newSynths };
                });
            } catch (error) {
                console.error("Failed to free synth:", error);
                toast.error("Failed to free synth");
            }
        },

        freeAllSynths: async () => {
            try {
                await api.audio.deleteAllSynths();
                set({ activeSynths: {} });
            } catch (error) {
                console.error("Failed to free all synths:", error);
                toast.error("Failed to free all synths");
            }
        },

        previewNote: async (note, velocity = 100, duration = 1.0, instrument = "default") => {
            try {
                await api.audio.previewNote({
                    note,
                    velocity,
                    duration,
                    synthdef: instrument,
                });
            } catch (error) {
                console.error("Failed to preview note:", error);
                toast.error("Failed to preview note");
            }
        },

        // ====================================================================
        // COMPOSITION ACTIONS (PRIMARY - what users interact with)
        // ====================================================================

        loadCompositions: async () => {
            try {
                const response = await api.compositions.list();
                set({ compositions: response.compositions });
            } catch (error) {
                console.error("Failed to load compositions:", error);
                toast.error("Failed to load compositions");
            }
        },

        createComposition: async (name, tempo = 120, timeSignature = "4/4") => {
            try {
                const response = await api.compositions.create({
                    name,
                    tempo,
                    time_signature: timeSignature,
                });

                // Load the newly created composition
                await get().loadComposition(response.composition_id);

                // Refresh composition list
                await get().loadCompositions();

                toast.success(`Created composition: ${name}`);
            } catch (error) {
                console.error("Failed to create composition:", error);
                toast.error("Failed to create composition");
                throw error;
            }
        },

        loadComposition: async (compositionId) => {
            try {
                const snapshot = await api.compositions.getById(compositionId);

                // Extract state from snapshot (composition has tracks/clips directly)
                const tracks = snapshot.tracks || [];
                const clips = snapshot.clips || [];

                // Load mixer state
                const channels = snapshot.mixer_state?.channels || [];
                const master = snapshot.mixer_state?.master || null;

                // Load effects state
                const effectChainsArray = snapshot.track_effects || [];
                const effectChains: Record<string, TrackEffectChain> = {};
                effectChainsArray.forEach((chain: TrackEffectChain) => {
                    effectChains[chain.track_id] = chain;
                });

                // Load samples state
                const sampleAssignments = snapshot.sample_assignments || {};

                set({
                    activeComposition: snapshot,
                    tracks,
                    clips,
                    channels,
                    master,
                    effectChains,
                    sampleAssignments,
                    hasUnsavedChanges: false,
                    // Sync loop state from composition to UI state
                    isLooping: snapshot.loop_enabled ?? false,
                    loopStart: snapshot.loop_start ?? 0,
                    loopEnd: snapshot.loop_end ?? 16,
                });

                // Save to localStorage so we can auto-load on next startup
                statePersistence.setActiveSequenceId(compositionId);

                // Broadcast to other windows
                windowManager.broadcastState('activeComposition', snapshot);
                windowManager.broadcastState('tracks', tracks);
                windowManager.broadcastState('clips', clips);
                windowManager.broadcastState('channels', channels);
                windowManager.broadcastState('master', master);
                windowManager.broadcastState('effectChains', effectChains);
                windowManager.broadcastState('sampleAssignments', sampleAssignments);

                toast.success(`Loaded composition: ${snapshot.name}`);
            } catch (error) {
                console.error("Failed to load composition:", error);
                toast.error("Failed to load composition");
                throw error;
            }
        },

        saveComposition: async (createHistory = true, isAutosave = false) => {
            try {
                const { activeComposition } = get();
                if (!activeComposition) {
                    throw new Error("No active composition to save");
                }

                await api.compositions.saveComposition(
                    activeComposition.id,
                    createHistory,
                    isAutosave
                );

                set({ hasUnsavedChanges: false });

                if (!isAutosave) {
                    toast.success(`Saved composition: ${activeComposition.name}`);
                }

                // Refresh composition list
                await get().loadCompositions();
            } catch (error) {
                console.error("Failed to save composition:", error);
                if (!isAutosave) {
                    toast.error("Failed to save composition");
                }
                throw error;
            }
        },

        updateCompositionMetadata: async (name, tempo, timeSignature) => {
            try {
                const { activeComposition } = get();
                if (!activeComposition) {
                    throw new Error("No active composition");
                }

                await api.compositions.update(activeComposition.id, {
                    name,
                    tempo,
                    time_signature: timeSignature,
                });

                // Update local state
                const updatedComposition = { ...activeComposition };
                if (name) updatedComposition.name = name;
                if (tempo) updatedComposition.tempo = tempo;
                if (timeSignature) updatedComposition.time_signature = timeSignature;

                // Backend auto-persists, so just update local state
                set({
                    activeComposition: updatedComposition,
                });

                toast.success("Composition updated");
            } catch (error) {
                console.error("Failed to update composition:", error);
                toast.error("Failed to update composition");
                throw error;
            }
        },

        deleteComposition: async (compositionId) => {
            try {
                await api.compositions.deleteComposition(compositionId);

                // If we deleted the active composition, clear it
                const { activeComposition } = get();
                if (activeComposition?.id === compositionId) {
                    set({
                        activeComposition: null,
                        tracks: [],
                        clips: [],
                        channels: [],
                        master: null,
                        effectChains: {},
                        sampleAssignments: {},
                    });
                }

                await get().loadCompositions();
                toast.success("Composition deleted");
            } catch (error) {
                console.error("Failed to delete composition:", error);
                toast.error("Failed to delete composition");
                throw error;
            }
        },

        markCompositionChanged: () => {
            set({ hasUnsavedChanges: true });
        },

        markCompositionSaved: () => {
            set({ hasUnsavedChanges: false });
        },

        // ====================================================================
        // UI ACTIONS
        // ====================================================================

        setZoom: (zoom) => set({ zoom }),
        setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
        setGridSize: (size) => set({ gridSize: size }),
        setIsLooping: async (looping) => {
            set({ isLooping: looping });
            const { activeComposition, loopStart, loopEnd } = get();
            if (activeComposition) {
                // Update composition directly (no nested sequence)
                const updatedComposition = {
                    ...activeComposition,
                    loop_enabled: looping,
                };
                // Backend auto-persists, so just update local state
                set({ activeComposition: updatedComposition });
                // Send to backend
                try {
                    await api.playback.setLoop(looping, loopStart, loopEnd);
                } catch (error) {
                    console.error("Failed to update loop enabled:", error);
                }
            }
        },
        setLoopStart: async (start) => {
            set({ loopStart: start });
            const { activeComposition, isLooping, loopEnd } = get();
            if (activeComposition) {
                // Update composition directly (no nested sequence)
                const updatedComposition = {
                    ...activeComposition,
                    loop_start: start,
                };
                // Backend auto-persists, so just update local state
                set({ activeComposition: updatedComposition });
                // Send to backend
                try {
                    await api.playback.setLoop(isLooping, start, loopEnd);
                } catch (error) {
                    console.error("Failed to update loop start:", error);
                }
            }
        },
        setLoopEnd: async (end) => {
            set({ loopEnd: end });
            const { activeComposition, isLooping, loopStart } = get();
            if (activeComposition) {
                // Update composition directly (no nested sequence)
                const updatedComposition = {
                    ...activeComposition,
                    loop_end: end,
                };
                // Backend auto-persists, so just update local state
                set({ activeComposition: updatedComposition });
                // Send to backend
                try {
                    await api.playback.setLoop(isLooping, loopStart, end);
                } catch (error) {
                    console.error("Failed to update loop end:", error);
                }
            }
        },
        setSelectedClipId: (id) => set({ selectedClipId: id }),

        // Scroll actions - simple state updates, no side effects
        setTimelineScrollLeft: (scrollLeft) => set({ timelineScrollLeft: scrollLeft }),
        setPianoRollScrollLeft: (scrollLeft) => set({ pianoRollScrollLeft: scrollLeft }),
        setSampleEditorScrollLeft: (scrollLeft) => set({ sampleEditorScrollLeft: scrollLeft }),

        setShowSampleBrowser: (show) => set({ showSampleBrowser: show }),
        setShowSequenceManager: (show) => set({ showSequenceManager: show }),
        setShowSequenceSettings: (show) => set({ showSequenceSettings: show }),

        openPianoRoll: (clipId) => set({
            showPianoRoll: true,
            pianoRollClipId: clipId
        }),

        closePianoRoll: () => set({
            showPianoRoll: false,
            pianoRollClipId: null
        }),

        setShowMeters: (show) => set({ showMeters: show }),
        setMeterMode: (mode) => set({ meterMode: mode }),
        setSelectedChannelId: (id) => set({ selectedChannelId: id }),
        setSelectedEffectId: (id) => set({ selectedEffectId: id }),
        setShowEffectBrowser: (show) => set({ showEffectBrowser: show }),

        // ====================================================================
        // AI ACTIONS
        // ====================================================================

        addChatMessage: (message) => {
            set((state) => ({
                chatHistory: [...state.chatHistory, message]
            }));
            windowManager.broadcastState('chatHistory', get().chatHistory);
        },

        clearChatHistory: () => {
            set({ chatHistory: [] });
            windowManager.broadcastState('chatHistory', []);
        },

        addAnalysisEvent: (event) => {
            set((state) => ({
                analysisEvents: [...state.analysisEvents, event]
            }));
            windowManager.broadcastState('analysisEvents', get().analysisEvents);
        },

        clearAnalysisEvents: () => {
            set({ analysisEvents: [] });
            windowManager.broadcastState('analysisEvents', []);
        },

        setDAWStateSnapshot: (snapshot) => {
            set({ dawStateSnapshot: snapshot });
            windowManager.broadcastState('dawStateSnapshot', snapshot);
        },

        setAIContext: (context) => {
            set({ aiContext: context });
            windowManager.broadcastState('aiContext', context);
        },

        // ====================================================================
        // ACTIVITY ACTIONS
        // ====================================================================

        startActivity: (action, message, options = {}) => {
            const id = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const activity: AIActivity = {
                id,
                action,
                status: "in-progress",
                message,
                timestamp: Date.now(),
                duration: options.duration,
                targetId: options.targetId,
                targetType: options.targetType,
                tabId: options.tabId,
                metadata: options.metadata,
            };

            set((state) => ({
                activities: [...state.activities, activity],
                isAIActive: true,
            }));

            windowManager.broadcastState('ai-activity', {
                activities: get().activities,
                activityHistory: get().activityHistory,
                isAIActive: true,
            });

            return id;
        },

        completeActivity: (id, success, message) => {
            set((state) => {
                const activity = state.activities.find(a => a.id === id);
                if (!activity) return state;

                const updatedActivity: AIActivity = {
                    ...activity,
                    status: success ? "success" : "error",
                    message: message || activity.message,
                };

                const remainingActivities = state.activities.filter(a => a.id !== id);
                const newHistory = [updatedActivity, ...state.activityHistory].slice(0, 50); // Keep last 50

                return {
                    activities: remainingActivities,
                    activityHistory: newHistory,
                    isAIActive: remainingActivities.length > 0,
                };
            });

            windowManager.broadcastState('ai-activity', {
                activities: get().activities,
                activityHistory: get().activityHistory,
                isAIActive: get().isAIActive,
            });

            // Auto-cleanup: remove from history after 5 seconds
            setTimeout(() => {
                set((state) => ({
                    activityHistory: state.activityHistory.filter(a => a.id !== id)
                }));
            }, 5000);
        },

        updateActivity: (id, updates) => {
            set((state) => ({
                activities: state.activities.map(a =>
                    a.id === id ? { ...a, ...updates } : a
                )
            }));

            windowManager.broadcastState('ai-activity', {
                activities: get().activities,
                activityHistory: get().activityHistory,
                isAIActive: get().isAIActive,
            });
        },

        clearActivities: () => {
            set({ activities: [], isAIActive: false });
            windowManager.broadcastState('ai-activity', {
                activities: [],
                activityHistory: get().activityHistory,
                isAIActive: false,
            });
        },

        clearActivityHistory: () => {
            set({ activityHistory: [] });
            windowManager.broadcastState('ai-activity', {
                activities: get().activities,
                activityHistory: [],
                isAIActive: get().isAIActive,
            });
        },

        getActivitiesForTarget: (targetId) => {
            return get().activities.filter(a => a.targetId === targetId);
        },

        getActivitiesForTab: (tabId) => {
            return get().activities.filter(a => a.tabId === tabId);
        },

        getActivityById: (id) => {
            return get().activities.find(a => a.id === id);
        },
    }))
);
