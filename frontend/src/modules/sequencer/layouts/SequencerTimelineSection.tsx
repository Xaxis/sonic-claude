/**
 * SequencerTimelineSection Component
 *
 * Shared layout component for timeline + track list.
 * Used by both timeline-only and split-view modes.
 * Uses SequencerContext for state management.
 *
 * Architecture:
 * - Track list (left): Fixed width, absolutely positioned, no scrollbar
 * - Timeline (right): Flexible width, single scrollbar controls both
 */

import React, { useState } from "react";
import { SequencerTracks } from "../components/Tracks/SequencerTracks.tsx";
import { SequencerTimeline } from "../components/Timeline/SequencerTimeline.tsx";
import { useSequencerContext } from "../contexts/SequencerContext.tsx";
import type { SequencerTrack, Clip } from "@/types/sequencer";

interface SequencerTimelineSectionProps {
    // Scroll
    timelineScrollRef: React.RefObject<HTMLDivElement | null>;
    onTimelineScroll: (e: React.UIEvent<HTMLDivElement>) => void;

    // Track handlers
    onToggleMute: (trackId: string) => Promise<void>;
    onToggleSolo: (trackId: string) => Promise<void>;
    onDeleteTrack: (trackId: string) => Promise<void>;
    onRenameTrack: (trackId: string, name: string) => Promise<void>;
    onUpdateTrack: (trackId: string, updates: { volume?: number; pan?: number }) => Promise<void>;

    // Clip handlers
    onSelectClip: (clipId: string | null) => void;
    onDuplicateClip: (clipId: string) => Promise<void>;
    onDeleteClip: (clipId: string) => Promise<void>;
    onAddClipToTrack: (trackId: string, startBeat: number) => Promise<void>;
    onMoveClip: (clipId: string, newStartTime: number) => Promise<void>;
    onResizeClip: (clipId: string, newDuration: number) => Promise<void>;
    onUpdateClip: (clipId: string, updates: { gain?: number; audio_offset?: number }) => Promise<void>;
    onOpenPianoRoll: (clipId: string) => void;
    onOpenSampleEditor?: (clipId: string) => void;

    // Loop handlers
    onLoopStartChange: (start: number) => void;
    onLoopEndChange: (end: number) => void;
    onSeek: (position: number, triggerAudio?: boolean) => Promise<void>;

    // Drag state handler (for piano roll sync)
    onClipDragStateChange?: (clipId: string, dragState: { startTime: number; duration: number } | null) => void;
}

export function SequencerTimelineSection(props: SequencerTimelineSectionProps) {
    const {
        timelineScrollRef,
        onTimelineScroll,
        onToggleMute,
        onToggleSolo,
        onDeleteTrack,
        onRenameTrack,
        onUpdateTrack,
        onSelectClip,
        onDuplicateClip,
        onDeleteClip,
        onAddClipToTrack,
        onMoveClip,
        onResizeClip,
        onUpdateClip,
        onOpenPianoRoll,
        onOpenSampleEditor,
        onLoopStartChange,
        onLoopEndChange,
        onSeek,
        onClipDragStateChange,
    } = props;

    // Get state from context
    const { tracks, clips } = useSequencerContext();

    // Get state from context
    const { state } = useSequencerContext();
    const { zoom, snapEnabled, gridSize, isLooping, loopStart, loopEnd, selectedClip, pianoRollClipId, sampleEditorClipId } = state;

    // Manage expanded tracks state
    const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());

    return (
        <div className="flex flex-1 min-h-0 relative">
            {/* Track List (Left) - Fixed width, NO scrollbar */}
            <div className="w-64 border-r border-border flex flex-col flex-shrink-0 bg-background absolute left-0 top-0 bottom-0 z-[60]">
                {/* Header - Fixed */}
                <div className="h-8 border-b border-border bg-muted/30 flex items-center px-3 flex-shrink-0">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        Tracks
                    </span>
                </div>
                {/* Track list - Controlled scroll (scrollbar hidden, synced with timeline) */}
                <div
                    data-track-list
                    className="flex-1 overflow-y-auto scrollbar-hide"
                >
                    <SequencerTracks
                        tracks={tracks}
                        onToggleMute={onToggleMute}
                        onToggleSolo={onToggleSolo}
                        onDeleteTrack={onDeleteTrack}
                        onRenameTrack={onRenameTrack}
                        onUpdateTrack={onUpdateTrack}
                        expandedTracks={expandedTracks}
                        onExpandedTracksChange={setExpandedTracks}
                    />
                </div>
            </div>

            {/* Timeline (Right) - ONLY scrollbar, controls everything */}
            <div
                ref={timelineScrollRef}
                className="min-w-0 min-h-0 overflow-auto pl-64"
                style={{ flex: '1 1 0', width: 0 }}
                onScroll={onTimelineScroll}
            >
                <SequencerTimeline
                    expandedTracks={expandedTracks}
                    onSelectClip={onSelectClip}
                    onDuplicateClip={onDuplicateClip}
                    onDeleteClip={onDeleteClip}
                    onAddClipToTrack={onAddClipToTrack}
                    onMoveClip={onMoveClip}
                    onResizeClip={onResizeClip}
                    onUpdateClip={onUpdateClip}
                    onOpenPianoRoll={onOpenPianoRoll}
                    onOpenSampleEditor={onOpenSampleEditor}
                    onLoopStartChange={onLoopStartChange}
                    onLoopEndChange={onLoopEndChange}
                    onSeek={onSeek}
                    onClipDragStateChange={onClipDragStateChange}
                />
            </div>
        </div>
    );
}

