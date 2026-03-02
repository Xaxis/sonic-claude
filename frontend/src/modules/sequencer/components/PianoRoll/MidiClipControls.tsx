/**
 * MidiClipControls - Controls sidebar for the piano roll (Clip tab)
 *
 * Mirrors SampleEditorControls as the fixed left-side panel for MIDI clips.
 * Reads all clip state directly from Zustand.
 *
 * Sections: Transform (Transpose · Velocity · Gate) · Timing (Shift · Quantize)
 *
 * Scroll containment:
 *   The panel lives inside SequencerGridLayout's single scroll container.
 *   The outer div is position:sticky (top:32) so it stays pinned below the ruler.
 *   The inner div fills the exact available panel height (measured via ResizeObserver
 *   on the scroll container), so the panel clips its own content when the panel is
 *   small. A native wheel handler intercepts scroll events with preventDefault so
 *   the outer container never steals scrolls that belong to this panel.
 *
 * Optimistic update pattern (identical to SampleEditorControls):
 *   - Sliders use LOCAL state as source of truth during interaction.
 *     onChange  → setLocal*(v) — instant pixel-perfect feedback.
 *     onCommit  → updateClip(…) fires ONCE on mouseup.
 *   - A useEffect syncs local state from the store on any external change.
 *
 * Rules of Hooks: ALL hooks called before any conditional return.
 */

import { useEffect, useRef, useState } from "react";
import { SectionLabel }  from "@/components/ui/section-label.tsx";
import { ControlRow }    from "@/components/ui/control-row.tsx";
import { useDAWStore }   from "@/stores/dawStore";
import { safeMidiClipDefaults } from "./midiClipUtils";
import {
    MIDI_TRANSPOSE_MIN,    MIDI_TRANSPOSE_MAX,    MIDI_TRANSPOSE_STEP,
    MIDI_VELOCITY_OFFSET_MIN, MIDI_VELOCITY_OFFSET_MAX, MIDI_VELOCITY_OFFSET_STEP,
    MIDI_GATE_MIN,         MIDI_GATE_MAX,         MIDI_GATE_STEP,
    MIDI_TIMING_OFFSET_MIN, MIDI_TIMING_OFFSET_MAX, MIDI_TIMING_OFFSET_STEP,
    MIDI_QUANTIZE_STRENGTH_MIN, MIDI_QUANTIZE_STRENGTH_MAX, MIDI_QUANTIZE_STRENGTH_STEP,
} from "@/config/audio.constants";

// ─── Component ───────────────────────────────────────────────────────────────

/** Height of the corner header / ruler row — used to offset the sticky top. */
const CORNER_HEADER_H = 32;

