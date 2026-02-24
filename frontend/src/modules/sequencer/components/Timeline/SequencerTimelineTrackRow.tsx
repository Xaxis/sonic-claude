/**
 * SequencerTimelineTrackRow - Individual track row with clips
 *
 * Displays a single track row in the timeline with its clips.
 * Supports click-to-add-clip functionality.
 * Uses SequencerContext for state management.
 */

import { useRef } from "react";
import { SequencerClip } from "../Clips/SequencerClip.tsx";
import { cn } from "@/lib/utils.ts";
import { useDAWStore } from '@/stores/dawStore';

interface Clip {
    id: string;
    name: string;
    track_id: string;
    start_time: number;
    duration: number;
    type: "midi" | "audio";
    audio_file_path?: string;
    audio_offset?: number;
    gain: number;
    is_muted: boolean;
    is_looped: boolean;
}

interface Track {
    id: string;
    name: string;
    color?: string;
}

interface SequencerTimelineTrackRowProps {
    track: Track;
    clips: Clip[];
    pixelsPerBeat: number;
    isExpanded?: boolean; // Track header expansion state
    onSelectClip: (clipId: string | null) => void;
    onDuplicateClip: (clipId: string) => void;
    onDeleteClip: (clipId: string) => void;
    onAddClipToTrack?: (trackId: string, startBeat: number) => void;
    onMoveClip?: (clipId: string, newStartTime: number) => void;
    onResizeClip?: (clipId: string, newDuration: number) => void;
    onUpdateClip?: (clipId: string, updates: { gain?: number; audio_offset?: number }) => void;
    onOpenPianoRoll?: (clipId: string) => void;
    onOpenSampleEditor?: (clipId: string) => void;
    onClipDragStateChange?: (clipId: string, dragState: { startTime: number; duration: number } | null) => void;
}

export function SequencerTimelineTrackRow({
    track,
    clips,
    pixelsPerBeat,
    isExpanded = false,
    onSelectClip,
    onDuplicateClip,
    onDeleteClip,
    onAddClipToTrack,
    onMoveClip,
    onResizeClip,
    onUpdateClip,
    onOpenPianoRoll,
    onOpenSampleEditor,
    onClipDragStateChange,
}: SequencerTimelineTrackRowProps) {
    // Get state from Zustand store
    const zoom = useDAWStore(state => state.zoom);
    const snapEnabled = useDAWStore(state => state.snapEnabled);
    const gridSize = useDAWStore(state => state.gridSize);
    const pianoRollClipId = useDAWStore(state => state.pianoRollClipId);

    const mouseDownPosRef = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null);

    const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only track mouse down if clicking on the track background (not on a clip)
        if (e.target === e.currentTarget) {
            mouseDownPosRef.current = { x: e.clientX, y: e.clientY, target: e.target };
        }
    };

    const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onAddClipToTrack) return;

        // Only add clip if we clicked on the track background (not on a clip)
        if (!mouseDownPosRef.current || mouseDownPosRef.current.target !== e.currentTarget) {
            return;
        }

        // Check if this was a drag (mouse moved more than 5px)
        const deltaX = Math.abs(e.clientX - mouseDownPosRef.current.x);
        const deltaY = Math.abs(e.clientY - mouseDownPosRef.current.y);
        if (deltaX > 5 || deltaY > 5) {
            return;
        }

        mouseDownPosRef.current = null;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickBeat = clickX / (pixelsPerBeat * zoom);

        // Snap to grid if snap is enabled
        const finalBeat = snapEnabled ? Math.round(clickBeat * gridSize) / gridSize : clickBeat;

        onAddClipToTrack(track.id, finalBeat);
    };

    return (
        <div
            className={cn(
                "relative border-b border-border cursor-pointer hover:bg-muted/10 transition-all",
                isExpanded ? "h-32" : "h-16"
            )}
            style={{
                // IMPORTANT: z-index must be lower than sticky sidebar (which is z-index: 30)
                // so timeline content scrolls UNDER the track headers
                zIndex: 1,
            }}
            onMouseDown={handleTrackMouseDown}
            onClick={handleTrackClick}
            title="Click to add clip"
        >
            {/* Clips for this track */}
            {clips
                .filter((clip) => clip.track_id === track.id)
                .map((clip) => (
                    <SequencerClip
                        key={clip.id}
                        clip={clip}
                        trackColor={track.color}
                        isEditingInPianoRoll={pianoRollClipId === clip.id}
                        isEditingInSampleEditor={false}
                        pixelsPerBeat={pixelsPerBeat}
                        isTrackExpanded={isExpanded}
                        onSelect={onSelectClip}
                        onDuplicate={onDuplicateClip}
                        onDelete={onDeleteClip}
                        onMove={onMoveClip}
                        onResize={onResizeClip}
                        onUpdateClip={onUpdateClip}
                        onOpenPianoRoll={onOpenPianoRoll}
                        onOpenSampleEditor={onOpenSampleEditor}
                        onClipDragStateChange={onClipDragStateChange}
                    />
                ))}
        </div>
    );
}

