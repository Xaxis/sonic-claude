/**
 * Sequencer Panel
 *
 * Main orchestrator component for the sequencer.
 * Uses extracted hooks and layout components for clean separation of concerns.
 */

import { useEffect } from "react";
import { useAudioEngine } from "@/contexts/AudioEngineContext.tsx";
import { useTransportWebSocket } from "@/hooks/useTransportWebsocket.ts";
import { useSequencerState } from "./hooks/useSequencerState.ts";
import { useSequencerHandlers } from "./hooks/useSequencerHandlers.ts";
import { useSequencerClipHandlers } from "./hooks/useSequencerClipHandlers.ts";
import { useSequencerKeyboard } from "./hooks/useSequencerKeyboard.ts";
import { useSequencerScroll } from "./hooks/useSequencerScroll.ts";
import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { SequencerSampleBrowser } from "./components/Dialogs/SequencerSampleBrowser.tsx";
import { SequencerSequenceManager } from "./components/Dialogs/SequencerSequenceManager.tsx";
import { SequencerSettingsDialog } from "./components/Dialogs/SequencerSettingsDialog.tsx";
import { SequencerTrackTypeDialog } from "./components/Dialogs/SequencerTrackTypeDialog.tsx";
import { SequencerEmptyState } from "./components/States/SequencerEmptyState.tsx";
import { SequencerTransport } from "./components/Transport/SequencerTransport.tsx";
import { SequencerPanelToolbar } from "./components/Toolbar/SequencerPanelToolbar.tsx";
import { SequencerTimelineSection } from "./layouts/SequencerTimelineSection.tsx";
import { SequencerSplitLayout } from "./layouts/SequencerSplitLayout.tsx";
import { audioEngineService } from "@/services/audio-engine/audio-engine.service.ts";
import { toast } from "sonner";

