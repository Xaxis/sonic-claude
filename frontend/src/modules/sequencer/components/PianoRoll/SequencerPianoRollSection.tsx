/**
 * SequencerPianoRollSection Component
 *
 * REFACTORED: Pure layout component matching SequencerTimelineSection architecture
 * - Only receives scroll ref and local UI callbacks
 * - Reads pianoRollClipId from Zustand store
 * - Calls Zustand actions directly
 *
 * Architecture:
 * - Piano keyboard (left): Fixed width, absolutely positioned, no scrollbar
 * - Piano grid (right): Flexible width, single scrollbar controls both
 * - Keyboard vertical scroll is synced with grid vertical scroll
 */

import { SequencerPianoRollKeyboard } from "./SequencerPianoRollKeyboard.tsx";
import { SequencerPianoRollGrid } from "./SequencerPianoRollGrid.tsx";
import { SequencerPianoRollRuler } from "./SequencerPianoRollRuler.tsx";
import { SequencerTimelineLoopRegion } from "../Timeline/SequencerTimelineLoopRegion.tsx";
import { useDAWStore } from '@/stores/dawStore.ts';
import { useTimelineCalculations } from "../../hooks/useTimelineCalculations.ts";
import { SequencerGridLayout } from "../Layouts/SequencerGridLayout.tsx";

interface SequencerPianoRollSectionProps {
    // Scroll ref
    pianoRollScrollRef: React.RefObject<HTMLDivElement | null>;

    // Local UI state callbacks (selectedNotes is managed by parent for copy/paste functionality)
    selectedNotes: Set<number>;
    onSelectNote: (index: number) => void;
    onToggleSelectNote: (index: number) => void;
}

export function SequencerPianoRollSection({
    pianoRollScrollRef,
    selectedNotes,
    onSelectNote,
    onToggleSelectNote,
}: SequencerPianoRollSectionProps) {
    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const setPianoRollScrollLeft = useDAWStore(state => state.setPianoRollScrollLeft);

    // ========================================================================
    // SHARED TIMELINE CALCULATIONS: Use the same hook as timeline for consistency!
    // ========================================================================
    const { totalWidth } = useTimelineCalculations();

    // ========================================================================
    // HANDLERS
    // ========================================================================
    const handlePianoRollScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        setPianoRollScrollLeft(scrollLeft);
    };

    return (
        <SequencerGridLayout
            cornerHeader={
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Notes
                </span>
            }
            ruler={
                <SequencerPianoRollRuler />
            }
            sidebar={
                <SequencerPianoRollKeyboard />
            }
            mainContent={
                <div className="relative">
                    <SequencerPianoRollGrid
                        selectedNotes={selectedNotes}
                        onSelectNote={onSelectNote}
                        onToggleSelectNote={onToggleSelectNote}
                    />

                    {/* Loop Region - Overlaid on grid */}
                    <SequencerTimelineLoopRegion />
                </div>
            }
            sidebarWidth={256}
            headerHeight={32}
            contentWidth={totalWidth}
            scrollRef={pianoRollScrollRef}
            onScroll={handlePianoRollScroll}
            rulerScrollDataAttr="data-piano-ruler-scroll"
            sidebarScrollDataAttr="data-piano-keyboard"
        />
    );
}