export function MidiClipControls() {
    // ── Store ──────────────────────────────────────────────────────────────
    const midiEditorClipId = useDAWStore(s => s.midiEditorClipId);
    const clips            = useDAWStore(s => s.clips);
    const updateClip       = useDAWStore(s => s.updateClip);

    const clip = midiEditorClipId ? clips.find(c => c.id === midiEditorClipId) : undefined;

    const {
        midiTranspose,
        midiVelocityOffset,
        midiGate,
        midiTimingOffset,
        midiQuantizeStrength,
    } = safeMidiClipDefaults(clip ?? {});

    // ── Local state — source of truth during slider interaction ────────────
    const [localTranspose,        setLocalTranspose]        = useState(midiTranspose);
    const [localVelocityOffset,   setLocalVelocityOffset]   = useState(midiVelocityOffset);
    const [localGate,             setLocalGate]             = useState(midiGate);
    const [localTimingOffset,     setLocalTimingOffset]     = useState(midiTimingOffset);
    const [localQuantizeStrength, setLocalQuantizeStrength] = useState(midiQuantizeStrength);

    // Sync from store on external changes (new clip selected, AI edit, etc.)
    useEffect(() => {
        setLocalTranspose(midiTranspose);
        setLocalVelocityOffset(midiVelocityOffset);
        setLocalGate(midiGate);
        setLocalTimingOffset(midiTimingOffset);
        setLocalQuantizeStrength(midiQuantizeStrength);
    }, [midiTranspose, midiVelocityOffset, midiGate, midiTimingOffset, midiQuantizeStrength]);

    // ── Scroll containment ─────────────────────────────────────────────────
    // 1. Measure the scroll container's visible height so the inner div can
    //    fill it exactly. When the panel is small, content overflows → inner
    //    div becomes independently scrollable.
    // 2. Intercept wheel events with preventDefault so the outer container
    //    never steals scrolls that the inner div can handle itself.
    const outerRef  = useRef<HTMLDivElement>(null);
    const innerRef  = useRef<HTMLDivElement>(null);
    const [availableH, setAvailableH] = useState(400);

    // Find the nearest overflow:auto ancestor (the SequencerGridLayout scroll
    // container) and track its clientHeight via ResizeObserver.
    useEffect(() => {
        const outer = outerRef.current;
        if (!outer) return;

        // Walk up the DOM to find the scroll container
        let scrollEl: HTMLElement | null = outer.parentElement;
        while (scrollEl) {
            const oy = getComputedStyle(scrollEl).overflowY;
            if (oy === 'auto' || oy === 'scroll') break;
            scrollEl = scrollEl.parentElement;
        }
        if (!scrollEl) return;

        const update = () => {
            setAvailableH((scrollEl as HTMLElement).clientHeight - CORNER_HEADER_H);
        };
        const ro = new ResizeObserver(update);
        ro.observe(scrollEl);
        update();
        return () => ro.disconnect();
    }, []);

    // Wheel event: preventDefault when the inner div can handle the scroll,
    // so the outer single-scroll-container never receives it.
    useEffect(() => {
        const el = innerRef.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            const atTop    = el.scrollTop === 0                                    && e.deltaY < 0;
            const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && e.deltaY > 0;

            if (!atTop && !atBottom) {
                e.preventDefault();
                el.scrollBy({ top: e.deltaY, behavior: 'auto' });
            }
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    // ── Guard — after all hooks ────────────────────────────────────────────
    if (!clip) return null;

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        // Outer: sticky positioning only — no overflow (keeps sticky reliable)
        <div ref={outerRef} style={{ position: 'sticky', top: CORNER_HEADER_H }}>
            {/* Inner: independent scroll container, height = available panel space */}
            <div
                ref={innerRef}
                className="bg-background px-3 py-1.5 overflow-y-auto"
                style={{ height: `${availableH}px` }}
            >
                {/* ── Transform ─── */}
                <SectionLabel withLine spacing>Transform</SectionLabel>
                <ControlRow
                    label="Transpose"
                    value={localTranspose}
                    min={MIDI_TRANSPOSE_MIN} max={MIDI_TRANSPOSE_MAX} step={MIDI_TRANSPOSE_STEP}
                    formatValue={v => `${v >= 0 ? "+" : ""}${v} st`}
                    onChange={setLocalTranspose}
                    onCommit={v => updateClip(clip.id, { midi_transpose: v })}
                    labelWidth="w-20"
                />
                <ControlRow
                    label="Velocity"
                    value={localVelocityOffset}
                    min={MIDI_VELOCITY_OFFSET_MIN} max={MIDI_VELOCITY_OFFSET_MAX} step={MIDI_VELOCITY_OFFSET_STEP}
                    formatValue={v => `${v >= 0 ? "+" : ""}${v}`}
                    onChange={setLocalVelocityOffset}
                    onCommit={v => updateClip(clip.id, { midi_velocity_offset: v })}
                    labelWidth="w-20"
                />
                <ControlRow
                    label="Gate"
                    value={localGate}
                    min={MIDI_GATE_MIN} max={MIDI_GATE_MAX} step={MIDI_GATE_STEP}
                    formatValue={v => `${Math.round(v * 100)}%`}
                    onChange={setLocalGate}
                    onCommit={v => updateClip(clip.id, { midi_gate: v })}
                    labelWidth="w-20"
                />

                {/* ── Timing ─── */}
                <SectionLabel withLine spacing>Timing</SectionLabel>
                <ControlRow
                    label="Shift"
                    value={localTimingOffset}
                    min={MIDI_TIMING_OFFSET_MIN} max={MIDI_TIMING_OFFSET_MAX} step={MIDI_TIMING_OFFSET_STEP}
                    formatValue={v => `${v >= 0 ? "+" : ""}${v.toFixed(2)} b`}
                    onChange={setLocalTimingOffset}
                    onCommit={v => updateClip(clip.id, { midi_timing_offset: v })}
                    labelWidth="w-20"
                />
                <ControlRow
                    label="Quantize"
                    value={localQuantizeStrength}
                    min={MIDI_QUANTIZE_STRENGTH_MIN} max={MIDI_QUANTIZE_STRENGTH_MAX} step={MIDI_QUANTIZE_STRENGTH_STEP}
                    formatValue={v => v === 0 ? "Off" : `${v}%`}
                    onChange={setLocalQuantizeStrength}
                    onCommit={v => updateClip(clip.id, { midi_quantize_strength: v })}
                    labelWidth="w-20"
                />

                {/* ── Info readout ─── */}
                <SectionLabel withLine spacing>Clip Info</SectionLabel>
                <div className="space-y-0.5 pb-1">
                    <div className="flex justify-between text-xs tabular-nums text-muted-foreground/70">
                        <span>Notes</span>
                        <span>{clip.midi_events?.length ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-xs tabular-nums text-muted-foreground/70">
                        <span>Duration</span>
                        <span>{clip.duration} beats</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
