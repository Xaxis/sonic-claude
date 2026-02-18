/**
 * useSequencerClipHandlers Hook
 * 
 * Handles all clip-related operations for the sequencer.
 * Separated from useSequencerHandlers to keep file sizes manageable.
 * 
 * Handler Categories:
 * - Clip CRUD: add, duplicate, paste, delete
 * - Clip Editing: move, resize, update
 * - Piano Roll: open, update MIDI notes
 */

import { useCallback } from "react";
import { toast } from "sonner";
import type { MIDIEvent, AddClipRequest } from "../types.ts";
import type { SequencerTrack, Clip } from "@/types/sequencer";

interface UseSequencerClipHandlersProps {
    // Audio Engine Context
    tempo: number;
    sequences: any[];
    activeSequenceId: string | null;
    sequencerTracks: SequencerTrack[];
    addClip: (sequenceId: string, clipRequest: AddClipRequest) => Promise<Clip | undefined>;
    updateClip: (sequenceId: string, clipId: string, updates: any) => Promise<void>;
    deleteClip: (sequenceId: string, clipId: string) => Promise<void>;
    duplicateClip: (sequenceId: string, clipId: string) => Promise<void>;
    
    // Sequencer State
    state: {
        clipboardClip: Clip | null;
    };
    actions: {
        openPianoRoll: (clipId: string) => void;
        openSampleEditor: (clipId: string) => void;
    };
}

