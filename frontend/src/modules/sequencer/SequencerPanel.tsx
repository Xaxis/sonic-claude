/**
 * Sequencer Panel - Refactored to use Zustand
 *
 * Main orchestrator component for the sequencer.
 * Uses Zustand store for all state and actions.
 */

import { useEffect, useState, useCallback } from "react";
import { useDAWStore } from '@/stores/dawStore';
import { useSequencerScroll } from "./hooks/useSequencerScroll.ts";
import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { SequencerSampleBrowser } from "./components/Dialogs/SequencerSampleBrowser.tsx";
import { SequencerSettingsDialog } from "./components/Dialogs/SequencerSettingsDialog.tsx";
import { SequencerTrackTypeDialog } from "./components/Dialogs/SequencerTrackTypeDialog.tsx";
import { SequencerEmptyState } from "./components/States/SequencerEmptyState.tsx";
import { SequencerTransport } from "./components/Transport/SequencerTransport.tsx";
import { SequencerToolbar } from "./components/Toolbar/SequencerToolbar.tsx";
import { SequencerSplitLayout } from "./layouts/SequencerSplitLayout.tsx";
import { toast } from "sonner";

export function SequencerPanel() {
    // Zustand Store - SOURCE OF TRUTH
    const activeComposition = useDAWStore(state => state.activeComposition);
    const tracks = useDAWStore(state => state.tracks);
    const clips = useDAWStore(state => state.clips);
    const transport = useDAWStore(state => state.transport);

    // Actions
    const play = useDAWStore(state => state.play);
    const stop = useDAWStore(state => state.stop);
    const pause = useDAWStore(state => state.pause);
    const resume = useDAWStore(state => state.resume);
    const setTempo = useDAWStore(state => state.setTempo);
    const toggleMetronome = useDAWStore(state => state.toggleMetronome);
    const seek = useDAWStore(state => state.seek);
    const setLoopStart = useDAWStore(state => state.setLoopStart);
    const setLoopEnd = useDAWStore(state => state.setLoopEnd);
    const createTrack = useDAWStore(state => state.createTrack);
    const deleteTrack = useDAWStore(state => state.deleteTrack);
    const renameTrack = useDAWStore(state => state.renameTrack);
    const updateTrack = useDAWStore(state => state.updateTrack);
    const muteTrack = useDAWStore(state => state.muteTrack);
    const soloTrack = useDAWStore(state => state.soloTrack);
    const addClip = useDAWStore(state => state.addClip);
    const updateClip = useDAWStore(state => state.updateClip);
    const deleteClip = useDAWStore(state => state.deleteClip);
    const duplicateClip = useDAWStore(state => state.duplicateClip);

    // Local UI state
    const [tempoInput, setTempoInput] = useState(activeComposition?.sequence.tempo.toString() || "120");
    const [isPaused, setIsPaused] = useState(false);
    const [showTrackTypeDialog, setShowTrackTypeDialog] = useState(false);
    const [showSampleBrowser, setShowSampleBrowser] = useState(false);
    const [showSequenceSettings, setShowSequenceSettings] = useState(false);

    // Active notes from transport (WebSocket data synced via WebSocketSync)
    const activeNotes = transport?.active_notes ?? [];

    // Scroll synchronization
    const {
        timelineScrollRef,
        pianoRollScrollRef,
        sampleEditorScrollRef,
        handleTimelineScroll,
        handlePianoRollScroll,
        handleSampleEditorScroll
    } = useSequencerScroll();

    // Update tempo input when composition tempo changes
    useEffect(() => {
        if (activeComposition) {
            setTempoInput(activeComposition.sequence.tempo.toString());
        }
    }, [activeComposition?.sequence.tempo]);

    // Derived state
    const isPlaying = transport?.is_playing ?? false;
    const tempo = activeComposition?.sequence.tempo ?? 120;
    const metronomeEnabled = transport?.metronome_enabled ?? false;

    // Transport handlers
    const handlePlayPause = useCallback(async () => {
        if (!activeComposition) return;
        if (isPlaying) {
            if (isPaused) {
                await resume();
                setIsPaused(false);
            } else {
                await pause();
                setIsPaused(true);
            }
        } else {
            await play();
            setIsPaused(false);
        }
    }, [isPlaying, isPaused, activeComposition, play, pause, resume]);

    const handleStop = useCallback(async () => {
        await stop();
        setIsPaused(false);
    }, [stop]);

    const handleRecord = useCallback(() => {
        toast.info("Recording not yet implemented");
    }, []);

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

    // Track handlers
    const handleAddTrack = useCallback(() => {
        setShowTrackTypeDialog(true);
    }, []);

    const handleAddMIDITrack = useCallback(async () => {
        if (!activeComposition) return;
        const name = `Track ${tracks.length + 1}`;
        await createTrack(name, "midi", "sine");
        setShowTrackTypeDialog(false);
    }, [activeComposition, tracks.length, createTrack]);

    const handleAddSampleTrack = useCallback(() => {
        if (!activeComposition) return;
        setShowTrackTypeDialog(false);
        setShowSampleBrowser(true);
    }, [activeComposition]);

    const handleSampleSelected = useCallback((sample: any) => {
        if (!activeComposition) return;
        const name = sample.name || `Track ${tracks.length + 1}`;
        createTrack(name, "audio"); // audio track type for samples
        setShowSampleBrowser(false);
    }, [activeComposition, tracks.length, createTrack]);

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
        if (!activeComposition) return;
        const track = tracks.find(t => t.id === trackId);
        if (!track) return;

        const clipRequest = {
            sequence_id: activeComposition.sequence.id,  // Use sequence ID, not composition ID
            clip_type: track.type === "midi" ? "midi" : "audio",
            track_id: trackId,
            start_time: startTime,
            duration: 4.0, // Default 1 bar at 4/4
        };
        await addClip(clipRequest);
    }, [activeComposition, tracks, addClip]);

    const handleDuplicateClip = useCallback(async (clipId: string) => {
        if (!activeComposition) return;
        await duplicateClip(activeComposition.sequence.id, clipId);  // Use sequence ID, not composition ID
    }, [activeComposition, duplicateClip]);

    const openPianoRoll = useDAWStore(state => state.openPianoRoll);
    const closePianoRoll = useDAWStore(state => state.closePianoRoll);

    const handleOpenPianoRoll = useCallback((clipId: string) => {
        openPianoRoll(clipId);
    }, [openPianoRoll]);

    const handleClosePianoRoll = useCallback(() => {
        closePianoRoll();
    }, [closePianoRoll]);

    const handleOpenSampleEditor = useCallback((_clipId: string) => {
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

    // Check if we have content
    const hasTracksOrClips = tracks.length > 0 || clips.length > 0;
    const hasNoComposition = !activeComposition;

    // Show empty state if no composition
    if (hasNoComposition) {
        return (
            <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
                <SequencerEmptyState
                    onCreateSequence={() => toast.info("Use File > New to create a new composition")}
                    onOpenSequenceManager={() => toast.info("Use File > Open to load a composition")}
                />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            {/* Transport Controls */}
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
                            onLoop={() => toast.info("Loop toggle not yet implemented")}
                            onMetronomeToggle={toggleMetronome}
                            onTempoChange={handleTempoChange}
                            onTempoBlur={handleTempoBlur}
                            onTempoKeyDown={handleTempoKeyDown}
                        />
                    </div>
                </SubPanel>
            </div>

            {/* Toolbar */}
            <div className="flex-shrink-0">
                <SubPanel title="TOOLBAR" showHeader={false}>
                    <SequencerToolbar
                        activeSequenceId={activeComposition?.id || null}
                        onAddTrack={handleAddTrack}
                    />
                </SubPanel>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden">
                <SubPanel title="SEQUENCER" showHeader={false}>
                    <SequencerSplitLayout
                        activeNotes={activeNotes}
                        onToggleMute={handleToggleMute}
                        onToggleSolo={handleToggleSolo}
                        onDeleteTrack={deleteTrack}
                        onRenameTrack={renameTrack}
                        onUpdateTrack={handleUpdateTrack}
                        onSelectClip={() => {}}
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
                        onSeek={seek}
                        onClosePianoRoll={handleClosePianoRoll}
                        onUpdateMIDINotes={handleUpdateMIDINotes}
                        onCloseSampleEditor={() => {}}
                        timelineScrollRef={timelineScrollRef}
                        pianoRollScrollRef={pianoRollScrollRef}
                        sampleEditorScrollRef={sampleEditorScrollRef}
                        onTimelineScroll={handleTimelineScroll}
                        onPianoRollScroll={handlePianoRollScroll}
                        onSampleEditorScroll={handleSampleEditorScroll}
                    />
                </SubPanel>
            </div>

            {/* Dialogs */}
            <SequencerTrackTypeDialog
                isOpen={showTrackTypeDialog}
                onClose={() => setShowTrackTypeDialog(false)}
                onSelectMIDI={handleAddMIDITrack}
                onSelectSample={handleAddSampleTrack}
            />

            <SequencerSampleBrowser
                isOpen={showSampleBrowser}
                onClose={() => setShowSampleBrowser(false)}
                onSelectSample={handleSampleSelected}
            />

            {showSequenceSettings && activeComposition && (
                <SequencerSettingsDialog
                    isOpen={showSequenceSettings}
                    sequence={activeComposition.sequence}
                    onClose={() => setShowSequenceSettings(false)}
                    onSave={async () => {
                        // TODO: Implement sequence settings update
                        toast.info("Sequence settings update not yet implemented");
                        setShowSequenceSettings(false);
                    }}
                />
            )}
        </div>
    );
}
