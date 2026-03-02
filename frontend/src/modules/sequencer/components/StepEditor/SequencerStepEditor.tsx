/**
 * SequencerStepEditor — Step-sequencer grid using SequencerGridLayout
 *
 * Layout:
 *   Header: track name · view toggle · step count · clear · close
 *   Grid: sticky-left pad labels + fixed-width step cells + sticky-top beat ruler
 *
 * Architecture: Uses SequencerGridLayout (single scroll container, position:sticky)
 * so pad labels and the beat ruler stay visible during both horizontal and
 * vertical scroll.  Each step cell has a fixed width (STEP_EDITOR_CELL_WIDTH)
 * so 32-step patterns scroll horizontally on narrow panels rather than squishing.
 * Velocity is visualised as a partial-fill bar inside each active cell.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Drumstick, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDAWStore } from "@/stores/dawStore";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { EmptyState } from "@/components/ui/empty-state.tsx";
import { MidiEditorViewToggle } from "../Shared/MidiEditorViewToggle.tsx";
import { SequencerGridLayout } from "../Layouts/SequencerGridLayout.tsx";
import type { MIDIEvent } from "../../types";
import {
    STEP_EDITOR_LABEL_WIDTH,
    STEP_EDITOR_STEP_SIZE,
    STEP_EDITOR_CELL_WIDTH,
    STEP_EDITOR_ROW_HEIGHT,
} from "@/config/daw.constants";
import { GM_DRUM_NAMES, midiNoteToName } from "@/config/midi.constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepPad {
    note: number;
    label: string;
}

// ─── StepPadLabels ─────────────────────────────────────────────────────────

function StepPadLabels({ pads }: { pads: StepPad[] }) {
    return (
        <div>
            {pads.map(({ note, label }) => (
                <div
                    key={note}
                    className="flex items-center gap-1.5 px-2 border-b border-border/20 hover:bg-muted/5"
                    style={{ height: STEP_EDITOR_ROW_HEIGHT }}
                >
                    <span className="text-[10px] font-mono text-muted-foreground/50 w-5 text-right flex-shrink-0">
                        {note}
                    </span>
                    <span className="text-xs text-foreground/80 truncate leading-none">
                        {label}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── StepRuler ───────────────────────────────────────────────────────────────

function StepRuler({ stepCount, cellWidth }: { stepCount: number; cellWidth: number }) {
    const beatCount = stepCount / 4;
    return (
        <div className="flex h-full">
            {Array.from({ length: beatCount }, (_, beat) => (
                <div
                    key={beat}
                    className="flex items-center justify-center text-[9px] text-muted-foreground/50 font-mono border-r border-border/20 last:border-r-0 flex-shrink-0"
                    style={{ width: cellWidth * 4 }}
                >
                    {beat + 1}
                </div>
            ))}
        </div>
    );
}

// ─── StepGrid ─────────────────────────────────────────────────────────────────

interface StepGridProps {
    pads: StepPad[];
    stepCount: number;
    cellWidth: number;
    activeStepsByPad: Map<number, Set<number>>;
    velocityByPad: Map<number, Map<number, number>>;
    onToggle: (note: number, stepIndex: number) => void;
}

function StepGrid({
    pads,
    stepCount,
    cellWidth,
    activeStepsByPad,
    velocityByPad,
    onToggle,
}: StepGridProps) {
    return (
        <div>
            {pads.map(({ note }) => (
                <div
                    key={note}
                    className="flex border-b border-border/20"
                    style={{ height: STEP_EDITOR_ROW_HEIGHT }}
                >
                    {Array.from({ length: stepCount }, (_, i) => {
                        const isActive = activeStepsByPad.get(note)?.has(i) ?? false;
                        const velocity = isActive
                            ? (velocityByPad.get(note)?.get(i) ?? 100)
                            : 0;
                        const velocityFill = `${Math.round((velocity / 127) * 100)}%`;
                        // Beat grouping: every 4 steps = 1 beat; beats 1 and 3 (step 0, 8, 16, 24) are accented
                        const isBeatBoundary = i % 4 === 3 && i < stepCount - 1;
                        const isDownbeat = i % (stepCount / 2) === 0;

                        return (
                            <button
                                key={i}
                                onClick={() => onToggle(note, i)}
                                className={cn(
                                    "relative flex-shrink-0 transition-colors",
                                    isActive
                                        ? "bg-primary/80 hover:bg-primary shadow-[inset_0_0_6px_rgba(0,200,200,0.3)]"
                                        : cn(
                                            "hover:bg-muted/40",
                                            isDownbeat ? "bg-muted/30" : "bg-muted/20",
                                        ),
                                    isBeatBoundary && "border-r border-border/40",
                                )}
                                style={{ width: cellWidth }}
                                title={`${note} — step ${i + 1}${isActive ? ` (vel ${velocity})` : ""}`}
                            >
                                {/* Velocity fill — climbs from the bottom of the cell */}
                                {isActive && (
                                    <div
                                        className="absolute bottom-0 left-px right-px bg-white/25 rounded-t-[1px] pointer-events-none"
                                        style={{ height: velocityFill }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

// ─── SequencerStepEditor ─────────────────────────────────────────────────────

export function SequencerStepEditor() {
    const clipId          = useDAWStore((s) => s.midiEditorClipId);
    const tracks          = useDAWStore((s) => s.tracks);
    const clips           = useDAWStore((s) => s.clips);
    const updateClip      = useDAWStore((s) => s.updateClip);
    const closeMidiEditor = useDAWStore((s) => s.closeMidiEditor);

    const scrollRef = useRef<HTMLDivElement>(null);

    const clip  = useMemo(() => clips.find((c) => c.id === clipId) ?? null, [clips, clipId]);
    const track = useMemo(() => tracks.find((t) => t.id === clip?.track_id) ?? null, [tracks, clip?.track_id]);
    const kit   = track?.kit;

    const [localNotes, setLocalNotes] = useState<MIDIEvent[]>([]);
    const [stepCount, setStepCount]   = useState<16 | 32>(16);

    useEffect(() => {
        setLocalNotes(clip?.midi_events ?? []);
        setStepCount(clip && clip.duration > 4 ? 32 : 16);
    }, [clip?.id]);

    // Build sorted pad list from kit definition, or derive from clip notes
    const pads = useMemo<StepPad[]>(() => {
        if (kit && Object.keys(kit).length > 0) {
            return Object.keys(kit)
                .map(Number)
                .sort((a, b) => a - b)
                .map((note) => ({ note, label: GM_DRUM_NAMES[note] ?? `Note ${note}` }));
        }
        // Instrument track — derive rows from unique pitches in clip, descending
        const uniqueNotes = [...new Set(localNotes.map((n) => n.note))].sort((a, b) => b - a);
        return uniqueNotes.map((note) => ({ note, label: midiNoteToName(note) }));
    }, [kit, localNotes]);

    // Pre-compute active step index sets and velocity maps per pad for O(1) render
    const activeStepsByPad = useMemo(() => {
        const map = new Map<number, Set<number>>();
        for (const n of localNotes) {
            const idx = Math.round(n.start_time / STEP_EDITOR_STEP_SIZE);
            if (!map.has(n.note)) map.set(n.note, new Set());
            map.get(n.note)!.add(idx);
        }
        return map;
    }, [localNotes]);

    const velocityByPad = useMemo(() => {
        const map = new Map<number, Map<number, number>>();
        for (const n of localNotes) {
            const idx = Math.round(n.start_time / STEP_EDITOR_STEP_SIZE);
            if (!map.has(n.note)) map.set(n.note, new Map());
            map.get(n.note)!.set(idx, n.velocity);
        }
        return map;
    }, [localNotes]);

    const handleToggle = useCallback(
        (padNote: number, stepIndex: number) => {
            if (!clipId) return;
            const t = stepIndex * STEP_EDITOR_STEP_SIZE;
            const isActive = activeStepsByPad.get(padNote)?.has(stepIndex) ?? false;
            let next: MIDIEvent[];
            if (isActive) {
                next = localNotes.filter(
                    (n) => !(n.note === padNote && Math.abs(n.start_time - t) < 0.001),
                );
            } else {
                next = [
                    ...localNotes,
                    {
                        note: padNote,
                        note_name: midiNoteToName(padNote),
                        start_time: t,
                        duration: STEP_EDITOR_STEP_SIZE,
                        velocity: 100,
                        channel: 1,
                    },
                ];
            }
            setLocalNotes(next);
            updateClip(clipId, { midi_events: next });
        },
        [clipId, localNotes, activeStepsByPad, updateClip],
    );

    const handleClear = () => {
        if (!clipId) return;
        setLocalNotes([]);
        updateClip(clipId, { midi_events: [] });
    };

    // SequencerGridLayout requires an onScroll handler; step editor doesn't need sync
    const noopScroll = useCallback((_e: React.UIEvent<HTMLDivElement>) => {}, []);

    if (!clip) {
        return (
            <EmptyState
                icon={<Drumstick size={40} className="opacity-20" />}
                title="No MIDI Clip Selected"
                description="Click a MIDI clip in the timeline to open it in the step editor."
            />
        );
    }

    const contentWidth = stepCount * STEP_EDITOR_CELL_WIDTH;
    const trackName    = track?.name ?? "MIDI Track";
    const noteCount    = localNotes.length;

    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40 flex-shrink-0 bg-muted/10">
                <Drumstick size={13} className="text-muted-foreground/50 flex-shrink-0" />
                <span className="text-xs font-medium text-foreground/80 flex-1 truncate">
                    {trackName}
                </span>
                <span className="text-[10px] text-muted-foreground/40">
                    {noteCount} note{noteCount !== 1 ? "s" : ""}
                </span>

                {/* View toggle: Keys ↔ Grid */}
                <MidiEditorViewToggle />

                <div className="w-px h-4 bg-border mx-1" />

                {/* Step count toggle */}
                <div className="flex items-center gap-0.5 bg-muted/20 rounded p-0.5">
                    {([16, 32] as const).map((n) => (
                        <button
                            key={n}
                            onClick={() => setStepCount(n)}
                            className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono transition-colors",
                                stepCount === n
                                    ? "bg-primary/20 text-primary"
                                    : "text-muted-foreground/50 hover:text-foreground/70",
                            )}
                        >
                            {n}
                        </button>
                    ))}
                </div>

                {/* Clear */}
                <button
                    onClick={handleClear}
                    className="text-[10px] text-muted-foreground/40 hover:text-destructive transition-colors px-1.5 py-0.5 rounded hover:bg-destructive/10"
                    title="Clear all steps"
                >
                    Clear
                </button>

                {/* Close */}
                <IconButton
                    icon={X}
                    tooltip="Close editor"
                    onClick={closeMidiEditor}
                    variant="ghost"
                    size="icon-sm"
                />
            </div>

            {/* ── Grid ─────────────────────────────────────────────────── */}
            {pads.length === 0 ? (
                <EmptyState
                    icon={<Drumstick size={32} className="opacity-20" />}
                    title="No notes in clip"
                    description="Switch to Piano Roll to add notes, then return to the step grid."
                />
            ) : (
                <SequencerGridLayout
                    cornerHeader={
                        <div className="flex items-center justify-center h-full">
                            <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wide">
                                Beat
                            </span>
                        </div>
                    }
                    ruler={
                        <StepRuler stepCount={stepCount} cellWidth={STEP_EDITOR_CELL_WIDTH} />
                    }
                    sidebar={<StepPadLabels pads={pads} />}
                    mainContent={
                        <StepGrid
                            pads={pads}
                            stepCount={stepCount}
                            cellWidth={STEP_EDITOR_CELL_WIDTH}
                            activeStepsByPad={activeStepsByPad}
                            velocityByPad={velocityByPad}
                            onToggle={handleToggle}
                        />
                    }
                    sidebarWidth={STEP_EDITOR_LABEL_WIDTH}
                    headerHeight={STEP_EDITOR_ROW_HEIGHT}
                    contentWidth={contentWidth}
                    scrollRef={scrollRef}
                    onScroll={noopScroll}
                />
            )}
        </div>
    );
}
