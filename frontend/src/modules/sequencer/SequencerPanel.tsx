/**
 * Sequencer Panel
 *
 * Main orchestrator component for the sequencer.
 * Uses global SequencerContext directly for all state and actions.
 */

import { useEffect, useState, useCallback } from "react";
import { useSequencer } from '@/contexts/SequencerContext';
import { useTransportWebSocket } from "@/hooks/useTransportWebsocket.ts";
import { useSequencerScroll } from "./hooks/useSequencerScroll.ts";
import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { SequencerSampleBrowser } from "./components/Dialogs/SequencerSampleBrowser.tsx";
import { SequencerSequenceManager } from "./components/Dialogs/SequencerSequenceManager.tsx";
import { SequencerSettingsDialog } from "./components/Dialogs/SequencerSettingsDialog.tsx";
import { SequencerTrackTypeDialog } from "./components/Dialogs/SequencerTrackTypeDialog.tsx";
import { SequencerEmptyState } from "./components/States/SequencerEmptyState.tsx";
import { SequencerTransport } from "./components/Transport/SequencerTransport.tsx";
import { SequencerToolbar } from "./components/Toolbar/SequencerToolbar.tsx";
import { SequencerSplitLayout } from "./layouts/SequencerSplitLayout.tsx";
import { api } from "@/services/api";
import { toast } from "sonner";

