/**
 * useMixerHandlers Hook
 *
 * Centralizes all event handler logic for the mixer.
 * Separates business logic from UI rendering.
 *
 * Handler Categories:
 * - Track updates: volume/pan changes (via AudioEngine context)
 * - Mute/Solo: track muting and soloing (via AudioEngine context)
 * - Master: update master channel
 */

import { useCallback } from "react";
import { api } from "@/services/api";
import type { MasterChannel, UpdateMasterRequest } from "../types";
import type { SequencerTrack } from "@/modules/sequencer/types";

interface UseMixerHandlersProps {
    // Data
    tracks: SequencerTrack[];
    master: MasterChannel;

    // Actions (from AudioEngine context)
    updateSequencerTrack: (trackId: string, updates: Partial<SequencerTrack>) => Promise<void>;
    muteSequencerTrack: (trackId: string, isMuted: boolean) => Promise<void>;
    soloSequencerTrack: (trackId: string, isSolo: boolean) => Promise<void>;

    // Master update action
    setMaster: (master: MasterChannel) => void;
}

export function useMixerHandlers(props: UseMixerHandlersProps) {
    const { tracks, master, updateSequencerTrack, muteSequencerTrack, soloSequencerTrack, setMaster } = props;

    // ========================================================================
    // FADER HANDLERS (Volume)
    // ========================================================================

    const handleFaderChange = useCallback(async (
        trackId: string,
        volume: number
    ) => {
        try {
            // Update track volume via AudioEngine context
            await updateSequencerTrack(trackId, { volume });
        } catch (error) {
            console.error("Failed to update track volume:", error);
        }
    }, [updateSequencerTrack]);

    const handleMasterFaderChange = useCallback(async (fader: number) => {
        try {
            // Update master channel via mixer provider
            const updatedMaster = await api.mixer.updateMaster({ volume: fader });
            // Update local state
            setMaster(updatedMaster);
        } catch (error) {
            console.error("Failed to update master fader:", error);
        }
    }, [setMaster]);

    // ========================================================================
    // PAN HANDLERS
    // ========================================================================

    const handlePanChange = useCallback(async (
        trackId: string,
        pan: number
    ) => {
        try {
            // Update track pan via AudioEngine context
            await updateSequencerTrack(trackId, { pan });
        } catch (error) {
            console.error("Failed to update track pan:", error);
        }
    }, [updateSequencerTrack]);

    // ========================================================================
    // MUTE/SOLO HANDLERS
    // ========================================================================

    const handleToggleMute = useCallback(async (trackId: string) => {
        try {
            const track = tracks.find((t) => t.id === trackId);
            if (track) {
                // Toggle mute via AudioEngine context
                await muteSequencerTrack(trackId, !track.is_muted);
            }
        } catch (error) {
            console.error("Failed to toggle mute:", error);
        }
    }, [tracks, muteSequencerTrack]);

    const handleToggleSolo = useCallback(async (trackId: string) => {
        try {
            const track = tracks.find((t) => t.id === trackId);
            if (track) {
                // Toggle solo via AudioEngine context
                await soloSequencerTrack(trackId, !track.is_solo);
            }
        } catch (error) {
            console.error("Failed to toggle solo:", error);
        }
    }, [tracks, soloSequencerTrack]);

    // ========================================================================
    // MASTER LIMITER HANDLERS
    // ========================================================================

    const handleToggleLimiter = useCallback(async () => {
        try {
            const updatedMaster = await api.mixer.updateMaster({
                limiter_enabled: !master.limiter_enabled,
            });
            setMaster(updatedMaster);
        } catch (error) {
            console.error("Failed to toggle limiter:", error);
        }
    }, [master.limiter_enabled, setMaster]);

    const handleLimiterThresholdChange = useCallback(async (threshold: number) => {
        try {
            const updatedMaster = await api.mixer.updateMaster({
                limiter_threshold: threshold,
            });
            setMaster(updatedMaster);
        } catch (error) {
            console.error("Failed to update limiter threshold:", error);
        }
    }, [setMaster]);

    return {
        handleFaderChange,
        handleMasterFaderChange,
        handlePanChange,
        handleToggleMute,
        handleToggleSolo,
        handleToggleLimiter,
        handleLimiterThresholdChange,
    };
}

