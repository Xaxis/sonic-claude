/**
 * SampleEditorControls - Controls sidebar for the sample editor
 *
 * Mirrors SequencerPianoRollKeyboard as the fixed left-side panel.
 * Reads all clip state directly from Zustand — only receives fileDuration
 * (derived from the audio file, not stored in Zustand).
 *
 * Sections: Playback · Envelope · Modifiers · Loop Region · Trim readout
 */

import { useCallback } from "react";
import { RotateCcw, Repeat } from "lucide-react";
import { Slider } from "@/components/ui/slider.tsx";
import { useDAWStore } from "@/stores/dawStore";
import { safeClipDefaults, debounce } from "./sampleEditorUtils";
import { SEQUENCER_SIDEBAR_WIDTH } from "@/config/daw.constants";
import {
    SAMPLE_PITCH_SEMITONES_MIN,
    SAMPLE_PITCH_SEMITONES_MAX,
    SAMPLE_PITCH_SEMITONES_STEP,
    SAMPLE_RATE_MIN,
    SAMPLE_RATE_MAX,
    SAMPLE_RATE_STEP,
    SAMPLE_GAIN_MAX,
    SAMPLE_GAIN_STEP,
    SAMPLE_FADE_MAX_SECONDS,
    SAMPLE_FADE_STEP,
} from "@/config/audio.constants";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Re-exported for consumers that need to align their layout with the sidebar. */
export const SAMPLE_EDITOR_SIDEBAR_WIDTH = SEQUENCER_SIDEBAR_WIDTH;

// ============================================================================
// INTERNAL SUB-COMPONENTS
// ============================================================================

interface SectionDividerProps { label: string }
function SectionDivider({ label }: SectionDividerProps) {
    return (
        <div className="flex items-center gap-2 pt-2 pb-1">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/40 select-none whitespace-nowrap">
                {label}
            </span>
            <div className="flex-1 h-px bg-border/40" />
        </div>
    );
}

interface ControlRowProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    formatValue: (v: number) => string;
    onChange: (v: number) => void;
}
function ControlRow({ label, value, min, max, step, formatValue, onChange }: ControlRowProps) {
    return (
        <div className="flex items-center gap-2 py-1">
            <span className="text-xs text-muted-foreground/80 w-14 flex-shrink-0 select-none">{label}</span>
            <Slider
                value={[value]}
                onValueChange={([v]) => onChange(v)}
                min={min}
                max={max}
                step={step}
                className="flex-1 min-w-0"
            />
            <span className="text-xs tabular-nums text-muted-foreground w-14 text-right flex-shrink-0 select-none">
                {formatValue(value)}
            </span>
        </div>
    );
}

interface ToggleButtonProps {
    active: boolean;
    activeClass: string;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    title: string;
}
function ToggleButton({ active, activeClass, onClick, icon, label, title }: ToggleButtonProps) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={[
                "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border transition-colors select-none flex-1 justify-center",
                active
                    ? activeClass
                    : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground",
            ].join(" ")}
        >
            {icon}
            {label}
        </button>
    );
}

// ============================================================================
// COMPONENT
// ============================================================================

interface SampleEditorControlsProps {
    /** Actual audio file duration in seconds (from useWaveformData). */
    fileDuration: number;
}

