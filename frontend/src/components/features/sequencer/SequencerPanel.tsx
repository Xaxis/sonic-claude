/**
 * Sequencer Panel (with integrated Transport Controls)
 *
 * REFACTORED into logical components:
 * - SequencerPanelTransport: Transport controls
 * - SequencerPanelToolbar: Sequence selector, track management, zoom
 * - SequencerPanelTrackList: Track headers with mute/solo
 * - SequencerPanelTimeline: Ruler, grid, and clips
 * - SequencerPanelClip: Individual clip with waveform
 */

import { useEffect, useState } from "react";
import { useAudioEngine } from "@/contexts/AudioEngineContext";
import { useTransportWebSocket } from "@/hooks/useTransportWebsocket";
import { SubPanel } from "@/components/ui/sub-panel";
import { SampleBrowserModal } from "./SampleBrowserModal";
import { SequenceManagerModal } from "./SequenceManagerModal";
import { SequenceSettingsDialog } from "./SequenceSettingsDialog";
import { SequencerPanelTransport } from "./SequencerPanelTransport";
import { SequencerPanelToolbar } from "./SequencerPanelToolbar";
import { SequencerPanelTrackList } from "./SequencerPanelTrackList";
import { SequencerPanelTimeline } from "./SequencerPanelTimeline";
import type { SampleMetadata } from "@/services/sampleApi";
import { audioEngineService } from "@/services/api/audio-engine.service";
import { toast } from "sonner";

