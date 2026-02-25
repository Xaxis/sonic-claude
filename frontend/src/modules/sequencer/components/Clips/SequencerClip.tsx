/**
 * SequencerClip - Individual clip component with waveform
 *
 * REFACTORED: Uses Zustand best practices
 * - Reads ALL state from Zustand directly (no prop drilling)
 * - Uses useTimelineCalculations() for pixelsPerBeat (no prop drilling)
 * - Calls Zustand actions directly (no callback props)
 * - Only receives clip (iteration data)
 *
 * Displays a clip with waveform visualization, handles selection and actions
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils.ts";
import type { SequencerClip } from "../../types.ts";
import { WaveformDisplay } from "../../../../components/ui/waveform-display.tsx";
import { useDAWStore } from '@/stores/dawStore';
import { useWaveformData } from "../../hooks/useWaveformData.ts";
import { SequencerClipNameEditor } from "./SequencerClipNameEditor.tsx";
import { SequencerClipActionsMenu } from "./SequencerClipActionsMenu.tsx";
import { useTimelineCalculations } from "../../hooks/useTimelineCalculations.ts";
import { useInlineAI } from "@/hooks/useInlineAI";
import { useEntityHighlight } from "@/hooks/useEntityHighlight";
import { InlineAIPromptPopover } from "@/components/ai/InlineAIPromptPopover";

interface SequencerClipProps {
    clip: SequencerClip;  // Iteration data - acceptable to pass
}

export function SequencerClip({
    clip,
}: SequencerClipProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);
    const activeComposition = useDAWStore(state => state.activeComposition);
    const tempo = activeComposition?.tempo ?? 120;
    const zoom = useDAWStore(state => state.zoom);
    const snapEnabled = useDAWStore(state => state.snapEnabled);
    const gridSize = useDAWStore(state => state.gridSize);
    const selectedClipId = useDAWStore(state => state.selectedClipId);
    const pianoRollClipId = useDAWStore(state => state.pianoRollClipId);
    const isSelected = selectedClipId === clip.id;
    const isEditingInPianoRoll = pianoRollClipId === clip.id;
    const isEditingInSampleEditor = false; // TODO: Implement sample editor

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const setSelectedClipId = useDAWStore(state => state.setSelectedClipId);
    const duplicateClip = useDAWStore(state => state.duplicateClip);
    const deleteClip = useDAWStore(state => state.deleteClip);
    const updateClip = useDAWStore(state => state.updateClip);
    const openPianoRoll = useDAWStore(state => state.openPianoRoll);
    const setClipDragState = useDAWStore(state => state.setClipDragState);

    // ========================================================================
    // SHARED TIMELINE CALCULATIONS: Use the same hook for consistency!
    // ========================================================================
    const { pixelsPerBeat } = useTimelineCalculations();

    // ========================================================================
    // DERIVED STATE: Get track color and expansion state
    // ========================================================================
    const track = tracks.find(t => t.id === clip.track_id);
    const trackColor = track?.color ?? "#3b82f6";
    // TODO: Track expansion state - for now assume collapsed (64px)
    // This could be passed as context or derived from track height
    const isTrackExpanded = false;

    // Load waveform data using hook (200 samples for clip preview)
    const { leftData: waveformData } = useWaveformData({
        sampleId: clip.type === "audio" ? (clip.audio_file_path ?? null) : null,
        clipDuration: clip.duration,
        tempo,
        samplesPerLoop: 200,
    });

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<"left" | "right" | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);

    // ========================================================================
    // INLINE AI: Universal pattern for AI editing
    // ========================================================================
    const { handlers: aiHandlers, showPrompt: showAIPrompt, position: aiPosition, closePrompt: closeAIPrompt } = useInlineAI({
        entityType: "clip",
        entityId: clip.id,
        disabled: isDragging || isResizing !== null || isEditingName,
    });

    const { highlightClass } = useEntityHighlight(clip.id);

    // Handle clip rename
    const handleRename = (clipId: string, newName: string) => {
        updateClip(clipId, { name: newName });
        setIsEditingName(false);
    };
    const [dragStartX, setDragStartX] = useState(0);
    const [dragStartTime, setDragStartTime] = useState(0);
    const [dragStartDuration, setDragStartDuration] = useState(0);

    // ========================================================================
    // LOCAL STATE: Drag state for live updates
    // ========================================================================
    const [dragState, setDragState] = useState<{ startTime: number; duration: number } | null>(null);

    // Report drag state changes to Zustand (for piano roll sync)
    useEffect(() => {
        setClipDragState(clip.id, dragState);
    }, [dragState, clip.id, setClipDragState]);

    // Clear drag state when backend syncs (clip props match drag state)
    useEffect(() => {
        if (dragState && !isDragging && !isResizing) {
            // Check if backend has synced (within tolerance)
            const startTimeMatches = Math.abs(clip.start_time - dragState.startTime) < 0.01;
            const durationMatches = Math.abs(clip.duration - dragState.duration) < 0.01;

            if (startTimeMatches && durationMatches) {
                setDragState(null);
            }
        }
    }, [clip.start_time, clip.duration, dragState, isDragging, isResizing]);

    // Calculate clip position and width (use drag state if dragging, otherwise use clip props)
    const displayStartTime = dragState?.startTime ?? clip.start_time;
    const displayDuration = dragState?.duration ?? clip.duration;
    const left = displayStartTime * pixelsPerBeat * zoom;
    const width = displayDuration * pixelsPerBeat * zoom;

    // Drag and resize handlers
    const handleMouseDown = (e: React.MouseEvent, action: "move" | "resize-left" | "resize-right") => {
        e.stopPropagation();
        setDragStartX(e.clientX);
        // Use displayStartTime/displayDuration which includes any pending drag state
        // This ensures we start from the current visual position, not the backend position
        setDragStartTime(displayStartTime);
        setDragStartDuration(displayDuration);

        if (action === "move") {
            setIsDragging(true);
        } else if (action === "resize-left") {
            setIsResizing("left");
        } else if (action === "resize-right") {
            setIsResizing("right");
        }
    };

    // Add global mouse event listeners for drag/resize
    useEffect(() => {
        if (!isDragging && !isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragStartX;
            const deltaBeats = deltaX / (pixelsPerBeat * zoom);

            if (isDragging) {
                // Calculate new position with snap
                let newStartTime = Math.max(0, dragStartTime + deltaBeats);
                if (snapEnabled) {
                    newStartTime = Math.round(newStartTime * gridSize) / gridSize;
                }
                // Update drag state for immediate visual feedback
                // Use current display duration (which may include previous resize)
                setDragState({
                    startTime: newStartTime,
                    duration: displayDuration,
                });
            } else if (isResizing === "left") {
                // Resize from left (changes both start time and duration)
                let newStartTime = Math.max(0, dragStartTime + deltaBeats);
                if (snapEnabled) {
                    newStartTime = Math.round(newStartTime * gridSize) / gridSize;
                }
                const newDuration = Math.max(0.25, dragStartDuration - (newStartTime - dragStartTime));
                setDragState({
                    startTime: newStartTime,
                    duration: newDuration,
                });
            } else if (isResizing === "right") {
                // Resize from right (changes only duration)
                let newDuration = Math.max(0.25, dragStartDuration + deltaBeats);
                if (snapEnabled) {
                    newDuration = Math.round(newDuration * gridSize) / gridSize;
                }
                // Use current display start time (which may include previous move)
                setDragState({
                    startTime: displayStartTime,
                    duration: newDuration,
                });
            }
        };

        const handleMouseUp = async () => {
            // Apply final values to backend on mouse up
            if (isDragging && dragState) {
                await updateClip(clip.id, { start_time: dragState.startTime });
            } else if (isResizing === "left" && dragState) {
                await updateClip(clip.id, { start_time: dragState.startTime });
                await updateClip(clip.id, { duration: dragState.duration });
            } else if (isResizing === "right" && dragState) {
                await updateClip(clip.id, { duration: dragState.duration });
            }

            // Clean up drag state
            setIsDragging(false);
            setIsResizing(null);

            // Don't clear dragState here - let the useEffect clear it when backend syncs
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, isResizing, dragStartX, dragStartTime, dragStartDuration, pixelsPerBeat, zoom, snapEnabled, gridSize, clip.id, displayStartTime, displayDuration, dragState, updateClip]);

    const handleClick = (e: React.MouseEvent) => {
        // Don't trigger click if we just finished dragging/resizing
        if (isDragging || isResizing) {
            return;
        }

        e.stopPropagation(); // Prevent timeline background click

        // Single-click: select clip
        setSelectedClipId(clip.id);

        // Open piano roll for MIDI clips (only if clip still exists in store)
        if (clip.type === "midi") {
            // Verify clip exists in current composition before opening
            const currentClips = useDAWStore.getState().clips;
            const clipExists = currentClips.some(c => c.id === clip.id);

            if (clipExists) {
                openPianoRoll(clip.id);
            } else {
                console.warn(`Clip ${clip.id} no longer exists in composition`);
            }
        }
        // TODO: Implement sample editor for audio clips
    };

    return (
        <>
            {/* Snap guide - show where clip will land when dragging */}
            {(isDragging || isResizing) && snapEnabled && dragState && (
                <div
                    className="absolute top-0 bottom-0 border-l-2 border-dashed border-teal-400/60 pointer-events-none z-10"
                    style={{
                        left: `${dragState.startTime * pixelsPerBeat * zoom}px`,
                    }}
                />
            )}

            <div
                className={cn(
                    "absolute top-1 bottom-1 rounded border-2 cursor-move overflow-hidden transition-all",
                    isEditingInPianoRoll || isEditingInSampleEditor
                        ? "border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)] ring-2 ring-cyan-400/50"
                        : isSelected
                            ? "border-white shadow-lg"
                            : "border-white/40",
                    isDragging && "opacity-70",
                    isResizing && "opacity-70",
                    highlightClass
                )}
                style={{
                    left: `${left}px`,
                    width: `${width}px`,
                    backgroundColor: (isEditingInPianoRoll || isEditingInSampleEditor)
                        ? `${trackColor}60` // Brighter when editing
                        : `${trackColor}40`, // Track color with 25% opacity
                    borderColor: (isEditingInPianoRoll || isEditingInSampleEditor) ? "#22d3ee" : trackColor,
                }}
            onClick={handleClick}
            onMouseDown={(e) => handleMouseDown(e, "move")}
            {...aiHandlers}
        >
            {/* Left resize handle */}
            <div
                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-20"
                onMouseDown={(e) => handleMouseDown(e, "resize-left")}
            />

            {/* Right resize handle */}
            <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-20"
                onMouseDown={(e) => handleMouseDown(e, "resize-right")}
            />

            {/* Waveform Display */}
            {clip.type === "audio" && waveformData.length > 0 && (
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                    <WaveformDisplay
                        data={waveformData}
                        width={width}
                        height={60}
                        color="rgba(255, 255, 255, 0.6)"
                        backgroundColor="transparent"
                        showGrid={false}
                        glowEffect={false}
                        className="w-full h-full"
                    />
                </div>
            )}

            {/* Clip Info - Different layout for expanded vs minimized tracks */}
            {isTrackExpanded ? (
                /* EXPANDED MODE: Label at bottom in dedicated bar */
                <div className={cn(
                    "absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm border-t border-white/10 px-2 py-1",
                    isEditingName ? "z-40 pointer-events-auto" : "z-10 pointer-events-none"
                )}>
                    <div className="flex items-center justify-between gap-2">
                        <SequencerClipNameEditor
                            clipId={clip.id}
                            clipName={clip.name}
                            onSave={handleRename}
                            isExpanded={true}
                            className="flex-1"
                            externalEditMode={isEditingName}
                            onEditModeChange={setIsEditingName}
                        />
                        {clip.type === "midi" && clip.midi_events && (
                            <span className="text-[10px] text-white/60 flex-shrink-0 pointer-events-none">
                                {clip.midi_events.length} notes
                            </span>
                        )}
                    </div>
                </div>
            ) : (
                /* MINIMIZED MODE: Label at top (original) */
                <div className={cn(
                    "relative px-2 py-1",
                    isEditingName ? "z-40 pointer-events-auto" : "z-10 pointer-events-none"
                )}>
                    <SequencerClipNameEditor
                        clipId={clip.id}
                        clipName={clip.name}
                        onSave={handleRename}
                        isExpanded={false}
                        externalEditMode={isEditingName}
                        onEditModeChange={setIsEditingName}
                    />
                </div>
            )}

            {/* Actions - Always show dropdown menu */}
            {isSelected && !isEditingName && (
                <div className="absolute top-1 right-1 flex gap-1 z-30">
                    <SequencerClipActionsMenu
                        onEdit={() => setIsEditingName(true)}
                        onCopy={async () => {
                            if (activeComposition) {
                                await duplicateClip(activeComposition.id, clip.id);
                            }
                        }}
                        onDelete={async () => {
                            await deleteClip(clip.id);
                        }}
                        onVolumeChange={async (newGain) => {
                            await updateClip(clip.id, { gain: newGain });
                        }}
                        onAudioOffsetChange={clip.type === "audio" ? async (newOffset) => {
                            await updateClip(clip.id, { audio_offset: newOffset });
                        } : undefined}
                        volume={clip.gain}
                        audioOffset={clip.type === "audio" ? (clip.audio_offset || 0) : undefined}
                        clipType={clip.type}
                    />
                </div>
            )}

            {/* Volume and audio offset controls are now in the dropdown menu only */}
            </div>

            {/* INLINE AI PROMPT - Universal pattern */}
            {showAIPrompt && aiPosition && (
                <InlineAIPromptPopover
                    entityType="clip"
                    entityId={clip.id}
                    position={aiPosition}
                    onClose={closeAIPrompt}
                />
            )}
        </>
    );
}

