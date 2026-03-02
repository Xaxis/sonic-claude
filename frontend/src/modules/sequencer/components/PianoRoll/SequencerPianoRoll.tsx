/**
 * SequencerPianoRoll - Piano roll MIDI editor (bottom panel)
 *
 * REFACTORED: Self-contained component following Zustand best practices
 * - Reads ALL state from Zustand (no prop drilling)
 * - Composes SequencerGridLayout with keyboard, ruler, and grid
 */

import { useEffect, useState } from "react";
import { X, Music, SlidersHorizontal, Navigation, Piano, Grid3x3 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { EmptyState } from "@/components/ui/empty-state.tsx";
import { EditorTabBar } from "@/components/ui/editor-tab-bar.tsx";
import { SequencerPianoRollKeyboard } from "./SequencerPianoRollKeyboard.tsx";
import { SequencerPianoRollGrid } from "./SequencerPianoRollGrid.tsx";
import { SequencerPianoRollRuler } from "./SequencerPianoRollRuler.tsx";
import { MidiClipControls } from "./MidiClipControls.tsx";
import { SequencerTimelineLoopRegion } from "../Timeline/SequencerTimelineLoopRegion.tsx";
import { SequencerGridLayout } from "../Layouts/SequencerGridLayout.tsx";
import { useDAWStore } from '@/stores/dawStore';
import { useTimelineCalculations } from "../../hooks/useTimelineCalculations.ts";

type PianoRollTab = "keys" | "clip";

const PIANO_ROLL_TABS = [
    { id: "keys" as PianoRollTab, icon: Music,              label: "Keys" },
    { id: "clip" as PianoRollTab, icon: SlidersHorizontal,  label: "Clip" },
];

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
    const closePianoRoll          = useDAWStore(state => state.closePianoRoll);
    const setPianoRollScrollLeft  = useDAWStore(state => state.setPianoRollScrollLeft);
    const setPianoRollScrollRef   = useDAWStore(state => state.setPianoRollScrollRef);
    const followPlayback          = useDAWStore(state => state.pianoRollFollowPlayback);
    const togglePianoRollFollow   = useDAWStore(state => state.togglePianoRollFollow);
    const midiEditorView          = useDAWStore(state => state.midiEditorView);
    const switchMidiEditorView    = useDAWStore(state => state.switchMidiEditorView);

    // ========================================================================
    // EFFECTS: Set scroll ref when component mounts
    // ========================================================================
    useEffect(() => {
        // Register the scroll ref with the store for programmatic scrolling
        setPianoRollScrollRef(pianoRollScrollRef);

        // Cleanup: unregister ref when component unmounts
        return () => {
            setPianoRollScrollRef(null);
        };
    }, [pianoRollScrollRef, setPianoRollScrollRef]);

    // ========================================================================
    // SHARED TIMELINE CALCULATIONS
    // ========================================================================
    const { totalWidth, pixelsPerBeat, zoom } = useTimelineCalculations();

    // ========================================================================
    // LOCAL UI STATE
    // ========================================================================
    const [activeTab, setActiveTab] = useState<PianoRollTab>("keys");

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
            <EmptyState
                icon={<Music size={48} className="opacity-20" />}
                title="No MIDI Clip Selected"
                description="Double-click a MIDI clip in the timeline above to open it in the piano roll editor."
            />
        );
    }

    // Invalid clip type (audio clip)
    if (clip.type !== "midi") {
        return (
            <EmptyState
                icon={<Music size={48} className="opacity-20" />}
                title="Audio Clip Selected"
                description="Piano roll only works with MIDI clips. The selected clip is an audio clip."
            />
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
                    <div className="flex items-center gap-1">
                        {/* View toggle: Keys ↔ Grid */}
                        <IconButton
                            icon={Piano}
                            tooltip="Piano Roll (Keys)"
                            onClick={() => switchMidiEditorView("piano-roll")}
                            variant="ghost"
                            size="icon-sm"
                            active={midiEditorView === "piano-roll"}
                        />
                        <IconButton
                            icon={Grid3x3}
                            tooltip="Step Sequencer (Grid)"
                            onClick={() => switchMidiEditorView("step-sequencer")}
                            variant="ghost"
                            size="icon-sm"
                            active={midiEditorView === "step-sequencer"}
                        />
                        <div className="w-px h-4 bg-border mx-1" />
                        {/* Follow Playback toggle */}
                        <IconButton
                            icon={Navigation}
                            tooltip={followPlayback ? "Follow playback: ON" : "Follow playback: OFF"}
                            onClick={togglePianoRollFollow}
                            variant="ghost"
                            size="icon-sm"
                            active={followPlayback}
                        />
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
                    <EditorTabBar
                        tabs={PIANO_ROLL_TABS}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                    />
                }
                ruler={
                    <SequencerPianoRollRuler />
                }
                sidebar={
                    activeTab === "keys"
                        ? <SequencerPianoRollKeyboard />
                        : <MidiClipControls />
                }
                mainContent={
                    <div className="relative">
                        <SequencerPianoRollGrid />

                        {/* Loop Region - Overlaid on grid */}
                        <SequencerTimelineLoopRegion />

                        {/* Clip boundary overlay - shown when Clip tab is active */}
                        {activeTab === "clip" && (
                            <div className="absolute inset-0 pointer-events-none z-10">
                                {/* Dim area before clip start */}
                                {clip.start_time > 0 && (
                                    <div
                                        className="absolute top-0 bottom-0"
                                        style={{
                                            left: 0,
                                            width: `${clip.start_time * pixelsPerBeat * zoom}px`,
                                            background: 'rgba(0, 0, 0, 0.4)',
                                        }}
                                    />
                                )}
                                {/* Dim area after clip end */}
                                <div
                                    className="absolute top-0 bottom-0"
                                    style={{
                                        left: `${(clip.start_time + clip.duration) * pixelsPerBeat * zoom}px`,
                                        right: 0,
                                        background: 'rgba(0, 0, 0, 0.4)',
                                    }}
                                />
                                {/* Clip start boundary line */}
                                <div
                                    className="absolute top-0 bottom-0 w-px"
                                    style={{
                                        left: `${clip.start_time * pixelsPerBeat * zoom}px`,
                                        background: 'hsl(var(--primary) / 0.9)',
                                        boxShadow: '0 0 6px hsl(var(--primary) / 0.5)',
                                    }}
                                />
                                {/* Clip end boundary line */}
                                <div
                                    className="absolute top-0 bottom-0 w-px"
                                    style={{
                                        left: `${(clip.start_time + clip.duration) * pixelsPerBeat * zoom}px`,
                                        background: 'hsl(var(--primary) / 0.9)',
                                        boxShadow: '0 0 6px hsl(var(--primary) / 0.5)',
                                    }}
                                />
                                {/* Clip region label */}
                                <div
                                    className="absolute top-1 text-xs font-medium text-primary/70 select-none"
                                    style={{
                                        left: `${(clip.start_time + 0.25) * pixelsPerBeat * zoom}px`,
                                    }}
                                >
                                    {clip.name}
                                </div>
                            </div>
                        )}
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

