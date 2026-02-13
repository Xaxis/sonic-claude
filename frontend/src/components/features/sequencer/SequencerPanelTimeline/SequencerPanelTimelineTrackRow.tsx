/**
 * SequencerPanelTimelineTrackRow - Individual track row with clips
 * 
 * Displays a single track row in the timeline with its clips.
 * Supports click-to-add-clip functionality.
 */

import { useRef } from "react";
import { SequencerPanelClip } from "../SequencerPanelClip.tsx";

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
}

interface Track {
    id: string;
    name: string;
    color?: string;
}

interface SequencerPanelTimelineTrackRowProps {
    track: Track;
    clips: Clip[];
    selectedClip: string | null;
    zoom: number;
    pixelsPerBeat: number;
    snapEnabled: boolean;
    gridSize: number;
    onSelectClip: (clipId: string) => void;
    onDuplicateClip: (clipId: string) => void;
    onDeleteClip: (clipId: string) => void;
    onAddClipToTrack?: (trackId: string, startBeat: number) => void;
    onMoveClip?: (clipId: string, newStartTime: number) => void;
    onResizeClip?: (clipId: string, newDuration: number) => void;
    onUpdateClip?: (clipId: string, updates: { gain?: number; audio_offset?: number }) => void;
    onOpenPianoRoll?: (clipId: string) => void;
}

export function SequencerPanelTimelineTrackRow({
    track,
    clips,
    selectedClip,
    zoom,
    pixelsPerBeat,
    snapEnabled,
    gridSize,
    onSelectClip,
    onDuplicateClip,
    onDeleteClip,
    onAddClipToTrack,
    onMoveClip,
    onResizeClip,
    onUpdateClip,
    onOpenPianoRoll,
}: SequencerPanelTimelineTrackRowProps) {
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
            className="relative h-16 border-b border-border cursor-pointer hover:bg-muted/10 transition-colors"
            onMouseDown={handleTrackMouseDown}
            onClick={handleTrackClick}
            title="Click to add clip"
        >
            {/* Clips for this track */}
            {clips
                .filter((clip) => clip.track_id === track.id)
                .map((clip) => (
                    <SequencerPanelClip
                        key={clip.id}
                        clip={clip}
                        trackColor={track.color}
                        isSelected={selectedClip === clip.id}
                        zoom={zoom}
                        pixelsPerBeat={pixelsPerBeat}
                        snapEnabled={snapEnabled}
                        gridSize={gridSize}
                        onSelect={onSelectClip}
                        onDuplicate={onDuplicateClip}
                        onDelete={onDeleteClip}
                        onMove={onMoveClip}
                        onResize={onResizeClip}
                        onUpdate={onUpdateClip}
                        onOpenPianoRoll={onOpenPianoRoll}
                    />
                ))}
        </div>
    );
}