export function SequencerPanel() {
    const {
        sequences,
        activeSequenceId,
        sequencerTracks,
        isPlaying,
        tempo,
        loadSequences,
        createSequence,
        loadSequencerTracks,
        createSequencerTrack,
        deleteSequencerTrack,
        renameSequencerTrack,
        muteSequencerTrack,
        soloSequencerTrack,
        playSequence,
        stopPlayback,
        pausePlayback,
        resumePlayback,
        setTempo,
        setActiveSequenceId,
        addClip,
        updateClip,
        deleteClip,
        duplicateClip,
    } = useAudioEngine();

    // Use WebSocket for real-time transport updates (position, tempo, etc.)
    const { transport, isConnected: isTransportConnected } = useTransportWebSocket();

    // Use WebSocket position if connected, otherwise fall back to context
    const currentPosition = isTransportConnected ? transport.position_beats : 0;

    const [selectedClip, setSelectedClip] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1); // Zoom level for timeline
    const [isRecording, setIsRecording] = useState(false);
    const [isLooping, setIsLooping] = useState(true);
    const [loopStart, setLoopStart] = useState(0); // Loop start in beats
    const [loopEnd, setLoopEnd] = useState(16); // Loop end in beats (default 4 bars)
    const [snapEnabled, setSnapEnabled] = useState(true); // Grid snap on/off
    const [gridSize, setGridSize] = useState(4); // Grid size: 4 = 1/4 note, 8 = 1/8 note, etc.
    const [showSampleBrowser, setShowSampleBrowser] = useState(false);
    const [showSequenceManager, setShowSequenceManager] = useState(false);
    const [showSequenceSettings, setShowSequenceSettings] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [tempoInput, setTempoInput] = useState(tempo.toString());

    // Load sequences and tracks on mount ONLY
    useEffect(() => {
        loadSequences();
        loadSequencerTracks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - only run on mount

    // Update tempo input when context tempo changes
    useEffect(() => {
        setTempoInput(tempo.toString());
    }, [tempo]);

    // Load tracks when active sequence changes
    useEffect(() => {
        if (activeSequenceId) {
            loadSequencerTracks(activeSequenceId);
        }
    }, [activeSequenceId, loadSequencerTracks]);

    // Keyboard shortcuts for clip operations
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Delete selected clip
            if (e.key === "Delete" || e.key === "Backspace") {
                if (selectedClip && activeSequenceId) {
                    e.preventDefault();
                    handleDeleteClip(selectedClip);
                }
            }
            // Duplicate selected clip (Cmd+D or Ctrl+D)
            if ((e.metaKey || e.ctrlKey) && e.key === "d") {
                if (selectedClip && activeSequenceId) {
                    e.preventDefault();
                    handleDuplicateClip(selectedClip);
                }
            }
            // Deselect clip (Escape)
            if (e.key === "Escape") {
                setSelectedClip(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedClip, activeSequenceId]);

    // Get active sequence
    const activeSequence = sequences.find((s) => s.id === activeSequenceId);
    const clips = activeSequence?.clips || [];
    const tracks = sequencerTracks || [];

    // Check if we have content to play
    const hasTracksOrClips = tracks.length > 0 || clips.length > 0;

    // ========================================================================
    // TRANSPORT HANDLERS
    // ========================================================================

    const handlePlayPause = async () => {
        if (isPlaying) {
            await pausePlayback();
            setIsPaused(true);
        } else if (isPaused) {
            await resumePlayback();
            setIsPaused(false);
        } else {
            const sequenceToPlay =
                activeSequenceId || (sequences.length > 0 ? sequences[0].id : null);
            if (!sequenceToPlay) {
                console.warn("No sequences available to play");
                return;
            }
            await playSequence(sequenceToPlay);
            setIsPaused(false);
        }
    };

    const handleStop = async () => {
        await stopPlayback();
        setIsPaused(false);
    };

    const handleRewind = async () => {
        await stopPlayback();
        setIsPaused(false);
    };

    const handleRecord = () => {
        setIsRecording(!isRecording);
        // TODO: Implement recording functionality
    };

    const handleToggleLoop = () => {
        setIsLooping(!isLooping);
        // TODO: Update sequence loop setting via API
    };

    const handleTempoChange = (value: string) => {
        setTempoInput(value);
    };

    const handleTempoBlur = async () => {
        const newTempo = parseFloat(tempoInput);
        if (!isNaN(newTempo) && newTempo >= 20 && newTempo <= 300) {
            await setTempo(newTempo);
        } else {
            setTempoInput(tempo.toString());
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
        setShowSampleBrowser(true);
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
        setShowSampleBrowser(false);
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

        // For sample tracks, create audio clip
        if (track.type === "sample" && track.sample_id) {
            const clipRequest = {
                clip_type: "audio" as const,
                track_id: trackId,
                start_time: startBeat,
                duration: 4, // 4 beats default
                audio_file_path: track.sample_id, // Use sample ID for waveform loading
            };
            await addClip(activeSequenceId, clipRequest);
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

    // ========================================================================
    // FORMATTING HELPERS
    // ========================================================================

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10);
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
    };

    const formatPosition = (beats: number) => {
        const bars = Math.floor(beats / 4) + 1;
        const beat = Math.floor(beats % 4) + 1;
        const ticks = Math.floor((beats % 1) * 960);
        return `${bars}.${beat}.${ticks.toString().padStart(3, "0")}`;
    };

    const positionSeconds = (currentPosition / tempo) * 60;

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            {/* Transport Controls */}
            <SubPanel title="TRANSPORT" showHeader={false}>
                <div className="px-4 py-3 bg-gradient-to-r from-muted/20 to-muted/10">
                    <SequencerPanelTransport
                        isPlaying={isPlaying}
                        isPaused={isPaused}
                        isRecording={isRecording}
                        isLooping={isLooping}
                        tempo={tempo}
                        tempoInput={tempoInput}
                        hasTracksOrClips={hasTracksOrClips}
                        onPlayPause={handlePlayPause}
                        onStop={handleStop}
                        onRecord={handleRecord}
                        onLoop={handleToggleLoop}
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
                        zoom={zoom}
                        onSequenceChange={handleSequenceChange}
                        onAddSequence={handleAddSequence}
                        onManageSequences={() => setShowSequenceManager(true)}
                        onSequenceSettings={() => setShowSequenceSettings(true)}
                        onAddTrack={handleAddTrack}
                        onZoomIn={() => setZoom(Math.min(zoom * 1.2, 4))}
                        onZoomOut={() => setZoom(Math.max(zoom / 1.2, 0.25))}
                        onSnapToggle={() => setSnapEnabled(!snapEnabled)}
                        snapEnabled={snapEnabled}
                        gridSize={gridSize}
                        onGridSizeChange={setGridSize}
                    />
                </div>

                {/* Timeline Content - Single scrollable container */}
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {/* Track List (Left) - Fixed width, scrolls with timeline */}
                    <div className="w-64 border-r border-border flex flex-col flex-shrink-0">
                        <div className="h-8 border-b border-border bg-muted/30 flex items-center px-3 flex-shrink-0">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                Tracks
                            </span>
                        </div>
                        <div className="flex-1 min-h-0">
                            <SequencerPanelTrackList
                                tracks={tracks}
                                onToggleMute={handleToggleMute}
                                onToggleSolo={handleToggleSolo}
                                onDeleteTrack={deleteSequencerTrack}
                                onRenameTrack={renameSequencerTrack}
                            />
                        </div>
                    </div>

                    {/* Timeline (Right) - Single overflow container */}
                    <div className="flex-1 min-h-0">
                        <SequencerPanelTimeline
                            tracks={tracks}
                            clips={clips}
                            zoom={zoom}
                            currentPosition={currentPosition}
                            isLooping={isLooping}
                            loopStart={loopStart}
                            loopEnd={loopEnd}
                            snapEnabled={snapEnabled}
                            gridSize={gridSize}
                            selectedClip={selectedClip}
                            onSelectClip={setSelectedClip}
                            onDuplicateClip={handleDuplicateClip}
                            onDeleteClip={handleDeleteClip}
                            onAddClipToTrack={handleAddClipToTrack}
                            onMoveClip={handleMoveClip}
                            onResizeClip={handleResizeClip}
                            onLoopStartChange={setLoopStart}
                            onLoopEndChange={setLoopEnd}
                        />
                    </div>
                </div>
            </SubPanel>

            {/* Sample Browser Modal */}
            <SampleBrowserModal
                isOpen={showSampleBrowser}
                onClose={() => setShowSampleBrowser(false)}
                onSelectSample={handleSampleSelected}
            />

            {/* Sequence Manager Modal */}
            <SequenceManagerModal
                isOpen={showSequenceManager}
                onClose={() => setShowSequenceManager(false)}
                currentSequenceId={activeSequenceId}
                onSequenceChange={handleSequenceChange}
            />

            {/* Sequence Settings Dialog */}
            {activeSequence && (
                <SequenceSettingsDialog
                    isOpen={showSequenceSettings}
                    onClose={() => setShowSequenceSettings(false)}
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
        </div>
    );
}
