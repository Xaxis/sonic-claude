/**
 * SequencerPianoRoll - Piano roll MIDI editor (bottom panel)
 *
 * REFACTORED: Self-contained component following Zustand best practices
 * - Reads ALL state from Zustand (no prop drilling)
 * - Composes SequencerGridLayout with keyboard, ruler, and grid
 */

import { X, Music } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { SequencerPianoRollKeyboard } from "./SequencerPianoRollKeyboard.tsx";
import { SequencerPianoRollGrid } from "./SequencerPianoRollGrid.tsx";
import { SequencerPianoRollRuler } from "./SequencerPianoRollRuler.tsx";
import { SequencerTimelineLoopRegion } from "../Timeline/SequencerTimelineLoopRegion.tsx";
import { SequencerGridLayout } from "../Layouts/SequencerGridLayout.tsx";
import { useDAWStore } from '@/stores/dawStore';
import { useTimelineCalculations } from "../../hooks/useTimelineCalculations.ts";

interface SequencerPianoRollProps {
    // Only receives scroll ref (follows SequencerTimelineSection pattern)
    pianoRollScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function SequencerPianoRoll({
    pianoRollScrollRef,
}: SequencerPianoRollProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const pianoRollClipId = useDAWStore(state => state.pianoRollClipId);
    const clips = useDAWStore(state => state.clips);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const closePianoRoll = useDAWStore(state => state.closePianoRoll);
    const setPianoRollScrollLeft = useDAWStore(state => state.setPianoRollScrollLeft);

    // ========================================================================
    // SHARED TIMELINE CALCULATIONS
    // ========================================================================
    const { totalWidth } = useTimelineCalculations();

    // ========================================================================
    // LOCAL UI STATE (not persisted to store)
    // ========================================================================
    // Note: selectedNotes and copiedNotes are now managed in SequencerPianoRollGrid

    // ========================================================================
    // DERIVED STATE: Get clip data
    // ========================================================================
    const clip = pianoRollClipId ? clips.find(c => c.id === pianoRollClipId) : undefined;
    const midiEvents = clip?.type === 'midi' ? (clip.midi_events || []) : [];

    // ========================================================================
    // HANDLERS: Scroll synchronization
    // ========================================================================
    const handlePianoRollScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        setPianoRollScrollLeft(scrollLeft);
    };

    // ========================================================================
    // EMPTY STATES
    // ========================================================================

    // No clip selected
    if (!clip) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center overflow-hidden min-h-0 min-w-0">
                <div className="text-muted-foreground">
                    <Music size={48} className="mx-auto mb-4 opacity-20" />
                    <div className="text-base font-medium mb-1">No MIDI Clip Selected</div>
                    <div className="text-xs text-muted-foreground/70">
                        Double-click a MIDI clip in the timeline above to open it in the piano roll editor.
                    </div>
                </div>
            </div>
        );
    }

    // Invalid clip type (audio clip)
    if (clip.type !== "midi") {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center overflow-hidden min-h-0 min-w-0">
                <div className="text-muted-foreground">
                    <Music size={48} className="mx-auto mb-4 opacity-20" />
                    <div className="text-base font-medium mb-1">Audio Clip Selected</div>
                    <div className="text-xs text-muted-foreground/70">
                        Piano roll only works with MIDI clips. The selected clip is an audio clip.
                    </div>
                </div>
            </div>
        );
    }

    // ========================================================================
    // RENDER: Piano Roll UI
    // ========================================================================

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header - Matches timeline header structure */}
            <div className="border-b border-border bg-muted/20 flex items-center flex-shrink-0 relative">
                {/* Left Column - Fixed (matches piano keyboard width) */}
                <div className="w-64 px-3 py-2 border-r border-border flex-shrink-0 bg-background absolute left-0 top-0 bottom-0 z-10">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Piano Roll
                    </span>
                </div>

                {/* Right Column - Scrollable content area (matches grid) */}
                <div className="flex-1 px-4 py-2 pl-[17rem] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{clip.name}</span>
                        <span className="text-xs text-muted-foreground">
                            {midiEvents.length} {midiEvents.length === 1 ? 'note' : 'notes'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            • Bar {Math.floor(clip.start_time / 4) + 1} • {clip.duration} beats
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Close */}
                        <IconButton
                            icon={X}
                            tooltip="Close Piano Roll"
                            onClick={closePianoRoll}
                            variant="ghost"
                            size="icon-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Piano Roll Content - Grid Layout */}
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
                        <SequencerPianoRollGrid />

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
        </div>
    );
}

