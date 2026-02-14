/**
 * useSequencerHandlers Hook
 * 
 * Centralizes all event handler logic for the sequencer.
 * Separates business logic from UI rendering.
 * 
 * Handler Categories:
 * - Transport: play/pause, stop, record, loop, seek, tempo
 * - Sequences: create, change
 * - Tracks: add, mute, solo, update
 * - Clips: add, duplicate, paste, delete, move, resize, update
 * - Piano Roll: open, update MIDI notes
 */

import { useCallback } from "react";
import { toast } from "sonner";
import { audioEngineService } from "@/services/api/audio-engine.service.ts";
import type { SampleMetadata } from "@/services/sampleApi.ts";
import type { MIDIEvent, AddClipRequest } from "../types.ts";
import type { SequencerTrack, Clip } from "@/types/sequencer";

// Track color palette - oscillates based on track creation order
const TRACK_COLORS = [
    "#ef4444", // red
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#10b981", // green
    "#f59e0b", // amber
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
];

interface UseSequencerHandlersProps {
    // Audio Engine Context
    isPlaying: boolean;
    tempo: number;
    sequences: any[];
    activeSequenceId: string | null;
    sequencerTracks: SequencerTrack[];
    playSequence: (sequenceId: string) => Promise<void>;
    pausePlayback: () => Promise<void>;
    resumePlayback: () => Promise<void>;
    stopPlayback: () => Promise<void>;
    setTempo: (tempo: number) => Promise<void>;
    setActiveSequenceId: (sequenceId: string) => void;
    createSequence: (name: string, tempo: number) => Promise<void>;
    loadSequencerTracks: (sequenceId?: string) => Promise<void>;
    createSequencerTrack: (sequenceId: string, name: string, type: string, metadata?: any) => Promise<void>;
    muteSequencerTrack: (trackId: string, muted: boolean) => Promise<void>;
    soloSequencerTrack: (trackId: string, solo: boolean) => Promise<void>;
    updateSequencerTrack: (trackId: string, updates: any) => Promise<void>;
    addClip: (sequenceId: string, clipRequest: AddClipRequest) => Promise<Clip | undefined>;
    updateClip: (sequenceId: string, clipId: string, updates: any) => Promise<void>;
    deleteClip: (sequenceId: string, clipId: string) => Promise<void>;
    duplicateClip: (sequenceId: string, clipId: string) => Promise<void>;
    
    // Sequencer State
    state: {
        isPaused: boolean;
        isRecording: boolean;
        isLooping: boolean;
        loopStart: number;
        loopEnd: number;
        tempoInput: string;
        clipboardClip: Clip | null;
    };
    actions: {
        setIsPaused: (paused: boolean) => void;
        setIsRecording: (recording: boolean) => void;
        setIsLooping: (looping: boolean) => void;
        setTempoInput: (tempo: string) => void;
        setShowTrackTypeDialog: (show: boolean) => void;
        setShowSampleBrowser: (show: boolean) => void;
        openPianoRoll: (clipId: string) => void;
    };
}

