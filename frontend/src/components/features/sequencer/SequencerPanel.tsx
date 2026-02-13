/**
 * Sequencer Panel
 */

import { useEffect } from "react";
import { useAudioEngine } from "@/contexts/AudioEngineContext";
import { useTransportWebSocket } from "@/hooks/useTransportWebsocket";
import { useSequencerState } from "./hooks/useSequencerState";
import { SubPanel } from "@/components/ui/sub-panel";
import { SampleBrowserModal } from "./SampleBrowserModal";
import { SequenceManagerModal } from "./SequenceManagerModal";
import { SequencerPanelSettingsDialog } from "./SequencerPanelSettingsDialog";
import { SequencerPanelTrackTypeDialog } from "./SequencerPanelTrackTypeDialog";
import { SequencerEmptyState } from "./SequencerEmptyState";
import { SequencerPanelTransport } from "./SequencerPanelTransport";
import { SequencerPanelToolbar } from "./SequencerPanelToolbar";
import { SequencerPanelTrackList } from "./SequencerPanelTrackList";
import { SequencerPanelTimeline } from "./SequencerPanelTimeline/SequencerPanelTimeline";
import { SequencerPanelPianoRoll } from "./SequencerPanelPianoRoll/SequencerPanelPianoRoll";
import type { SampleMetadata } from "@/services/sampleApi";
import type { MIDIEvent, AddClipRequest } from "./types";
import { audioEngineService } from "@/services/api/audio-engine.service";
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

    // Sequencer UI State (custom hook)
    const { state, actions } = useSequencerState(tempo);

    // Use WebSocket position if connected, otherwise fall back to context
    const currentPosition = isTransportConnected ? transport.position_beats : 0;

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

    // Get active sequence
    const activeSequence = sequences.find((s) => s.id === activeSequenceId);
    const clips = activeSequence?.clips || [];
    const tracks = sequencerTracks || [];

    // Keyboard shortcuts for clip operations
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Delete selected clip
            if (e.key === "Delete" || e.key === "Backspace") {
                if (state.selectedClip && activeSequenceId) {
                    e.preventDefault();
                    handleDeleteClip(state.selectedClip);
                }
            }
            // Copy selected clip (Cmd+C or Ctrl+C)
            if ((e.metaKey || e.ctrlKey) && e.key === "c") {
                if (state.selectedClip && activeSequenceId) {
                    e.preventDefault();
                    const clip = clips.find((c) => c.id === state.selectedClip);
                    if (clip) {
                        actions.setClipboardClip(clip);
                        toast.success("Clip copied");
                    }
                }
            }
            // Paste clip (Cmd+V or Ctrl+V)
            if ((e.metaKey || e.ctrlKey) && e.key === "v") {
                if (state.clipboardClip && activeSequenceId) {
                    e.preventDefault();
                    handlePasteClip();
                }
            }
            // Duplicate selected clip (Cmd+D or Ctrl+D)
            if ((e.metaKey || e.ctrlKey) && e.key === "d") {
                if (state.selectedClip && activeSequenceId) {
                    e.preventDefault();
                    handleDuplicateClip(state.selectedClip);
                }
            }
            // Deselect clip (Escape)
            if (e.key === "Escape") {
                actions.setSelectedClip(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [state.selectedClip, state.clipboardClip, activeSequenceId, clips, actions]);

    // Check if we have content to play
    const hasTracksOrClips = tracks.length > 0 || clips.length > 0;

    // ========================================================================
    // TRANSPORT HANDLERS
    // ========================================================================

    const handlePlayPause = async () => {
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
    };

    const handleStop = async () => {
        // Stop playback AND rewind to start
        await stopPlayback();
        actions.setIsPaused(false);

        // Reset position to 0
        if (activeSequenceId) {
            try {
                await audioEngineService.seek({ position: 0 });
            } catch (error) {
                console.error("Failed to seek to start:", error);
            }
        }
    };

    const handleRecord = () => {
        // Toggle recording state
        const newRecordingState = !state.isRecording;
        actions.setIsRecording(newRecordingState);

        if (newRecordingState) {
            toast.info("Recording armed - clips will be recorded to active track");
            // TODO: Implement actual recording:
            // 1. Start MediaRecorder for audio input
            // 2. Record to buffer while playback is running
            // 3. On stop, save as new clip on active track
            // 4. Upload to sample library
        } else {
            toast.info("Recording disarmed");
        }
    };

    const handleToggleLoop = async () => {
        const newLoopState = !state.isLooping;
        actions.setIsLooping(newLoopState);

        // Update sequence loop setting via API
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
                actions.setIsLooping(!newLoopState); // Revert on error
            }
        }
    };

    const handleSeek = async (position: number, triggerAudio: boolean = true) => {
        if (!activeSequenceId) return;

        try {
            await audioEngineService.seek({ position, trigger_audio: triggerAudio });
        } catch (error) {
            console.error("Failed to seek:", error);
            toast.error("Failed to seek to position");
        }
    };

    const handleTempoChange = (value: string) => {
        actions.setTempoInput(value);
    };

    const handleTempoBlur = async () => {
        const newTempo = parseFloat(state.tempoInput);
        if (!isNaN(newTempo) && newTempo >= 20 && newTempo <= 300) {
            await setTempo(newTempo);
        } else {
            actions.setTempoInput(tempo.toString());
        }
    };

    const handleTempoKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            await handleTempoBlur();
            e.currentTarget.blur();
        }
    };

    // ========================================================================
    // SEQUENCER HANDLERS
    // ========================================================================

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

    const handleAddTrack = () => {
        if (!activeSequenceId) {
            toast.error("Please create or select a sequence first");
            return;
        }
        actions.setShowTrackTypeDialog(true);
    };

    const handleAddMIDITrack = async () => {
        if (!activeSequenceId) {
            toast.error("No active sequence");
            return;
        }

        const trackColor = TRACK_COLORS[tracks.length % TRACK_COLORS.length];
        await createSequencerTrack(activeSequenceId, `MIDI ${tracks.length + 1}`, "midi", {
            color: trackColor,
        });
        actions.setShowTrackTypeDialog(false);
    };

    const handleAddSampleTrack = () => {
        actions.setShowTrackTypeDialog(false);
        actions.setShowSampleBrowser(true);
    };

    const handleSampleSelected = async (sample: SampleMetadata) => {
        if (!activeSequenceId) {
            toast.error("No active sequence");
            return;
        }

        // Assign color based on track count (oscillating pattern)
        const colorIndex = tracks.length % TRACK_COLORS.length;
        const trackColor = TRACK_COLORS[colorIndex];

        await createSequencerTrack(activeSequenceId, sample.name, "sample", {
            sample_id: sample.id,
            sample_name: sample.name,
            sample_file_path: sample.file_name,
            color: trackColor,
        });
        actions.setShowSampleBrowser(false);
    };

    const handleAddSequence = async () => {
        await createSequence(`Sequence ${sequences.length + 1}`, 120);
    };

    const handleSequenceChange = (sequenceId: string) => {
        setActiveSequenceId(sequenceId);
    };

    const handleToggleMute = async (trackId: string) => {
        const track = tracks.find((t) => t.id === trackId);
        if (track) {
            await muteSequencerTrack(trackId, !track.is_muted);
        }
    };

    const handleToggleSolo = async (trackId: string) => {
        const track = tracks.find((t) => t.id === trackId);
        if (track) {
            await soloSequencerTrack(trackId, !track.is_solo);
        }
    };

    const handleAddClipToTrack = async (trackId: string, startBeat: number) => {
        if (!activeSequenceId) {
            console.warn("No active sequence");
            return;
        }

        const track = tracks.find((t) => t.id === trackId);
        if (!track) {
            console.warn("Track not found");
            return;
        }

        // For sample tracks, create audio clip with sample's actual duration
        if (track.type === "sample" && track.sample_id) {
            try {
                // Fetch sample metadata to get duration using proper API
                const { getSample } = await import("@/services/sampleApi");
                const sampleData = await getSample(track.sample_id);

                // Convert sample duration (seconds) to beats
                // duration_beats = (duration_seconds / 60) * tempo
                const durationBeats = sampleData.duration
                    ? (sampleData.duration / 60) * tempo
                    : 4; // Fallback to 4 beats if duration not available

                const clipRequest = {
                    clip_type: "audio" as const,
                    track_id: trackId,
                    start_time: startBeat,
                    duration: durationBeats, // Use actual sample duration in beats
                    audio_file_path: track.sample_id, // Use sample ID for waveform loading
                };
                await addClip(activeSequenceId, clipRequest);
            } catch (error) {
                console.error("Failed to fetch sample metadata:", error);
                // Fallback: create clip with default duration
                const clipRequest = {
                    clip_type: "audio" as const,
                    track_id: trackId,
                    start_time: startBeat,
                    duration: 4, // Fallback to 4 beats
                    audio_file_path: track.sample_id,
                };
                await addClip(activeSequenceId, clipRequest);
            }
        } else {
            // For other tracks, create MIDI clip
            const clipRequest = {
                clip_type: "midi" as const,
                track_id: trackId,
                start_time: startBeat,
                duration: 4, // 4 beats (1 bar)
                midi_events: [
                    { note: 60, velocity: 100, start_time: 0, duration: 0.5 },
                    { note: 64, velocity: 100, start_time: 1, duration: 0.5 },
                    { note: 67, velocity: 100, start_time: 2, duration: 0.5 },
                    { note: 72, velocity: 100, start_time: 3, duration: 0.5 },
                ],
            };
            await addClip(activeSequenceId, clipRequest);
        }
    };

    const handleDuplicateClip = async (clipId: string) => {
        if (!activeSequenceId) {
            console.warn("No active sequence");
            return;
        }
        await duplicateClip(activeSequenceId, clipId);
    };

    const handlePasteClip = async () => {
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
    };

    const handleOpenPianoRoll = (clipId: string) => {
        actions.openPianoRoll(clipId);
    };

    const handleUpdateMIDINotes = async (clipId: string, notes: MIDIEvent[]) => {
        if (!activeSequenceId) return;

        try {
            await updateClip(activeSequenceId, clipId, { midi_events: notes });
            toast.success("MIDI notes updated");
        } catch (error) {
            console.error("Failed to update MIDI notes:", error);
            toast.error("Failed to update MIDI notes");
        }
    };

    const handleDeleteClip = async (clipId: string) => {
        if (!activeSequenceId) {
            console.warn("No active sequence");
            return;
        }
        await deleteClip(activeSequenceId, clipId);
    };

    const handleMoveClip = async (clipId: string, newStartTime: number) => {
        if (!activeSequenceId) return;

        // Find the clip to get current values
        const clip = clips.find((c) => c.id === clipId);
        if (!clip) return;

        // Update clip position via API
        await updateClip(activeSequenceId, clipId, {
            start_time: newStartTime,
        });
    };

    const handleResizeClip = async (clipId: string, newDuration: number) => {
        if (!activeSequenceId) return;

        // Update clip duration via API
        await updateClip(activeSequenceId, clipId, {
            duration: newDuration,
        });
    };

    const handleUpdateClip = async (clipId: string, updates: { gain?: number; audio_offset?: number }) => {
        if (!activeSequenceId) return;

        // Update clip properties via API
        await updateClip(activeSequenceId, clipId, updates);
    };

    const handleUpdateTrack = async (trackId: string, updates: { volume?: number; pan?: number }) => {
        if (!activeSequenceId) return;

        // Update track properties via API
        await updateSequencerTrack(trackId, updates);
    };

    // Check if we have no sequences at all
    const hasNoSequences = sequences.length === 0;

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            {/* Transport Controls */}
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

            {/* Sequencer Timeline */}
            <SubPanel title="TIMELINE" showHeader={false}>
                {/* Toolbar */}
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
                    <div className="flex flex-col flex-1 min-h-0">
                        {/* Timeline Section (Top) */}
                        <div className="flex flex-1 min-h-0" style={{ minHeight: state.pianoRollClipId ? '40%' : '100%' }}>
                            {/* Track List (Left) - Fixed width */}
                            <div className="w-64 border-r border-border flex flex-col flex-shrink-0">
                                <div className="h-8 border-b border-border bg-muted/30 flex items-center px-3 flex-shrink-0">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                        Tracks
                                    </span>
                                </div>
                                <div className="flex-1 min-h-0 overflow-hidden">
                                    <SequencerPanelTrackList
                                        tracks={tracks}
                                        onToggleMute={handleToggleMute}
                                        onToggleSolo={handleToggleSolo}
                                        onDeleteTrack={deleteSequencerTrack}
                                        onRenameTrack={renameSequencerTrack}
                                        onUpdateTrack={handleUpdateTrack}
                                    />
                                </div>
                            </div>

                            {/* Timeline (Right) - Scrollable horizontally and vertically */}
                            <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
                                <SequencerPanelTimeline
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
                            </div>
                        </div>

                        {/* Piano Roll Section (Bottom) - Only show when MIDI clip is selected */}
                        {state.pianoRollClipId && (() => {
                            const clip = clips.find(c => c.id === state.pianoRollClipId);
                            if (!clip || clip.type !== "midi") return null;

                            return (
                                <div className="border-t border-border flex flex-col" style={{ height: '40%', minHeight: '200px' }}>
                                    <SequencerPanelPianoRoll
                                        isOpen={state.showPianoRoll}
                                        clipId={clip.id}
                                        clipName={clip.name}
                                        clipDuration={clip.duration}
                                        midiEvents={clip.midi_events || []}
                                        snapEnabled={state.snapEnabled}
                                        gridSize={state.gridSize}
                                        onClose={actions.closePianoRoll}
                                        onUpdateNotes={handleUpdateMIDINotes}
                                    />
                                </div>
                            );
                        })()}
                    </div>
                )}
            </SubPanel>

            {/* Sample Browser Modal */}
            <SampleBrowserModal
                isOpen={state.showSampleBrowser}
                onClose={() => actions.setShowSampleBrowser(false)}
                onSelectSample={handleSampleSelected}
            />

            {/* Sequence Manager Modal */}
            <SequenceManagerModal
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