export function SampleEditorControls({ fileDuration: dur }: SampleEditorControlsProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const sampleEditorClipId = useDAWStore(s => s.sampleEditorClipId);
    const clips              = useDAWStore(s => s.clips);
    const updateClip         = useDAWStore(s => s.updateClip);

    // ========================================================================
    // DERIVED STATE: Get clip and its audio-edit params
    // ========================================================================
    const clip = sampleEditorClipId ? clips.find(c => c.id === sampleEditorClipId) : undefined;

    if (!clip) return null;

    const {
        audioOffset, audioEnd,
        pitchSemitones, playbackRate, gain,
        fadeIn, fadeOut,
        reverse, loopEnabled, loopStart, loopEnd,
    } = safeClipDefaults(clip);

    // ========================================================================
    // ACTIONS: Debounced updateClip for sliders (avoids API call flood)
    // ========================================================================
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedUpdate = useCallback(
        debounce((updates: Parameters<typeof updateClip>[1]) => {
            updateClip(clip.id, updates);
        }, 250),
        [clip.id, updateClip],
    );

    // ========================================================================
    // RENDER
    // ========================================================================
    return (
        <div
            className="flex-shrink-0 border-r border-border overflow-y-auto bg-background px-3 py-1.5 flex flex-col"
            style={{ width: SAMPLE_EDITOR_SIDEBAR_WIDTH }}
        >
            {/* ── Playback ─── */}
            <SectionDivider label="Playback" />
            <ControlRow
                label="Pitch"
                value={pitchSemitones}
                min={SAMPLE_PITCH_SEMITONES_MIN} max={SAMPLE_PITCH_SEMITONES_MAX} step={SAMPLE_PITCH_SEMITONES_STEP}
                formatValue={v => `${v >= 0 ? "+" : ""}${v.toFixed(1)} st`}
                onChange={v => debouncedUpdate({ pitch_semitones: v })}
            />
            <ControlRow
                label="Rate"
                value={playbackRate}
                min={SAMPLE_RATE_MIN} max={SAMPLE_RATE_MAX} step={SAMPLE_RATE_STEP}
                formatValue={v => `${v.toFixed(2)}×`}
                onChange={v => debouncedUpdate({ playback_rate: v })}
            />
            <ControlRow
                label="Gain"
                value={gain}
                min={0} max={SAMPLE_GAIN_MAX} step={SAMPLE_GAIN_STEP}
                formatValue={v => `${Math.round(v * 100)}%`}
                onChange={v => debouncedUpdate({ gain: v })}
            />

            {/* ── Envelope ─── */}
            <SectionDivider label="Envelope" />
            <ControlRow
                label="Fade In"
                value={fadeIn}
                min={0} max={SAMPLE_FADE_MAX_SECONDS} step={SAMPLE_FADE_STEP}
                formatValue={v => `${v.toFixed(2)}s`}
                onChange={v => debouncedUpdate({ fade_in: v })}
            />
            <ControlRow
                label="Fade Out"
                value={fadeOut}
                min={0} max={SAMPLE_FADE_MAX_SECONDS} step={SAMPLE_FADE_STEP}
                formatValue={v => `${v.toFixed(2)}s`}
                onChange={v => debouncedUpdate({ fade_out: v })}
            />

            {/* ── Modifiers ─── */}
            <SectionDivider label="Modifiers" />
            <div className="flex gap-1.5 pb-0.5">
                <ToggleButton
                    active={reverse}
                    activeClass="bg-primary/20 border-primary text-primary"
                    onClick={() => updateClip(clip.id, { reverse: !reverse })}
                    icon={<RotateCcw size={11} />}
                    label="Reverse"
                    title="Play sample backwards"
                />
                <ToggleButton
                    active={loopEnabled}
                    activeClass="bg-yellow-500/20 border-yellow-500 text-yellow-400"
                    onClick={() => updateClip(clip.id, { loop_enabled: !loopEnabled })}
                    icon={<Repeat size={11} />}
                    label="Loop"
                    title="Loop sample — drag yellow handles on waveform"
                />
            </div>

            {/* ── Loop Region (conditional) ─── */}
            {loopEnabled && (
                <>
                    <SectionDivider label="Loop Region" />
                    <ControlRow
                        label="Start"
                        value={loopStart}
                        min={0}
                        max={Math.max(dur - 0.01, 0.01)}
                        step={0.01}
                        formatValue={v => `${v.toFixed(2)}s`}
                        onChange={v => debouncedUpdate({ loop_start: Math.min(v, (loopEnd ?? dur) - 0.01) })}
                    />
                    <ControlRow
                        label="End"
                        value={loopEnd ?? dur}
                        min={0.01}
                        max={Math.max(dur, 0.02)}
                        step={0.01}
                        formatValue={v => `${v.toFixed(2)}s`}
                        onChange={v => debouncedUpdate({ loop_end: Math.max(v, loopStart + 0.01) })}
                    />
                </>
            )}

            {/* ── Trim readout ─── */}
            <SectionDivider label="Trim" />
            <div className="space-y-0.5 pb-1">
                <div className="flex justify-between text-xs tabular-nums text-muted-foreground/70">
                    <span>In</span>
                    <span>{audioOffset.toFixed(3)}s</span>
                </div>
                <div className="flex justify-between text-xs tabular-nums text-muted-foreground/70">
                    <span>Out</span>
                    <span>{audioEnd != null ? `${audioEnd.toFixed(3)}s` : "full"}</span>
                </div>
                {dur > 0 && (
                    <div className="flex justify-between text-xs tabular-nums text-muted-foreground/40 pt-0.5">
                        <span>Active</span>
                        <span>{((audioEnd ?? dur) - audioOffset).toFixed(3)}s / {dur.toFixed(3)}s</span>
                    </div>
                )}
            </div>

            {/* Push remaining space down */}
            <div className="flex-1" />
        </div>
    );
}
