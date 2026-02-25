/**
 * SequencerTimelineTrackRow - Individual track row with clips
 *
 * REFACTORED: Uses Zustand best practices
 * - Reads clips from Zustand directly (no prop drilling)
 * - Uses useTimelineCalculations() for pixelsPerBeat (no prop drilling)
 * - Calls Zustand actions directly (no callback props)
 * - Only receives track (iteration data) and isExpanded (local UI state)
 *
 * Displays a single track row in the timeline with its clips.
 * Supports click-to-add-clip functionality.
 */

import { useRef } from "react";
import { SequencerClip } from "../Clips/SequencerClip.tsx";
import { cn } from "@/lib/utils.ts";
import { useDAWStore } from '@/stores/dawStore';
import { useTimelineCalculations } from '../../hooks/useTimelineCalculations';
import type { SequencerTrack } from '../../types';

interface SequencerTimelineTrackRowProps {
    track: SequencerTrack;  // Iteration data - acceptable to pass
    isExpanded?: boolean;   // Local UI state - acceptable to pass
}

export function SequencerTimelineTrackRow({
    track,
    isExpanded = false,
}: SequencerTimelineTrackRowProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const clips = useDAWStore(state => state.clips);
    const activeComposition = useDAWStore(state => state.activeComposition);
    const zoom = useDAWStore(state => state.zoom);
    const snapEnabled = useDAWStore(state => state.snapEnabled);
    const gridSize = useDAWStore(state => state.gridSize);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const addClip = useDAWStore(state => state.addClip);
    const setSelectedClipId = useDAWStore(state => state.setSelectedClipId);

    // ========================================================================
    // SHARED TIMELINE CALCULATIONS: Use the same hook as timeline for consistency!
    // ========================================================================
    const { pixelsPerBeat } = useTimelineCalculations();

    // ========================================================================
    // DERIVED STATE: Filter clips for this track
    // ========================================================================
    const trackClips = clips.filter((clip) => clip.track_id === track.id);

    // ========================================================================
    // LOCAL STATE: Track mouse down for click-to-add-clip
    // ========================================================================
    const mouseDownPosRef = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null);

    // ========================================================================
    // HANDLERS: Click-to-add-clip functionality
    // ========================================================================
    const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only track mouse down if clicking on the track background (not on a clip)
        if (e.target === e.currentTarget) {
            mouseDownPosRef.current = { x: e.clientX, y: e.clientY, target: e.target };
        }
    };

    const handleTrackClick = async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!activeComposition) return;

        // Only process if we clicked on the track background (not on a clip)
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

        // Deselect any selected clip when clicking on empty timeline
        setSelectedClipId(null);

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickBeat = clickX / (pixelsPerBeat * zoom);

        // Snap to grid if snap is enabled
        const finalBeat = snapEnabled ? Math.round(clickBeat * gridSize) / gridSize : clickBeat;

        // Add clip using Zustand action
        const clipRequest = {
            sequence_id: activeComposition.id,
            clip_type: track.type === "midi" ? "midi" : "audio",
            track_id: track.id,
            start_time: finalBeat,
            duration: 4.0, // Default 1 bar at 4/4
        };
        await addClip(clipRequest);
    };

    // ========================================================================
    // RENDER
    // ========================================================================
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
            {trackClips.map((clip) => (
                <SequencerClip
                    key={clip.id}
                    clip={clip}
                />
            ))}
        </div>
    );
}