export function useSequencerClipHandlers(props: UseSequencerClipHandlersProps) {
    const {
        tempo,
        sequences,
        activeSequenceId,
        sequencerTracks: tracks,
        addClip,
        updateClip,
        deleteClip,
        duplicateClip,
        state,
        actions,
    } = props;

    const activeSequence = sequences.find((s) => s.id === activeSequenceId);
    const clips = activeSequence?.clips || [];

    // ========================================================================
    // CLIP HANDLERS
    // ========================================================================

    const handleAddClipToTrack = useCallback(async (trackId: string, startBeat: number) => {
        console.log("🎵 handleAddClipToTrack called:", { trackId, startBeat, activeSequenceId });

        if (!activeSequenceId) {
            console.warn("No active sequence");
            toast.error("No active sequence");
            return;
        }

        const track = tracks.find((t) => t.id === trackId);
        if (!track) {
            console.warn("Track not found");
            toast.error("Track not found");
            return;
        }

        console.log("🎵 Track found:", track);

        // For sample tracks, create audio clip with sample's actual duration
        if (track.type === "sample" && track.sample_id) {
            try {
                // Fetch sample metadata to get duration using proper API
                const { api } = await import("@/services/api");
                const sampleData = await api.samples.getById(track.sample_id);

                // Convert sample duration (seconds) to beats
                const durationBeats = sampleData.duration
                    ? (sampleData.duration / 60) * tempo
                    : 4;

                const clipRequest = {
                    clip_type: "audio" as const,
                    track_id: trackId,
                    start_time: startBeat,
                    duration: durationBeats,
                    audio_file_path: track.sample_id,
                };
                await addClip(activeSequenceId, clipRequest);
            } catch (error) {
                console.error("Failed to fetch sample metadata:", error);
                // Fallback: create clip with default duration
                const clipRequest = {
                    clip_type: "audio" as const,
                    track_id: trackId,
                    start_time: startBeat,
                    duration: 4,
                    audio_file_path: track.sample_id,
                };
                await addClip(activeSequenceId, clipRequest);
            }
        } else {
            // For MIDI tracks, create empty MIDI clip and auto-open piano roll
            console.log("🎹 Creating MIDI clip...");

            const clipRequest = {
                clip_type: "midi" as const,
                track_id: trackId,
                start_time: startBeat,
                duration: 4,
                midi_events: [], // Start with empty clip
            };
            console.log("🎹 Clip request:", clipRequest);
            const newClip = await addClip(activeSequenceId, clipRequest);
            console.log("🎹 addClip completed, clip:", newClip);

            // Auto-open piano roll for the new MIDI clip
            if (newClip) {
                console.log("🎹 Opening piano roll for clip:", newClip.id);
                actions.openPianoRoll(newClip.id);
                toast.success("MIDI clip created - add notes in piano roll below");
            }
        }
    }, [activeSequenceId, tracks, tempo, addClip, actions]);

    const handleDuplicateClip = useCallback(async (clipId: string) => {
        if (!activeSequenceId) {
            console.warn("No active sequence");
            return;
        }
        await duplicateClip(activeSequenceId, clipId);
    }, [activeSequenceId, duplicateClip]);

    const handlePasteClip = useCallback(async () => {
        if (!state.clipboardClip || !activeSequenceId) return;

        try {
            // Get current playhead position from transport
            const currentPosition = sequences.find((s) => s.id === activeSequenceId)?.current_position || 0;

            // Create new clip at playhead position
            const clipRequest: AddClipRequest = {
                clip_type: state.clipboardClip.type,
                track_id: state.clipboardClip.track_id,
                start_time: currentPosition,
                duration: state.clipboardClip.duration,
                midi_events: state.clipboardClip.midi_events,
                audio_file_path: state.clipboardClip.audio_file_path,
            };

            await addClip(activeSequenceId, clipRequest);
            toast.success("Clip pasted");
        } catch (error) {
            console.error("Failed to paste clip:", error);
            toast.error("Failed to paste clip");
        }
    }, [state.clipboardClip, activeSequenceId, sequences, addClip]);

    const handleOpenPianoRoll = useCallback((clipId: string) => {
        actions.openPianoRoll(clipId);
    }, [actions]);

    const handleOpenSampleEditor = useCallback((clipId: string) => {
        actions.openSampleEditor(clipId);
    }, [actions]);

    const handleUpdateMIDINotes = useCallback(async (clipId: string, notes: MIDIEvent[]) => {
        if (!activeSequenceId) return;

        try {
            await updateClip(activeSequenceId, clipId, { midi_events: notes });
            toast.success("MIDI notes updated");
        } catch (error) {
            console.error("Failed to update MIDI notes:", error);
            toast.error("Failed to update MIDI notes");
        }
    }, [activeSequenceId, updateClip]);

    const handleDeleteClip = useCallback(async (clipId: string) => {
        if (!activeSequenceId) {
            console.warn("No active sequence");
            return;
        }
        await deleteClip(activeSequenceId, clipId);
    }, [activeSequenceId, deleteClip]);

    const handleMoveClip = useCallback(async (clipId: string, newStartTime: number) => {
        if (!activeSequenceId) return;

        const clip = clips.find((c) => c.id === clipId);
        if (!clip) return;

        console.log("🎯 handleMoveClip called:", { clipId, oldStartTime: clip.start_time, newStartTime });
        await updateClip(activeSequenceId, clipId, {
            start_time: newStartTime,
        });
        console.log("🎯 handleMoveClip completed");
    }, [activeSequenceId, clips, updateClip]);

    const handleResizeClip = useCallback(async (clipId: string, newDuration: number) => {
        if (!activeSequenceId) return;

        await updateClip(activeSequenceId, clipId, {
            duration: newDuration,
        });
    }, [activeSequenceId, updateClip]);

    const handleUpdateClip = useCallback(async (clipId: string, updates: { gain?: number; audio_offset?: number }) => {
        if (!activeSequenceId) return;

        await updateClip(activeSequenceId, clipId, updates);
    }, [activeSequenceId, updateClip]);

    return {
        handleAddClipToTrack,
        handleDuplicateClip,
        handlePasteClip,
        handleOpenPianoRoll,
        handleOpenSampleEditor,
        handleUpdateMIDINotes,
        handleDeleteClip,
        handleMoveClip,
        handleResizeClip,
        handleUpdateClip,
    };
}

