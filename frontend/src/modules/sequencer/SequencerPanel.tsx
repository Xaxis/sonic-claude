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
import { SequencerPanelSampleBrowser } from "./components/Dialogs/SequencerPanelSampleBrowser.tsx";
import { SequencerPanelSequenceManager } from "./components/Dialogs/SequencerPanelSequenceManager.tsx";
import { SequencerPanelSettingsDialog } from "./components/Dialogs/SequencerPanelSettingsDialog.tsx";
import { SequencerPanelTrackTypeDialog } from "./components/Dialogs/SequencerPanelTrackTypeDialog.tsx";
import { SequencerEmptyState } from "./components/States/SequencerEmptyState.tsx";
import { SequencerPanelTransport } from "./components/Transport/SequencerPanelTransport.tsx";
import { SequencerPanelToolbar } from "./components/Toolbar/SequencerPanelToolbar.tsx";
import { SequencerTimelineSection } from "./layouts/SequencerTimelineSection.tsx";
import { SequencerSplitLayout } from "./layouts/SequencerSplitLayout.tsx";
import { audioEngineService } from "@/services/api/audio-engine.service.ts";
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

    // Use WebSocket position if connected, otherwise fall back to context
    const currentPosition = isTransportConnected ? transport.position_beats : 0;

    // Scroll synchronization
    const { timelineScrollRef, handleTimelineScroll } = useSequencerScroll();

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

    // Load tracks when active sequence changes
    useEffect(() => {
        if (activeSequenceId) {
            loadSequencerTracks(activeSequenceId);
        }
    }, [activeSequenceId, loadSequencerTracks]);

    // Get active sequence and prepare data
    const activeSequence = sequences.find((s) => s.id === activeSequenceId);
    const clips = activeSequence?.clips || [];
    const tracks = sequencerTracks || [];

    // Event handlers - Clips
    const {
        handleAddClipToTrack,
        handleDuplicateClip,
        handlePasteClip,
        handleOpenPianoRoll,
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
                        <SequencerPanelTransport
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
                <SubPanel title="TIMELINE" showHeader={false}>
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
                    ) : state.pianoRollClipId ? (
                        // Piano roll is open - use split layout
                        <SequencerSplitLayout
                            tracks={tracks}
                            clips={clips}
                            pianoRollClipId={state.pianoRollClipId}
                            zoom={state.zoom}
                            currentPosition={currentPosition}
                            isLooping={state.isLooping}
                            loopStart={state.loopStart}
                            loopEnd={state.loopEnd}
                            snapEnabled={state.snapEnabled}
                            gridSize={state.gridSize}
                            selectedClip={state.selectedClip}
                            showPianoRoll={state.showPianoRoll}
                            timelineScrollRef={timelineScrollRef}
                            onTimelineScroll={handleTimelineScroll}
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
                            onLoopStartChange={actions.setLoopStart}
                            onLoopEndChange={actions.setLoopEnd}
                            onSeek={handleSeek}
                            onClosePianoRoll={actions.closePianoRoll}
                            onUpdateMIDINotes={handleUpdateMIDINotes}
                        />
                    ) : (
                        // Piano roll is closed - use timeline section only
                        <SequencerTimelineSection
                            tracks={tracks}
                            clips={clips}
                            zoom={state.zoom}
                            currentPosition={currentPosition}
                            isLooping={state.isLooping}
                            loopStart={state.loopStart}
                            loopEnd={state.loopEnd}
                            snapEnabled={state.snapEnabled}
                            gridSize={state.gridSize}
                            selectedClip={state.selectedClip}
                            pianoRollClipId={state.pianoRollClipId}
                            timelineScrollRef={timelineScrollRef}
                            onTimelineScroll={handleTimelineScroll}
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
                            onLoopStartChange={actions.setLoopStart}
                            onLoopEndChange={actions.setLoopEnd}
                            onSeek={handleSeek}
                        />
                    )}
                </SubPanel>
            </div>

            {/* Sample Browser */}
            <SequencerPanelSampleBrowser
                isOpen={state.showSampleBrowser}
                onClose={() => actions.setShowSampleBrowser(false)}
                onSelectSample={handleSampleSelected}
            />

            {/* Sequence Manager */}
            <SequencerPanelSequenceManager
                isOpen={state.showSequenceManager}
                onClose={() => actions.setShowSequenceManager(false)}
                currentSequenceId={activeSequenceId}
                onSequenceChange={handleSequenceChange}
            />

            {/* Sequence Settings Dialog */}
            {activeSequence && (
                <SequencerPanelSettingsDialog
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
            <SequencerPanelTrackTypeDialog
                isOpen={state.showTrackTypeDialog}
                onClose={() => actions.setShowTrackTypeDialog(false)}
                onSelectMIDI={handleAddMIDITrack}
                onSelectSample={handleAddSampleTrack}
            />
        </div>
    );
}
