/**
 * MixerContext - Global context for mixer state (SOURCE OF TRUTH)
 *
 * This is the GLOBAL mixer context that manages:
 * - Mixer channels (volume/pan/mute/solo for each track)
 * - Master channel state
 * - Real-time metering data (from WebSocket)
 * - Cross-window synchronization via BroadcastChannel
 *
 * ARCHITECTURE:
 * - SequencerContext owns tracks (instrument, clips, MIDI data)
 * - MixerContext owns channels (mixing parameters for those tracks)
 * - Each track has a corresponding mixer channel (1:1 relationship)
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
import { useMeterWebSocket, type TrackMeters } from "@/hooks/useMeterWebsocket";
import type { MasterChannel, MixerChannel } from "@/modules/mixer/types";

// ============================================================================
// STATE TYPES
// ============================================================================

interface MixerState {
    // Mixer Channels (one per sequencer track)
    channels: MixerChannel[];

    // Master Channel
    master: MasterChannel | null;

    // Real-time metering (from WebSocket)
    meters: TrackMeters;

    // UI State
    showMeters: boolean;
    meterMode: "peak" | "rms" | "both";
    selectedChannelId: string | null;
}

// ============================================================================
// CONTEXT VALUE TYPE
// ============================================================================

interface MixerContextValue extends MixerState {
    // Channel Actions
    loadChannels: (sequenceId: string) => Promise<void>;
    updateChannelVolume: (channelId: string, volume: number) => Promise<void>;
    updateChannelPan: (channelId: string, pan: number) => Promise<void>;
    toggleChannelMute: (channelId: string) => Promise<void>;
    toggleChannelSolo: (channelId: string) => Promise<void>;

    // Master Channel Actions
    loadMaster: () => Promise<void>;
    updateMasterFader: (fader: number) => Promise<void>;
    toggleMasterMute: () => Promise<void>;
    toggleLimiter: () => Promise<void>;
    setLimiterThreshold: (threshold: number) => Promise<void>;

    // UI Actions
    setShowMeters: (show: boolean) => void;
    setMeterMode: (mode: "peak" | "rms" | "both") => void;
    setSelectedChannelId: (id: string | null) => void;
}

const MixerContext = createContext<MixerContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function MixerProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<MixerState>({
        channels: [],
        master: null,
        meters: {},
        showMeters: true,
        meterMode: "both",
        selectedChannelId: null,
    });

    // Real-time metering via WebSocket
    const { meters: wsMeters } = useMeterWebSocket();

    // Sync WebSocket meters to state
    useEffect(() => {
        if (wsMeters && Object.keys(wsMeters).length > 0) {
            setState(prev => ({ ...prev, meters: wsMeters }));
        }
    }, [wsMeters]);

    // Broadcast state changes to other windows
    const broadcastUpdate = useCallback((key: string, value: any) => {
        windowManager.broadcastState(`mixer.${key}`, value);
    }, []);

    // Listen for state updates from other windows
    useEffect(() => {
        const unsubscribers: (() => void)[] = [];

        const keys = ['channels', 'master'];
        keys.forEach(key => {
            const unsub = windowManager.subscribeToState(`mixer.${key}`, (value: any) => {
                setState(prev => ({ ...prev, [key]: value }));
            });
            unsubscribers.push(unsub);
        });

        return () => unsubscribers.forEach(unsub => unsub());
    }, []);

    // ========================================================================
    // CHANNEL ACTIONS
    // ========================================================================

    const loadChannels = useCallback(async (sequenceId: string) => {
        try {
            const channels = await api.mixer.getChannels();
            setState(prev => ({ ...prev, channels: channels as any[] }));
            broadcastUpdate('channels', channels);
        } catch (error) {
            console.error("Failed to load mixer channels:", error);
            toast.error("Failed to load mixer channels");
        }
    }, [broadcastUpdate]);

    const updateChannelVolume = useCallback(async (channelId: string, volume: number) => {
        try {
            const updated = await api.mixer.updateChannel(channelId, { fader: volume });
            setState(prev => ({
                ...prev,
                channels: prev.channels.map(c => c.id === channelId ? updated as any : c),
            }));
            broadcastUpdate('channels', state.channels);
        } catch (error) {
            console.error("Failed to update channel volume:", error);
            toast.error("Failed to update channel volume");
        }
    }, [broadcastUpdate, state.channels]);

    const updateChannelPan = useCallback(async (channelId: string, pan: number) => {
        try {
            const updated = await api.mixer.updateChannel(channelId, { pan });
            setState(prev => ({
                ...prev,
                channels: prev.channels.map(c => c.id === channelId ? updated as any : c),
            }));
            broadcastUpdate('channels', state.channels);
        } catch (error) {
            console.error("Failed to update channel pan:", error);
            toast.error("Failed to update channel pan");
        }
    }, [broadcastUpdate, state.channels]);

    const toggleChannelMute = useCallback(async (channelId: string) => {
        const channel = state.channels.find(c => c.id === channelId);
        if (!channel) return;
        try {
            const updated = await api.mixer.updateChannel(channelId, { mute: !channel.mute });
            setState(prev => ({
                ...prev,
                channels: prev.channels.map(c => c.id === channelId ? updated as any : c),
            }));
            broadcastUpdate('channels', state.channels);
        } catch (error) {
            console.error("Failed to toggle channel mute:", error);
            toast.error("Failed to toggle channel mute");
        }
    }, [state.channels, broadcastUpdate]);

    const toggleChannelSolo = useCallback(async (channelId: string) => {
        const channel = state.channels.find(c => c.id === channelId);
        if (!channel) return;
        try {
            const updated = await api.mixer.updateChannel(channelId, { solo: !channel.solo });
            setState(prev => ({
                ...prev,
                channels: prev.channels.map(c => c.id === channelId ? updated as any : c),
            }));
            broadcastUpdate('channels', state.channels);
        } catch (error) {
            console.error("Failed to toggle channel solo:", error);
            toast.error("Failed to toggle channel solo");
        }
    }, [state.channels, broadcastUpdate]);

    // ========================================================================
    // MASTER CHANNEL ACTIONS
    // ========================================================================

    const loadMaster = useCallback(async () => {
        try {
            const master = await api.mixer.getMaster();
            setState(prev => ({ ...prev, master: master as any }));
            broadcastUpdate('master', master);
        } catch (error) {
            console.error("Failed to load master channel:", error);
            toast.error("Failed to load master channel");
        }
    }, [broadcastUpdate]);

    const updateMasterFader = useCallback(async (fader: number) => {
        try {
            const updated = await api.mixer.updateMaster({ fader });
            setState(prev => ({ ...prev, master: updated as any }));
            broadcastUpdate('master', updated);
        } catch (error) {
            console.error("Failed to update master fader:", error);
            toast.error("Failed to update master fader");
        }
    }, [broadcastUpdate]);

    const toggleMasterMute = useCallback(async () => {
        if (!state.master) return;
        try {
            const updated = await api.mixer.updateMaster({ muted: !state.master.mute });
            setState(prev => ({ ...prev, master: updated as any }));
            broadcastUpdate('master', updated);
        } catch (error) {
            console.error("Failed to toggle master mute:", error);
            toast.error("Failed to toggle master mute");
        }
    }, [state.master, broadcastUpdate]);

    const toggleLimiter = useCallback(async () => {
        if (!state.master) return;
        try {
            const updated = await api.mixer.updateMaster({ limiter_enabled: !state.master.limiter_enabled });
            setState(prev => ({ ...prev, master: updated as any }));
            broadcastUpdate('master', updated);
        } catch (error) {
            console.error("Failed to toggle limiter:", error);
            toast.error("Failed to toggle limiter");
        }
    }, [state.master, broadcastUpdate]);

    const setLimiterThreshold = useCallback(async (threshold: number) => {
        try {
            const updated = await api.mixer.updateMaster({ limiter_threshold: threshold });
            setState(prev => ({ ...prev, master: updated as any }));
            broadcastUpdate('master', updated);
        } catch (error) {
            console.error("Failed to set limiter threshold:", error);
            toast.error("Failed to set limiter threshold");
        }
    }, [broadcastUpdate]);

    // ========================================================================
    // UI ACTIONS
    // ========================================================================

    const setShowMeters = useCallback((show: boolean) => {
        setState(prev => ({ ...prev, showMeters: show }));
    }, []);

    const setMeterMode = useCallback((mode: "peak" | "rms" | "both") => {
        setState(prev => ({ ...prev, meterMode: mode }));
    }, []);

    const setSelectedChannelId = useCallback((id: string | null) => {
        setState(prev => ({ ...prev, selectedChannelId: id }));
    }, []);

    // ========================================================================
    // CONTEXT VALUE
    // ========================================================================

    const value: MixerContextValue = {
        ...state,
        loadChannels,
        updateChannelVolume,
        updateChannelPan,
        toggleChannelMute,
        toggleChannelSolo,
        loadMaster,
        updateMasterFader,
        toggleMasterMute,
        toggleLimiter,
        setLimiterThreshold,
        setShowMeters,
        setMeterMode,
        setSelectedChannelId,
    };

    return (
        <MixerContext.Provider value={value}>
            {children}
        </MixerContext.Provider>
    );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useMixer() {
    const context = useContext(MixerContext);
    if (context === undefined) {
        throw new Error("useMixer must be used within a MixerProvider");
    }
    return context;
}

// Convenience hooks
export function useMixerChannels() {
    const { channels, loadChannels, updateChannelVolume, updateChannelPan, toggleChannelMute, toggleChannelSolo } = useMixer();
    return { channels, loadChannels, updateChannelVolume, updateChannelPan, toggleChannelMute, toggleChannelSolo };
}

export function useMasterChannel() {
    const { master, loadMaster, updateMasterFader, toggleMasterMute, toggleLimiter, setLimiterThreshold } = useMixer();
    return { master, loadMaster, updateMasterFader, toggleMasterMute, toggleLimiter, setLimiterThreshold };
}

export function useMixerMeters() {
    const { meters } = useMixer();
    return meters;
}

export function useMixerUI() {
    const { showMeters, meterMode, selectedChannelId, setShowMeters, setMeterMode, setSelectedChannelId } = useMixer();
    return { showMeters, meterMode, selectedChannelId, setShowMeters, setMeterMode, setSelectedChannelId };
}