export function SequencerPanel() {
    // Audio Engine Context
    const {
        sequences,
        activeSequenceId,
        sequencerTracks,
        isPlaying,
        tempo,
        metronomeEnabled,
        loadSequences,
        createSequence,
        deleteSequence,
        loadSequencerTracks,
        createSequencerTrack,
        deleteSequencerTrack,
        renameSequencerTrack,
        updateSequencerTrack,
        muteSequencerTrack,
        soloSequencerTrack,
        playSequence,
        stopPlayback,
        pausePlayback,
        resumePlayback,
        setTempo,
        toggleMetronome,
        setActiveSequenceId,
        addClip,
        updateClip,
        deleteClip,
        duplicateClip,
    } = useAudioEngine();

    // WebSocket for real-time transport updates
    const { transport, isConnected: isTransportConnected } = useTransportWebSocket();

    // Sequencer UI State
    const { state, actions } = useSequencerState(tempo);

    // Use WebSocket data as source of truth when connected
    const currentPosition = isTransportConnected ? transport.position_beats : 0;
    const wsLoopEnabled = transport.loop_enabled ?? state.isLooping;
    const wsLoopStart = transport.loop_start ?? state.loopStart;
    const wsLoopEnd = transport.loop_end ?? state.loopEnd;
    const activeNotes = transport.active_notes ?? [];

    // Scroll synchronization (timeline + piano roll + sample editor)
    const { timelineScrollRef, pianoRollScrollRef, sampleEditorScrollRef, handleTimelineScroll, handlePianoRollScroll, handleSampleEditorScroll } = useSequencerScroll();

    // Event handlers - Transport, Sequences, Tracks
    const {
        handlePlayPause,
        handleStop,
        handleRecord,
        handleToggleLoop,
        handleSeek,
        handleTempoChange,
        handleTempoBlur,
        handleTempoKeyDown,
        handleAddSequence,
        handleSequenceChange,
        handleAddTrack,
        handleAddMIDITrack,
        handleAddSampleTrack,
        handleSampleSelected,
        handleToggleMute,
        handleToggleSolo,
        handleUpdateTrack,
    } = useSequencerHandlers({
        isPlaying,
        tempo,
        sequences,
        activeSequenceId,
        sequencerTracks,
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
    });

    // Load sequences and tracks on mount ONLY
    useEffect(() => {
        loadSequences();
        loadSequencerTracks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - only run on mount

    // Update tempo input when context tempo changes
    useEffect(() => {
        actions.setTempoInput(tempo.toString());
    }, [tempo, actions]);

    // Get active sequence and prepare data (MUST be before useEffects that use it)
    const activeSequence = sequences.find((s) => s.id === activeSequenceId);
    const clips = activeSequence?.clips || [];
    const tracks = sequencerTracks || [];

    // Load tracks when active sequence changes
    useEffect(() => {
        if (activeSequenceId) {
            loadSequencerTracks(activeSequenceId);
        }
    }, [activeSequenceId, loadSequencerTracks]);

    // Load UI settings from active sequence when it changes
    useEffect(() => {
        if (activeSequence) {
            // Load persisted UI settings from sequence
            // Only update if values are different to avoid infinite loop
            if (state.zoom !== activeSequence.zoom) {
                actions.setZoom(activeSequence.zoom);
            }
            if (state.snapEnabled !== activeSequence.snap_enabled) {
                actions.setSnapEnabled(activeSequence.snap_enabled);
            }
            if (state.gridSize !== activeSequence.grid_size) {
                actions.setGridSize(activeSequence.grid_size);
            }
        }
    }, [activeSequence?.id, activeSequence?.zoom, activeSequence?.snap_enabled, activeSequence?.grid_size]); // Only when sequence ID or settings change

    // Save UI settings when they change (debounced)
    useEffect(() => {
        if (!activeSequenceId) return;

        const timeoutId = setTimeout(async () => {
            try {
                await audioEngineService.updateSequence(activeSequenceId, {
                    zoom: state.zoom,
                    snap_enabled: state.snapEnabled,
                    grid_size: state.gridSize,
                });
            } catch (error) {
                console.error("Failed to save UI settings:", error);
            }
        }, 500); // Debounce 500ms

        return () => clearTimeout(timeoutId);
    }, [activeSequenceId, state.zoom, state.snapEnabled, state.gridSize]);

    // Event handlers - Clips
    const {
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
    } = useSequencerClipHandlers({
        tempo,
        sequences,
        activeSequenceId,
        sequencerTracks,
        addClip,
        updateClip,
        deleteClip,
        duplicateClip,
        state: {
            clipboardClip: state.clipboardClip,
        },
        actions: {
            openPianoRoll: actions.openPianoRoll,
            openSampleEditor: actions.openSampleEditor,
        },
    });

    // Keyboard shortcuts
    useSequencerKeyboard({
        selectedClip: state.selectedClip,
        clipboardClip: state.clipboardClip,
        activeSequenceId,
        clips,
        setSelectedClip: actions.setSelectedClip,
        setClipboardClip: actions.setClipboardClip,
        handleDeleteClip,
        handleDuplicateClip,
        handlePasteClip,
    });

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
                            isPaused={state.isPaused}
                            isRecording={state.isRecording}
                            isLooping={state.isLooping}
                            metronomeEnabled={metronomeEnabled}
                            tempo={tempo}
                            tempoInput={state.tempoInput}
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
                        <SequencerPanelToolbar
                            sequences={sequences}
                            activeSequenceId={activeSequenceId}
                            zoom={state.zoom}
                            onSequenceChange={handleSequenceChange}
                            onAddSequence={handleAddSequence}
                            onManageSequences={() => actions.setShowSequenceManager(true)}
                            onSequenceSettings={() => actions.setShowSequenceSettings(true)}
                            onAddTrack={handleAddTrack}
                            onZoomIn={actions.zoomIn}
                            onZoomOut={actions.zoomOut}
                            onSnapToggle={actions.toggleSnap}
                            snapEnabled={state.snapEnabled}
                            gridSize={state.gridSize}
                            onGridSizeChange={actions.setGridSize}
                        />
                    </div>

                    {/* Empty State or Timeline Content */}
                    {hasNoSequences ? (
                        <SequencerEmptyState
                            onCreateSequence={handleAddSequence}
                            onOpenSequenceManager={() => actions.setShowSequenceManager(true)}
                        />
                    ) : (
                        // Flex container for split layout (ensures 50/50 height split)
                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            <SequencerSplitLayout
                            tracks={tracks}
                            clips={clips}
                            pianoRollClipId={state.pianoRollClipId}
                            sampleEditorClipId={state.sampleEditorClipId}
                            zoom={state.zoom}
                            currentPosition={currentPosition}
                            isPlaying={isPlaying}
                            tempo={tempo}
                            isLooping={wsLoopEnabled}
                            loopStart={wsLoopStart}
                            loopEnd={wsLoopEnd}
                            snapEnabled={state.snapEnabled}
                            gridSize={state.gridSize}
                            selectedClip={state.selectedClip}
                            showPianoRoll={state.showPianoRoll}
                            showSampleEditor={state.showSampleEditor}
                            activeNotes={activeNotes}
                            timelineScrollRef={timelineScrollRef}
                            pianoRollScrollRef={pianoRollScrollRef}
                            sampleEditorScrollRef={sampleEditorScrollRef}
                            onTimelineScroll={handleTimelineScroll}
                            onPianoRollScroll={handlePianoRollScroll}
                            onSampleEditorScroll={handleSampleEditorScroll}
                            onToggleMute={handleToggleMute}
                            onToggleSolo={handleToggleSolo}
                            onDeleteTrack={deleteSequencerTrack}
                            onRenameTrack={renameSequencerTrack}
                            onUpdateTrack={handleUpdateTrack}
                            onSelectClip={actions.setSelectedClip}
                            onDuplicateClip={handleDuplicateClip}
                            onDeleteClip={handleDeleteClip}
                            onAddClipToTrack={handleAddClipToTrack}
                            onMoveClip={handleMoveClip}
                            onResizeClip={handleResizeClip}
                            onUpdateClip={handleUpdateClip}
                            onOpenPianoRoll={handleOpenPianoRoll}
                            onOpenSampleEditor={handleOpenSampleEditor}
                            onLoopStartChange={actions.setLoopStart}
                            onLoopEndChange={actions.setLoopEnd}
                            onSeek={handleSeek}
                            onToggleSnap={actions.toggleSnap}
                            onSetGridSize={actions.setGridSize}
                            onClosePianoRoll={actions.closePianoRoll}
                            onCloseSampleEditor={actions.closeSampleEditor}
                            onUpdateMIDINotes={handleUpdateMIDINotes}
                        />
                        </div>
                    )}
                </SubPanel>
            </div>

            {/* Sample Browser */}
            <SequencerSampleBrowser
                isOpen={state.showSampleBrowser}
                onClose={() => actions.setShowSampleBrowser(false)}
                onSelectSample={handleSampleSelected}
            />

            {/* Sequence Manager */}
            <SequencerSequenceManager
                isOpen={state.showSequenceManager}
                onClose={() => actions.setShowSequenceManager(false)}
                currentSequenceId={activeSequenceId}
                onSequenceChange={handleSequenceChange}
                onDeleteSequence={deleteSequence}
            />

            {/* Sequence Settings Dialog */}
            {activeSequence && (
                <SequencerSettingsDialog
                    isOpen={state.showSequenceSettings}
                    onClose={() => actions.setShowSequenceSettings(false)}
                    sequence={activeSequence}
                    onSave={async (settings) => {
                        try {
                            // Update sequence settings via API
                            await audioEngineService.updateSequence(activeSequence.id, {
                                name: settings.name,
                                tempo: settings.tempo,
                                time_signature: settings.time_signature,
                            });

                            // Update local state
                            if (settings.tempo !== tempo) {
                                await setTempo(settings.tempo);
                            }

                            // Update loop settings
                            actions.setIsLooping(settings.loop_enabled);
                            actions.setLoopStart(settings.loop_start);
                            actions.setLoopEnd(settings.loop_end);

                            toast.success("Sequence settings updated");
                            actions.setShowSequenceSettings(false);
                        } catch (error) {
                            console.error("Failed to update sequence settings:", error);
                            toast.error("Failed to update sequence settings");
                        }
                    }}
                />
            )}

            {/* Track Type Selection Dialog */}
            <SequencerTrackTypeDialog
                isOpen={state.showTrackTypeDialog}
                onClose={() => actions.setShowTrackTypeDialog(false)}
                onSelectMIDI={handleAddMIDITrack}
                onSelectSample={handleAddSampleTrack}
            />
        </div>
    );
}
