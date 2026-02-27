/**
 * SampleEditorControls - Controls sidebar for the sample editor
 *
 * Mirrors SequencerPianoRollKeyboard as the fixed left-side panel.
 * Reads all clip state directly from Zustand — only receives fileDuration
 * (derived from the audio file, not stored in Zustand).
 *
 * Sections: Playback · Envelope · Modifiers · Loop Region · Trim readout
 *
 * Optimistic update pattern (consistent with rest of app):
 *   - Sliders use LOCAL state as the source of truth during interaction.
 *     onValueChange → setLocal*(v) for immediate pixel-perfect feedback.
 *     onValueCommit → updateClip(…) fires ONCE on mouseup.
 *     updateClip does an optimistic store update instantly, then syncs backend.
 *   - Toggle buttons (Reverse, Loop) call updateClip directly on click
 *     (single action, no drag involved).
 *   - A useEffect syncs local state from the store whenever an external
 *     change arrives (e.g. AI assistant edits the clip).
 *
 * Rules of Hooks: ALL hooks are called before any conditional return.
 */

import { useEffect, useState } from "react";
import { RotateCcw, Repeat } from "lucide-react";
import { Slider } from "@/components/ui/slider.tsx";
import { useDAWStore } from "@/stores/dawStore";
import { safeClipDefaults } from "./sampleEditorUtils";
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
    /** Called on every frame during drag — updates local state only */
    onChange: (v: number) => void;
    /** Called once on mouseup — commits to backend via updateClip */
    onCommit: (v: number) => void;
}
function ControlRow({ label, value, min, max, step, formatValue, onChange, onCommit }: ControlRowProps) {
    return (
        <div className="flex items-center gap-2 py-1">
            <span className="text-xs text-muted-foreground/80 w-14 flex-shrink-0 select-none">{label}</span>
            <Slider
                value={[value]}
                onValueChange={([v]) => onChange(v)}
                onValueCommit={([v]) => onCommit(v)}
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
    // STORE STATE — all hooks unconditionally at the top
    // ========================================================================
    const sampleEditorClipId = useDAWStore(s => s.sampleEditorClipId);
    const clips              = useDAWStore(s => s.clips);
    const updateClip         = useDAWStore(s => s.updateClip);

    const clip = sampleEditorClipId ? clips.find(c => c.id === sampleEditorClipId) : undefined;

    // Derive current values from the store (safe defaults when clip is undefined)
    const {
        audioOffset, audioEnd,
        pitchSemitones, playbackRate, gain,
        fadeIn, fadeOut,
        reverse, loopEnabled, loopStart, loopEnd,
    } = safeClipDefaults(clip ?? {} as any);

    // ========================================================================
    // LOCAL STATE — source of truth for sliders during interaction.
    //
    // Initialized from the store; synced back via useEffect when the store
    // changes externally (different clip selected, AI edit, etc.).
    // During a drag the local value leads the store by one frame — the slider
    // is instant and updateClip fires only once on mouseup (onValueCommit).
    // ========================================================================
    const [localPitch,     setLocalPitch]     = useState(pitchSemitones);
    const [localRate,      setLocalRate]      = useState(playbackRate);
    const [localGain,      setLocalGain]      = useState(gain);
    const [localFadeIn,    setLocalFadeIn]    = useState(fadeIn);
    const [localFadeOut,   setLocalFadeOut]   = useState(fadeOut);
    const [localLoopStart, setLocalLoopStart] = useState(loopStart);
    const [localLoopEnd,   setLocalLoopEnd]   = useState(loopEnd ?? dur);

    // Sync local state whenever the store changes (new clip or external edit).
    // Safe to run on all store value changes: if the change was triggered by
    // our own onValueCommit, local state is already at that value → no-op.
    useEffect(() => {
        setLocalPitch(pitchSemitones);
        setLocalRate(playbackRate);
        setLocalGain(gain);
        setLocalFadeIn(fadeIn);
        setLocalFadeOut(fadeOut);
        setLocalLoopStart(loopStart);
        setLocalLoopEnd(loopEnd ?? dur);
    }, [pitchSemitones, playbackRate, gain, fadeIn, fadeOut, loopStart, loopEnd, dur]);

    // ========================================================================
    // GUARD — after all hooks
    // ========================================================================
    if (!clip) return null;

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
                value={localPitch}
                min={SAMPLE_PITCH_SEMITONES_MIN} max={SAMPLE_PITCH_SEMITONES_MAX} step={SAMPLE_PITCH_SEMITONES_STEP}
                formatValue={v => `${v >= 0 ? "+" : ""}${v.toFixed(1)} st`}
                onChange={setLocalPitch}
                onCommit={v => updateClip(clip.id, { pitch_semitones: v })}
            />
            <ControlRow
                label="Rate"
                value={localRate}
                min={SAMPLE_RATE_MIN} max={SAMPLE_RATE_MAX} step={SAMPLE_RATE_STEP}
                formatValue={v => `${v.toFixed(2)}×`}
                onChange={setLocalRate}
                onCommit={v => updateClip(clip.id, { playback_rate: v })}
            />
            <ControlRow
                label="Gain"
                value={localGain}
                min={0} max={SAMPLE_GAIN_MAX} step={SAMPLE_GAIN_STEP}
                formatValue={v => `${Math.round(v * 100)}%`}
                onChange={setLocalGain}
                onCommit={v => updateClip(clip.id, { gain: v })}
            />

            {/* ── Envelope ─── */}
            <SectionDivider label="Envelope" />
            <ControlRow
                label="Fade In"
                value={localFadeIn}
                min={0} max={SAMPLE_FADE_MAX_SECONDS} step={SAMPLE_FADE_STEP}
                formatValue={v => `${v.toFixed(2)}s`}
                onChange={setLocalFadeIn}
                onCommit={v => updateClip(clip.id, { fade_in: v })}
            />
            <ControlRow
                label="Fade Out"
                value={localFadeOut}
                min={0} max={SAMPLE_FADE_MAX_SECONDS} step={SAMPLE_FADE_STEP}
                formatValue={v => `${v.toFixed(2)}s`}
                onChange={setLocalFadeOut}
                onCommit={v => updateClip(clip.id, { fade_out: v })}
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
                        value={localLoopStart}
                        min={0}
                        max={Math.max(dur - 0.01, 0.01)}
                        step={0.01}
                        formatValue={v => `${v.toFixed(2)}s`}
                        onChange={v => setLocalLoopStart(Math.min(v, localLoopEnd - 0.01))}
                        onCommit={v => updateClip(clip.id, { loop_start: Math.min(v, (loopEnd ?? dur) - 0.01) })}
                    />
                    <ControlRow
                        label="End"
                        value={localLoopEnd}
                        min={0.01}
                        max={Math.max(dur, 0.02)}
                        step={0.01}
                        formatValue={v => `${v.toFixed(2)}s`}
                        onChange={v => setLocalLoopEnd(Math.max(v, localLoopStart + 0.01))}
                        onCommit={v => updateClip(clip.id, { loop_end: Math.max(v, loopStart + 0.01) })}
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