export function SequencerPanel() {
    // Global Sequencer Context - SOURCE OF TRUTH
    const {
        // Backend Data
        sequences,
        activeSequenceId,
        tracks,
        clips,
        // Playback State
        isPlaying,
        tempo,
        metronomeEnabled,
        // UI State
        isLooping,
        loopStart,
        loopEnd,
        showSampleBrowser,
        showSequenceManager,
        showSequenceSettings,
        // Sequence Management
        loadSequences,
        createSequence,
        deleteSequence,
        setActiveSequenceId,
        // Playback Control
        playSequence,
        stopPlayback,
        pausePlayback,
        resumePlayback,
        setTempo,
        toggleMetronome,
        seekToPosition,
        // Track Management
        loadTracks,
        createTrack,
        deleteTrack,
        renameTrack,
        updateTrack,
        muteTrack,
        soloTrack,
        // Clip Management
        addClip,
        updateClip,
        deleteClip,
        duplicateClip,
        // UI Actions
        setSelectedClipId,
        openPianoRoll,
        closePianoRoll,
        setShowSampleBrowser,
        setShowSequenceManager,
        setShowSequenceSettings,
        // Loop Control
        setIsLooping,
        setLoopStart,
        setLoopEnd,
        toggleLoop,
    } = useSequencer();

    // WebSocket for real-time transport updates
    const { transport, isConnected: isTransportConnected } = useTransportWebSocket();

    // Local UI state (not in global context)
    const [tempoInput, setTempoInput] = useState(tempo.toString());
    const [isPaused, setIsPaused] = useState(false);
    const [showTrackTypeDialog, setShowTrackTypeDialog] = useState(false);

    // Use WebSocket data for active notes
    const activeNotes = transport?.active_notes ?? [];

    // Scroll synchronization (timeline + piano roll + sample editor)
    const { timelineScrollRef, pianoRollScrollRef, sampleEditorScrollRef, handleTimelineScroll, handlePianoRollScroll, handleSampleEditorScroll } = useSequencerScroll();

    // Load sequences and tracks on mount ONLY
    useEffect(() => {
        loadSequences();
        loadTracks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - only run on mount

    // Update tempo input when context tempo changes
    useEffect(() => {
        setTempoInput(tempo.toString());
    }, [tempo]);

    // Get active sequence
    const activeSequence = sequences.find((s) => s.id === activeSequenceId);

    // Load tracks when active sequence changes
    useEffect(() => {
        if (activeSequenceId) {
            loadTracks(activeSequenceId);
        }
    }, [activeSequenceId, loadTracks]);

    // Transport handlers (inline - call global context methods directly)
    const handlePlayPause = useCallback(async () => {
        if (!activeSequenceId) return;
        if (isPlaying) {
            if (isPaused) {
                await resumePlayback();
                setIsPaused(false);
            } else {
                await pausePlayback();
                setIsPaused(true);
            }
        } else {
            await playSequence(activeSequenceId);
            setIsPaused(false);
        }
    }, [isPlaying, isPaused, activeSequenceId, playSequence, pausePlayback, resumePlayback]);

    const handleStop = useCallback(async () => {
        await stopPlayback();
        setIsPaused(false);
    }, [stopPlayback]);

    const handleRecord = useCallback(() => {
        // Future feature: Recording functionality
        toast.info("Recording not yet implemented");
    }, []);

    const handleToggleLoop = useCallback(() => {
        toggleLoop();
    }, [toggleLoop]);

    const handleSeek = useCallback(async (position: number, triggerAudio?: boolean) => {
        await seekToPosition(position, triggerAudio);
    }, [seekToPosition]);

    const handleTempoChange = useCallback((value: string) => {
        setTempoInput(value);
    }, []);

    const handleTempoBlur = useCallback(async () => {
        const newTempo = parseFloat(tempoInput);
        if (!isNaN(newTempo) && newTempo >= 20 && newTempo <= 300) {
            await setTempo(newTempo);
        } else {
            setTempoInput(tempo.toString());
        }
    }, [tempoInput, tempo, setTempo]);

    const handleTempoKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            await handleTempoBlur();
        }
    }, [handleTempoBlur]);

    // Sequence handlers
    const handleAddSequence = useCallback(async () => {
        const name = `Sequence ${sequences.length + 1}`;
        await createSequence(name, tempo);
    }, [sequences.length, tempo, createSequence]);

    const handleSequenceChange = useCallback((sequenceId: string) => {
        setActiveSequenceId(sequenceId);
    }, [setActiveSequenceId]);

    // Track handlers
    const handleAddTrack = useCallback(() => {
        setShowTrackTypeDialog(true);
    }, []);

    const handleAddMIDITrack = useCallback(async () => {
        if (!activeSequenceId) return;
        const name = `Track ${tracks.length + 1}`;

        // @TODO - NO fully implement this!!!!
        // Future enhancement: Let user select synthdef - for now use "sine" (first basic synthdef)
        await createTrack(activeSequenceId, name, "midi", "sine");
        setShowTrackTypeDialog(false);
    }, [activeSequenceId, tracks.length, createTrack]);

    const handleAddSampleTrack = useCallback(() => {
        if (!activeSequenceId) return;
        setShowTrackTypeDialog(false);
        setShowSampleBrowser(true);
    }, [activeSequenceId, setShowSampleBrowser]);

    const handleSampleSelected = useCallback((sample: any) => {
        if (!activeSequenceId) return;
        const name = sample.name || `Track ${tracks.length + 1}`;
        // Create audio track with sample metadata
        createTrack(activeSequenceId, name, "audio");
        setShowSampleBrowser(false);
    }, [activeSequenceId, tracks.length, createTrack, setShowSampleBrowser]);

    const handleToggleMute = useCallback(async (trackId: string) => {
        const track = tracks.find(t => t.id === trackId);
        if (track) {
            await muteTrack(trackId, !track.is_muted);
        }
    }, [tracks, muteTrack]);

    const handleToggleSolo = useCallback(async (trackId: string) => {
        const track = tracks.find(t => t.id === trackId);
        if (track) {
            await soloTrack(trackId, !track.is_solo);
        }
    }, [tracks, soloTrack]);

    const handleUpdateTrack = useCallback(async (trackId: string, updates: any) => {
        await updateTrack(trackId, updates);
    }, [updateTrack]);

    // Clip handlers
    const handleAddClipToTrack = useCallback(async (trackId: string, startTime: number) => {
        if (!activeSequenceId) return;
        const track = tracks.find(t => t.id === trackId);
        if (!track) return;

        const clipRequest = {
            sequence_id: activeSequenceId,
            clip_type: track.type === "midi" ? "midi" : "audio",
            track_id: trackId,
            start_time: startTime,
            duration: 4.0, // Default 1 bar at 4/4
        };
        await addClip(clipRequest);
    }, [activeSequenceId, tracks, addClip]);

    const handleDuplicateClip = useCallback(async (clipId: string) => {
        await duplicateClip(clipId);
    }, [duplicateClip]);

    const handleOpenPianoRoll = useCallback((clipId: string) => {
        openPianoRoll(clipId);
    }, [openPianoRoll]);

    const handleOpenSampleEditor = useCallback((_clipId: string) => {
        // Future feature: Sample editor functionality
        toast.info("Sample editor not yet implemented");
    }, []);

    const handleUpdateMIDINotes = useCallback(async (clipId: string, notes: any[]) => {
        await updateClip(clipId, { midi_events: notes });
    }, [updateClip]);

    const handleDeleteClip = useCallback(async (clipId: string) => {
        await deleteClip(clipId);
    }, [deleteClip]);

    const handleMoveClip = useCallback(async (clipId: string, newStartTime: number) => {
        await updateClip(clipId, { start_time: newStartTime });
    }, [updateClip]);

    const handleResizeClip = useCallback(async (clipId: string, newDuration: number) => {
        await updateClip(clipId, { duration: newDuration });
    }, [updateClip]);

    const handleUpdateClip = useCallback(async (clipId: string, updates: any) => {
        await updateClip(clipId, updates);
    }, [updateClip]);

    // Check if we have content to play
    const hasTracksOrClips = tracks.length > 0 || clips.length > 0;
    const hasNoSequences = sequences.length === 0;

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            {/* Transport Controls - Fixed height, never shrinks */}
            <div className="flex-shrink-0">
                <SubPanel title="TRANSPORT" showHeader={false}>
                    <div className="px-4 py-3 bg-gradient-to-r from-muted/20 to-muted/10">
                        <SequencerTransport
                            isPlaying={isPlaying}
                            metronomeEnabled={metronomeEnabled}
                            tempo={tempo}
                            hasTracksOrClips={hasTracksOrClips}
                            onPlayPause={handlePlayPause}
                            onStop={handleStop}
                            onRecord={handleRecord}
                            onLoop={handleToggleLoop}
                            onMetronomeToggle={toggleMetronome}
                            onTempoChange={handleTempoChange}
                            onTempoBlur={handleTempoBlur}
                            onTempoKeyDown={handleTempoKeyDown}
                        />
                    </div>
                </SubPanel>
            </div>

            {/* Sequencer Timeline - Flexible, takes remaining space */}
            <div className="flex-1 min-h-0 flex flex-col">
                <SubPanel title="TIMELINE" showHeader={false} contentOverflow="hidden">
                    {/* Toolbar - Fixed */}
                    <div className="border-b border-border bg-muted/20 px-3 py-2 flex-shrink-0">
                        <SequencerToolbar
                            sequences={sequences}
                            activeSequenceId={activeSequenceId}
                            onSequenceChange={handleSequenceChange}
                            onAddSequence={handleAddSequence}
                            onManageSequences={() => setShowSequenceManager(true)}
                            onSequenceSettings={() => setShowSequenceSettings(true)}
                            onAddTrack={handleAddTrack}
                        />
                    </div>

                    {/* Empty State or Timeline Content */}
                    {hasNoSequences ? (
                        <SequencerEmptyState
                            onCreateSequence={handleAddSequence}
                            onOpenSequenceManager={() => setShowSequenceManager(true)}
                        />
                    ) : (
                        // Flex container for split layout (ensures 50/50 height split)
                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            <SequencerSplitLayout
                            activeNotes={activeNotes}
                            timelineScrollRef={timelineScrollRef}
                            pianoRollScrollRef={pianoRollScrollRef}
                            sampleEditorScrollRef={sampleEditorScrollRef}
                            onTimelineScroll={handleTimelineScroll}
                            onPianoRollScroll={handlePianoRollScroll}
                            onSampleEditorScroll={handleSampleEditorScroll}
                            onToggleMute={handleToggleMute}
                            onToggleSolo={handleToggleSolo}
                            onDeleteTrack={deleteTrack}
                            onRenameTrack={renameTrack}
                            onUpdateTrack={handleUpdateTrack}
                            onSelectClip={setSelectedClipId}
                            onDuplicateClip={handleDuplicateClip}
                            onDeleteClip={handleDeleteClip}
                            onAddClipToTrack={handleAddClipToTrack}
                            onMoveClip={handleMoveClip}
                            onResizeClip={handleResizeClip}
                            onUpdateClip={handleUpdateClip}
                            onOpenPianoRoll={handleOpenPianoRoll}
                            onOpenSampleEditor={handleOpenSampleEditor}
                            onLoopStartChange={setLoopStart}
                            onLoopEndChange={setLoopEnd}
                            onSeek={handleSeek}
                            onClosePianoRoll={closePianoRoll}
                            onCloseSampleEditor={() => {/* Sample editor not implemented yet */}}
                            onUpdateMIDINotes={handleUpdateMIDINotes}
                        />
                        </div>
                    )}
                </SubPanel>
            </div>

            {/* Sample Browser */}
            <SequencerSampleBrowser
                isOpen={showSampleBrowser}
                onClose={() => setShowSampleBrowser(false)}
                onSelectSample={handleSampleSelected}
            />

            {/* Sequence Manager */}
            <SequencerSequenceManager
                isOpen={showSequenceManager}
                onClose={() => setShowSequenceManager(false)}
                currentSequenceId={activeSequenceId}
                onSequenceChange={handleSequenceChange}
                onDeleteSequence={deleteSequence}
            />

            {/* Sequence Settings Dialog */}
            {activeSequence && (
                <SequencerSettingsDialog
                    isOpen={showSequenceSettings}
                    onClose={() => setShowSequenceSettings(false)}
                    sequence={activeSequence}
                    onSave={async (settings) => {
                        try {
                            // Parse time signature (e.g., "4/4" -> num=4, den=4)
                            const [num, den] = settings.time_signature.split('/').map(Number);

                            // Update sequence settings via API
                            await api.sequencer.updateSequence(activeSequence.id, {
                                name: settings.name,
                                tempo: settings.tempo,
                                time_signature_num: num,
                                time_signature_den: den,
                            });

                            // Update local state
                            if (settings.tempo !== tempo) {
                                await setTempo(settings.tempo);
                            }

                            // Update loop settings in global context
                            setIsLooping(settings.loop_enabled);
                            setLoopStart(settings.loop_start);
                            setLoopEnd(settings.loop_end);

                            toast.success("Sequence settings updated");
                            setShowSequenceSettings(false);
                        } catch (error) {
                            console.error("Failed to update sequence settings:", error);
                            toast.error("Failed to update sequence settings");
                        }
                    }}
                />
            )}

            {/* Track Type Selection Dialog */}
            <SequencerTrackTypeDialog
                isOpen={showTrackTypeDialog}
                onClose={() => setShowTrackTypeDialog(false)}
                onSelectMIDI={handleAddMIDITrack}
                onSelectSample={handleAddSampleTrack}
            />
        </div>
    );
}
