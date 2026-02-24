/**
 * SequencerTimelineSection Component
 *
 * REFACTORED: Pure layout component using Zustand best practices
 * - No prop drilling - child components read from store directly
 * - Only manages local UI state (expandedTracks)
 * - Only receives scroll ref
 *
 * Shared layout component for timeline + track list.
 * Used by both timeline-only and split-view modes.
 *
 * Architecture:
 * - Track list (left): Fixed width, sticky, no scrollbar
 * - Timeline (right): Flexible width, single scrollbar controls both
 */

import React, { useState } from "react";
import { SequencerTracks } from "../components/Tracks/SequencerTracks.tsx";
import { SequencerTimeline } from "../components/Timeline/SequencerTimeline.tsx";
import { SequencerTimelineRuler } from "../components/Timeline/SequencerTimelineRuler.tsx";
import { useTimelineCalculations } from "../hooks/useTimelineCalculations.ts";
import { SequencerGridLayout } from "./SequencerGridLayout.tsx";
import { useDAWStore } from '@/stores/dawStore';

interface SequencerTimelineSectionProps {
    // Scroll ref for auto-scroll functionality
    timelineScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function SequencerTimelineSection({
    timelineScrollRef,
}: SequencerTimelineSectionProps) {
    // ========================================================================
    // ACTIONS: Get scroll action from Zustand store
    // ========================================================================
    const setTimelineScrollLeft = useDAWStore(state => state.setTimelineScrollLeft);

    // ========================================================================
    // LOCAL UI STATE: Track expansion (not in Zustand)
    // ========================================================================
    const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());

    // ========================================================================
    // CALCULATIONS: Timeline dimensions (only need totalWidth for layout)
    // ========================================================================
    const { totalWidth } = useTimelineCalculations();

    // ========================================================================
    // HANDLERS: Scroll synchronization
    // ========================================================================
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        setTimelineScrollLeft(scrollLeft);
    };

    return (
        <SequencerGridLayout
            cornerHeader={
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Tracks
                </span>
            }
            ruler={
                <SequencerTimelineRuler />
            }
            sidebar={
                <SequencerTracks
                    expandedTracks={expandedTracks}
                    onExpandedTracksChange={setExpandedTracks}
                />
            }
            mainContent={
                <SequencerTimeline
                    expandedTracks={expandedTracks}
                    scrollContainerRef={timelineScrollRef}
                />
            }
            sidebarWidth={256}
            headerHeight={32}
            contentWidth={totalWidth}
            scrollRef={timelineScrollRef}
            onScroll={handleScroll}
        />
    );
}

