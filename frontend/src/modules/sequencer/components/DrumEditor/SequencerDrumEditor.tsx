/**
 * SequencerDrumEditor — Step-sequencer grid for drum kit tracks
 *
 * Layout:
 *   Header: kit name · step count toggle · Clear button
 *   Pad rows: one row per kit pad (sorted by MIDI note number)
 *             each row = fixed label column + N step cells
 *
 * Data model:
 *   Steps = 16 or 32 (1/16 note = 0.25 beats each)
 *   A step is ON if midi_events contains a note at that beat position (±0.001 tolerance)
 *   Toggle commits immediately via updateClip({ midi_events })
 */

import { useState, useEffect, useMemo } from "react";
import { Drumstick, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDAWStore } from "@/stores/dawStore";
import type { MIDIEvent } from "../../types";

// ─── GM drum name map ────────────────────────────────────────────────────────

const GM_DRUM_NAMES: Record<number, string> = {
    35: "Kick 2",
    36: "Kick",
    37: "Side Stick",
    38: "Snare",
    39: "Clap",
    40: "Snare Tight",
    41: "Floor Tom Lo",
    42: "Hi-Hat",
    43: "Floor Tom Hi",
    44: "Pedal HH",
    45: "Tom Lo",
    46: "Open HH",
    47: "Tom Mid-Lo",
    48: "Tom Mid-Hi",
    49: "Crash",
    50: "Tom Hi",
    51: "Ride",
    54: "Tambourine",
    55: "Splash",
    56: "Cowbell",
    60: "Bongo Hi",
    61: "Bongo Lo",
    64: "Conga Lo",
    65: "Timbale Hi",
    66: "Timbale Lo",
    69: "Shaker",
    70: "Maracas",
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function midiNoteToName(note: number): string {
    const octave = Math.floor(note / 12) - 1;
    return `${NOTE_NAMES[note % 12]}${octave}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_SIZE = 0.25; // 1/16 note in beats
const LABEL_WIDTH = 128; // px — matches SEQUENCER_SIDEBAR_WIDTH feel

// ─── DrumPadRow ───────────────────────────────────────────────────────────────

interface DrumPadRowProps {
    padNote: number;
    label: string;
    stepCount: number;
    activeSteps: Set<number>;
    onToggle: (stepIndex: number) => void;
}

function DrumPadRow({ padNote, label, stepCount, activeSteps, onToggle }: DrumPadRowProps) {
    return (
        <div className="flex items-center border-b border-border/20 hover:bg-muted/5 group">
            {/* Pad label */}
            <div
                className="flex-shrink-0 flex items-center gap-1.5 px-2 border-r border-border/30"
                style={{ width: LABEL_WIDTH }}
            >
                <span className="text-[10px] font-mono text-muted-foreground/60 w-5 text-right flex-shrink-0">
                    {padNote}
                </span>
                <span className="text-xs text-foreground/80 truncate leading-none">
                    {label}
                </span>
            </div>

            {/* Step cells */}
            <div className="flex items-center flex-1">
                {Array.from({ length: stepCount }, (_, i) => {
                    const isActive = activeSteps.has(i);
                    // Beat group: every 4 steps gets a right divider
                    const isBeatBoundary = i % 4 === 3 && i < stepCount - 1;
                    return (
                        <button
                            key={i}
                            onClick={() => onToggle(i)}
                            className={cn(
                                "h-7 flex-1 min-w-0 transition-colors",
                                isActive
                                    ? "bg-primary/80 hover:bg-primary shadow-[0_0_6px_rgba(0,200,200,0.4)]"
                                    : "bg-muted/20 hover:bg-muted/40",
                                isBeatBoundary && "border-r border-border/40",
                                // Slight accent on beats 1 and 3 (steps 0 and 8)
                                (i === 0 || i === 8) && !isActive && "bg-muted/30",
                            )}
                            title={`${label} — step ${i + 1}`}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// ─── SequencerDrumEditor ──────────────────────────────────────────────────────

export function SequencerDrumEditor() {
    const clipId     = useDAWStore((s) => s.drumEditorClipId);
    const tracks     = useDAWStore((s) => s.tracks);
    const clips      = useDAWStore((s) => s.clips);
    const updateClip = useDAWStore((s) => s.updateClip);
    const closeDrumEditor = useDAWStore((s) => s.closeDrumEditor);

    // Clips are stored flat in the store (not nested inside tracks)
    const clip = useMemo(
        () => clips.find((c) => c.id === clipId) ?? null,
        [clips, clipId],
    );
    const track = useMemo(
        () => tracks.find((t) => t.id === clip?.track_id) ?? null,
        [tracks, clip?.track_id],
    );
    const kit = track?.kit;

    // Local MIDI events (optimistic)
    const [localNotes, setLocalNotes] = useState<MIDIEvent[]>([]);
    const [stepCount, setStepCount] = useState<16 | 32>(16);

    // Sync from store when clip changes
    useEffect(() => {
        setLocalNotes(clip?.midi_events ?? []);
        // Auto-size: if clip is longer than 4 beats, default to 32 steps
        if (clip && clip.duration > 4) setStepCount(32);
        else setStepCount(16);
    }, [clip?.id]);

    // Build sorted pad list from kit
    const pads = useMemo(() => {
        if (!kit) return [];
        return Object.keys(kit)
            .map(Number)
            .sort((a, b) => a - b)
            .map((note) => ({
                note,
                label: GM_DRUM_NAMES[note] ?? `Note ${note}`,
            }));
    }, [kit]);

    // Per-pad active step sets (precomputed for O(1) lookup in render)
    const activeStepsByPad = useMemo(() => {
        const map = new Map<number, Set<number>>();
        for (const n of localNotes) {
            const stepIndex = Math.round(n.start_time / STEP_SIZE);
            if (!map.has(n.note)) map.set(n.note, new Set());
            map.get(n.note)!.add(stepIndex);
        }
        return map;
    }, [localNotes]);

    // Toggle a step
    const handleToggle = (padNote: number, stepIndex: number) => {
        if (!clipId) return;
        const t = stepIndex * STEP_SIZE;
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
                    duration: STEP_SIZE,
                    velocity: 100,
                    channel: 1,
                },
            ];
        }
        setLocalNotes(next);
        updateClip(clipId, { midi_events: next });
    };

    // Clear all notes
    const handleClear = () => {
        if (!clipId) return;
        setLocalNotes([]);
        updateClip(clipId, { midi_events: [] });
    };

    if (!clip || !kit || pads.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/20">
                <Drumstick size={40} className="text-muted-foreground/20 mb-3" />
                <div className="text-sm font-medium text-muted-foreground/60">No drum kit loaded</div>
                <div className="text-xs text-muted-foreground/40 mt-1">
                    Select a kit track clip to edit its pattern.
                </div>
            </div>
        );
    }

    const kitName = track?.name ?? "Drum Track";
    const noteCount = localNotes.length;

    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border/40 flex-shrink-0 bg-muted/10">
                <Drumstick size={13} className="text-muted-foreground/50 flex-shrink-0" />
                <span className="text-xs font-medium text-foreground/80 flex-1 truncate">
                    {kitName}
                </span>
                <span className="text-[10px] text-muted-foreground/40">
                    {noteCount} note{noteCount !== 1 ? "s" : ""}
                </span>

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

                {/* Clear button */}
                <button
                    onClick={handleClear}
                    className="text-[10px] text-muted-foreground/40 hover:text-destructive transition-colors px-1.5 py-0.5 rounded hover:bg-destructive/10"
                    title="Clear all steps"
                >
                    Clear
                </button>

                {/* Close */}
                <button
                    onClick={closeDrumEditor}
                    className="text-muted-foreground/40 hover:text-foreground transition-colors"
                    title="Close drum editor"
                >
                    <X size={13} />
                </button>
            </div>

            {/* ── Beat ruler ─────────────────────────────────────────────── */}
            <div className="flex border-b border-border/30 flex-shrink-0 bg-muted/5">
                {/* Offset for label column */}
                <div className="flex-shrink-0 border-r border-border/30" style={{ width: LABEL_WIDTH }} />
                {/* Beat numbers */}
                <div className="flex flex-1">
                    {Array.from({ length: stepCount / 4 }, (_, beat) => (
                        <div
                            key={beat}
                            className="flex-1 text-center text-[9px] text-muted-foreground/40 font-mono py-0.5 border-r border-border/20 last:border-r-0"
                        >
                            {beat + 1}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Pad rows ───────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {pads.map(({ note, label }) => (
                    <DrumPadRow
                        key={note}
                        padNote={note}
                        label={label}
                        stepCount={stepCount}
                        activeSteps={activeStepsByPad.get(note) ?? new Set()}
                        onToggle={(stepIndex) => handleToggle(note, stepIndex)}
                    />
                ))}
            </div>

        </div>
    );
}
