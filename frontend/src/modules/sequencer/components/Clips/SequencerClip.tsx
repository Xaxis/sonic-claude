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

import { useEffect, useRef, useState } from "react";
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
    const midiEditorClipId = useDAWStore(state => state.midiEditorClipId);
    const sampleEditorClipId = useDAWStore(state => state.sampleEditorClipId);
    const isSelected = selectedClipId === clip.id;
    const isEditingInMidiEditor = midiEditorClipId === clip.id;
    const isEditingInSampleEditor = sampleEditorClipId === clip.id;

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const setSelectedClipId = useDAWStore(state => state.setSelectedClipId);
    const duplicateClip = useDAWStore(state => state.duplicateClip);
    const deleteClip = useDAWStore(state => state.deleteClip);
    const updateClip = useDAWStore(state => state.updateClip);
    const openMidiEditor = useDAWStore(state => state.openMidiEditor);
    const openSampleEditor = useDAWStore(state => state.openSampleEditor);
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
    const didDragRef = useRef(false); // tracks if mouse actually moved during a drag gesture
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
            const startTimeMatches = Math.abs(clip.start_time - dragState.startTime) < 0.01;
            const durationMatches  = Math.abs(clip.duration   - dragState.duration)  < 0.01;
            if (startTimeMatches && durationMatches) setDragState(null);
        }
    }, [clip.start_time, clip.duration, dragState, isDragging, isResizing]);

    // Calculate clip position and width (use drag state if dragging, otherwise clip props)
    const displayStartTime = dragState?.startTime ?? clip.start_time;
    const displayDuration  = dragState?.duration  ?? clip.duration;
    const left  = displayStartTime * pixelsPerBeat * zoom;
    const width = displayDuration  * pixelsPerBeat * zoom;

    // ========================================================================
    // DRAG / RESIZE: Register global listeners synchronously on mousedown.
    //
    // WHY NOT useEffect?
    //   useEffect runs asynchronously after the next React render commit. For a
    //   quick click (mousedown → mouseup in < one render cycle), the global
    //   mouseup listener would never be registered in time, so handleMouseUp
    //   would never fire. That left isDragging stuck as true, which then caused
    //   subsequent mouse movement to set didDragRef = true, silently suppressing
    //   every follow-up click on the clip.
    //
    //   Registering directly in the mousedown handler is the standard imperative
    //   drag pattern and eliminates the race entirely.
    // ========================================================================
    const handleMouseDown = (e: React.MouseEvent, action: "move" | "resize-left" | "resize-right") => {
        e.stopPropagation();

        // Capture start values in closure — correct for the entire gesture
        const startX        = e.clientX;
        const startTime     = displayStartTime;
        const startDuration = displayDuration;
        const ppb           = pixelsPerBeat;
        const z             = zoom;
        const snap          = snapEnabled;
        const gSize         = gridSize;

        // Set visual state (opacity, cursor, disables AI)
        if (action === "move") {
            didDragRef.current = false;
            setIsDragging(true);
        } else if (action === "resize-left") {
            setIsResizing("left");
        } else {
            setIsResizing("right");
        }

        // Track final position so onUp can commit to backend
        let finalState: { startTime: number; duration: number } | null = null;

        const onMove = (ev: MouseEvent) => {
            const deltaX     = ev.clientX - startX;
            const deltaBeats = deltaX / (ppb * z);

            if (Math.abs(deltaX) > 3) didDragRef.current = true;

            let next: { startTime: number; duration: number };
            if (action === "move") {
                let newStart = Math.max(0, startTime + deltaBeats);
                if (snap) newStart = Math.round(newStart * gSize) / gSize;
                next = { startTime: newStart, duration: startDuration };
            } else if (action === "resize-left") {
                let newStart = Math.max(0, startTime + deltaBeats);
                if (snap) newStart = Math.round(newStart * gSize) / gSize;
                next = { startTime: newStart, duration: Math.max(0.25, startDuration - (newStart - startTime)) };
            } else {
                let newDur = Math.max(0.25, startDuration + deltaBeats);
                if (snap) newDur = Math.round(newDur * gSize) / gSize;
                next = { startTime: startTime, duration: newDur };
            }

            finalState = next;
            setDragState(next);
        };

        const onUp = async () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup",   onUp);

            if (finalState) {
                if (action === "move") {
                    await updateClip(clip.id, { start_time: finalState.startTime });
                } else if (action === "resize-left") {
                    await updateClip(clip.id, { start_time: finalState.startTime, duration: finalState.duration });
                } else {
                    await updateClip(clip.id, { duration: finalState.duration });
                }
            }

            setIsDragging(false);
            setIsResizing(null);
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup",   onUp);
    };

    const handleClick = (e: React.MouseEvent) => {
        // Suppress if the mousedown-mouseup gesture was actually a drag (mouse moved > 3px).
        // Uses a ref (not state) so we always read the latest value even when React hasn't
        // re-rendered yet — state like isDragging/isResizing would be stale here.
        if (didDragRef.current) return;

        e.stopPropagation();
        setSelectedClipId(clip.id);

        if (clip.type === "midi") {
            // Kit tracks → step editor; plain MIDI → piano roll
            const mode = (track?.kit && Object.keys(track.kit).length > 0)
                ? "step-sequencer" as const
                : "piano-roll" as const;
            openMidiEditor(clip.id, mode);
        } else if (clip.type === "audio") {
            openSampleEditor(clip.id);
        }
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
                    isEditingInMidiEditor || isEditingInSampleEditor
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
                    backgroundColor: (isEditingInMidiEditor || isEditingInSampleEditor)
                        ? `${trackColor}60` // Brighter when editing
                        : `${trackColor}40`, // Track color with 25% opacity
                    borderColor: (isEditingInMidiEditor || isEditingInSampleEditor) ? "#22d3ee" : trackColor,
                }}
            onClick={handleClick}
            onMouseDown={(e) => {
                // Call clip's drag handler first
                handleMouseDown(e, "move");
                // Then call AI handler
                aiHandlers.onMouseDown(e);
            }}
            onMouseMove={aiHandlers.onMouseMove}
            onMouseUp={aiHandlers.onMouseUp}
            onMouseLeave={aiHandlers.onMouseLeave}
            onTouchStart={aiHandlers.onTouchStart}
            onTouchMove={aiHandlers.onTouchMove}
            onTouchEnd={aiHandlers.onTouchEnd}
            onTouchCancel={aiHandlers.onTouchCancel}
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

