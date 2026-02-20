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
import { SequencerTimelineRuler } from "../components/Timeline/SequencerTimelineRuler.tsx";
import { useSequencerContext } from '@/contexts/SequencerContext';
import { useTimelineCalculations } from "../hooks/useTimelineCalculations.ts";
import { EditorGridLayout } from "@/components/layout/EditorGridLayout.tsx";
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

    // Get timeline calculations for ruler rendering
    const { totalWidth, rulerMarkers, pixelsPerBeat } = useTimelineCalculations();

    return (
        <EditorGridLayout
            cornerHeader={
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Tracks
                </span>
            }
            ruler={
                <SequencerTimelineRuler
                    rulerMarkers={rulerMarkers}
                    totalWidth={totalWidth}
                    onSeek={onSeek}
                    pixelsPerBeat={pixelsPerBeat}
                    zoom={zoom}
                    snapEnabled={snapEnabled}
                    gridSize={gridSize}
                />
            }
            sidebar={
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
            }
            mainContent={
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
            }
            sidebarWidth={256}
            headerHeight={32}
            contentWidth={totalWidth}
            scrollRef={timelineScrollRef}
            onScroll={onTimelineScroll}
            rulerScrollDataAttr="data-ruler-scroll"
            sidebarScrollDataAttr="data-track-list"
        />
    );
}