export function useSequencerHandlers(props: UseSequencerHandlersProps) {
    const {
        isPlaying,
        tempo,
        sequences,
        activeSequenceId,
        sequencerTracks: tracks,
        playSequence,
        pausePlayback,
        resumePlayback,
        stopPlayback,
        setTempo,
        setActiveSequenceId,
        createSequence,
        loadSequencerTracks,
        createSequencerTrack,
        muteSequencerTrack,
        soloSequencerTrack,
        updateSequencerTrack,
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
    // TRANSPORT HANDLERS
    // ========================================================================

    const handlePlayPause = useCallback(async () => {
        if (isPlaying) {
            await pausePlayback();
            actions.setIsPaused(true);
        } else if (state.isPaused) {
            await resumePlayback();
            actions.setIsPaused(false);
        } else {
            const sequenceToPlay =
                activeSequenceId || (sequences.length > 0 ? sequences[0].id : null);
            if (!sequenceToPlay) {
                console.warn("No sequences available to play");
                return;
            }
            await playSequence(sequenceToPlay);
            actions.setIsPaused(false);
        }
    }, [isPlaying, state.isPaused, activeSequenceId, sequences, playSequence, pausePlayback, resumePlayback, actions]);

    const handleStop = useCallback(async () => {
        await stopPlayback();
        actions.setIsPaused(false);

        if (activeSequenceId) {
            try {
                await audioEngineService.seek({ position: 0 });
            } catch (error) {
                console.error("Failed to seek to start:", error);
            }
        }
    }, [stopPlayback, activeSequenceId, actions]);

    const handleRecord = useCallback(() => {
        const newRecordingState = !state.isRecording;
        actions.setIsRecording(newRecordingState);

        if (newRecordingState) {
            toast.info("Recording armed - clips will be recorded to active track");
        } else {
            toast.info("Recording disarmed");
        }
    }, [state.isRecording, actions]);

    const handleToggleLoop = useCallback(async () => {
        const newLoopState = !state.isLooping;
        actions.setIsLooping(newLoopState);

        if (activeSequenceId && activeSequence) {
            try {
                await audioEngineService.updateSequence(activeSequenceId, {
                    loop_enabled: newLoopState,
                    loop_start: state.loopStart,
                    loop_end: state.loopEnd,
                });
                toast.success(`Loop ${newLoopState ? "enabled" : "disabled"}`);
            } catch (error) {
                console.error("Failed to update loop setting:", error);
                toast.error("Failed to update loop setting");
                actions.setIsLooping(!newLoopState);
            }
        }
    }, [state.isLooping, state.loopStart, state.loopEnd, activeSequenceId, activeSequence, actions]);

    const handleSeek = useCallback(async (position: number, triggerAudio: boolean = true) => {
        if (!activeSequenceId) return;

        try {
            await audioEngineService.seek({ position, trigger_audio: triggerAudio });
        } catch (error) {
            console.error("Failed to seek:", error);
            toast.error("Failed to seek to position");
        }
    }, [activeSequenceId]);

    const handleTempoChange = useCallback((value: string) => {
        actions.setTempoInput(value);
    }, [actions]);

    const handleTempoBlur = useCallback(async () => {
        const newTempo = parseFloat(state.tempoInput);
        if (!isNaN(newTempo) && newTempo >= 20 && newTempo <= 300) {
            await setTempo(newTempo);
        } else {
            actions.setTempoInput(tempo.toString());
        }
    }, [state.tempoInput, tempo, setTempo, actions]);

    const handleTempoKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            await handleTempoBlur();
            e.currentTarget.blur();
        }
    }, [handleTempoBlur]);

    // ========================================================================
    // SEQUENCE HANDLERS
    // ========================================================================

    const handleAddSequence = useCallback(async () => {
        await createSequence(`Sequence ${sequences.length + 1}`, 120);
    }, [sequences.length, createSequence]);

    const handleSequenceChange = useCallback(async (sequenceId: string) => {
        // Close piano roll when switching sequences
        actions.closePianoRoll();

        // Find the sequence to load its settings
        const sequence = sequences.find(s => s.id === sequenceId);
        if (sequence) {
            // Load sequence-specific UI settings
            actions.setZoom(sequence.zoom);
            actions.setSnapEnabled(sequence.snap_enabled);
            actions.setGridSize(sequence.grid_size);
            actions.setIsLooping(sequence.loop_enabled);
            actions.setLoopStart(sequence.loop_start);
            actions.setLoopEnd(sequence.loop_end);
        }

        // Set active sequence
        setActiveSequenceId(sequenceId);

        // Load tracks for the new sequence
        await loadSequencerTracks(sequenceId);
    }, [setActiveSequenceId, loadSequencerTracks, sequences, actions]);

    // ========================================================================
    // TRACK HANDLERS
    // ========================================================================

    const handleAddTrack = useCallback(() => {
        if (!activeSequenceId) {
            toast.error("Please create or select a sequence first");
            return;
        }
        actions.setShowTrackTypeDialog(true);
    }, [activeSequenceId, actions]);

    const handleAddMIDITrack = useCallback(async () => {
        if (!activeSequenceId) {
            toast.error("No active sequence");
            return;
        }

        const trackColor = TRACK_COLORS[tracks.length % TRACK_COLORS.length];
        await createSequencerTrack(activeSequenceId, `MIDI ${tracks.length + 1}`, "midi", {
            color: trackColor,
        });
        actions.setShowTrackTypeDialog(false);
    }, [activeSequenceId, tracks.length, createSequencerTrack, actions]);

    const handleAddSampleTrack = useCallback(() => {
        actions.setShowTrackTypeDialog(false);
        actions.setShowSampleBrowser(true);
    }, [actions]);

    const handleSampleSelected = useCallback(async (sample: SampleMetadata) => {
        if (!activeSequenceId) {
            toast.error("No active sequence");
            return;
        }

        const colorIndex = tracks.length % TRACK_COLORS.length;
        const trackColor = TRACK_COLORS[colorIndex];

        await createSequencerTrack(activeSequenceId, sample.name, "sample", {
            sample_id: sample.id,
            sample_name: sample.name,
            sample_file_path: sample.file_name,
            color: trackColor,
        });
        actions.setShowSampleBrowser(false);
    }, [activeSequenceId, tracks.length, createSequencerTrack, actions]);

    const handleToggleMute = useCallback(async (trackId: string) => {
        const track = tracks.find((t) => t.id === trackId);
        if (track) {
            await muteSequencerTrack(trackId, !track.is_muted);
        }
    }, [tracks, muteSequencerTrack]);

    const handleToggleSolo = useCallback(async (trackId: string) => {
        const track = tracks.find((t) => t.id === trackId);
        if (track) {
            await soloSequencerTrack(trackId, !track.is_solo);
        }
    }, [tracks, soloSequencerTrack]);

    const handleUpdateTrack = useCallback(async (trackId: string, updates: { volume?: number; pan?: number }) => {
        if (!activeSequenceId) return;
        await updateSequencerTrack(trackId, updates);
    }, [activeSequenceId, updateSequencerTrack]);

    // Clip handlers are in useSequencerClipHandlers.ts to keep file size manageable

    return {
        // Transport
        handlePlayPause,
        handleStop,
        handleRecord,
        handleToggleLoop,
        handleSeek,
        handleTempoChange,
        handleTempoBlur,
        handleTempoKeyDown,
        // Sequences
        handleAddSequence,
        handleSequenceChange,
        // Tracks
        handleAddTrack,
        handleAddMIDITrack,
        handleAddSampleTrack,
        handleSampleSelected,
        handleToggleMute,
        handleToggleSolo,
        handleUpdateTrack,
    };
}

