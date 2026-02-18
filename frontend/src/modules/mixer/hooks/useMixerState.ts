/**
 * useMixerState - Custom hook for mixer-specific UI state management
 *
 * Encapsulates all mixer UI state (view settings, selection, etc.)
 * Follows the same pattern as useSequencerState
 *
 * This hook manages:
 * - View settings (show meters, meter mode)
 * - Selection state (selected channel)
 * - Channel strip visibility
 */

import { useState, useCallback } from "react";
import type { MasterChannel } from "../types";

export interface MixerState {
    // View settings
    showMeters: boolean;
    meterMode: "peak" | "rms" | "both";

    // Selection
    selectedChannelId: string | null;

    // Channel strip sections visibility
    showInputSection: boolean;
    showSendSection: boolean;
    showInsertSection: boolean;

    // Master channel
    master: MasterChannel;
}

export interface MixerActions {
    // View settings
    setShowMeters: (show: boolean) => void;
    setMeterMode: (mode: "peak" | "rms" | "both") => void;

    // Selection
    setSelectedChannelId: (channelId: string | null) => void;

    // Channel strip sections
    setShowInputSection: (show: boolean) => void;
    setShowSendSection: (show: boolean) => void;
    setShowInsertSection: (show: boolean) => void;

    // Master channel
    setMaster: (master: MasterChannel) => void;

    // Convenience methods
    toggleMeters: () => void;
    selectChannel: (channelId: string) => void;
    deselectChannel: () => void;
}

export function useMixerState() {
    // View settings
    const [showMeters, setShowMeters] = useState(true);
    const [meterMode, setMeterMode] = useState<"peak" | "rms" | "both">("peak");

    // Selection
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

    // Channel strip sections (for future expansion)
    const [showInputSection, setShowInputSection] = useState(true);
    const [showSendSection, setShowSendSection] = useState(false);
    const [showInsertSection, setShowInsertSection] = useState(false);

    // Master channel
    const [master, setMaster] = useState<MasterChannel>({
        id: "master",
        name: "Master",
        color: "#ef4444",
        type: "master",
        fader: 0.0,
        mute: false,
        meter_peak_left: -60.0,
        meter_peak_right: -60.0,
        limiter_enabled: false,
        limiter_threshold: -1.0,
        sc_bus_index: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    });

    // Convenience methods
    const toggleMeters = useCallback(() => {
        setShowMeters((prev) => !prev);
    }, []);

    const selectChannel = useCallback((channelId: string) => {
        setSelectedChannelId(channelId);
    }, []);

    const deselectChannel = useCallback(() => {
        setSelectedChannelId(null);
    }, []);

    const state: MixerState = {
        showMeters,
        meterMode,
        selectedChannelId,
        showInputSection,
        showSendSection,
        showInsertSection,
        master,
    };

    const actions: MixerActions = {
        setShowMeters,
        setMeterMode,
        setSelectedChannelId,
        setShowInputSection,
        setShowSendSection,
        setShowInsertSection,
        setMaster,
        toggleMeters,
        selectChannel,
        deselectChannel,
    };

    return { state, actions };
}

