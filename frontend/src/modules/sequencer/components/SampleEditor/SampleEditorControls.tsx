/**
 * SampleEditorControls - Controls sidebar for the sample editor
 *
 * Two-tab design following the same EditorTabBar pattern as SequencerPianoRoll:
 *
 *   Audio tab  (Volume2):  Pitch · Rate · Gain · Reverse
 *   Region tab (Scissors): Fade In/Out · Loop · Loop Region · Trim In/Out · Clip Info
 *
 * The 32px tab bar aligns with SampleEditorRuler to the right.
 * Content below is scrollable.
 *
 * Optimistic update pattern (consistent with rest of app):
 *   - Sliders use LOCAL state as the source of truth during interaction.
 *     onChange  → setLocal*(v) — instant pixel-perfect feedback.
 *     onCommit  → updateClip(…) fires ONCE on mouseup.
 *   - Toggle buttons (Reverse, Loop) call updateClip directly on click.
 *   - A useEffect syncs local state from the store on any external change.
 *
 * Rules of Hooks: ALL hooks called before any conditional return.
 */

import { useEffect, useState } from "react";
import { Volume2, Scissors, RotateCcw, Repeat } from "lucide-react";
import { SectionLabel }  from "@/components/ui/section-label.tsx";
import { ControlRow }    from "@/components/ui/control-row.tsx";
import { FeatureToggle } from "@/components/ui/feature-toggle.tsx";
import { EditorTabBar }  from "@/components/ui/editor-tab-bar.tsx";
import { useDAWStore }   from "@/stores/dawStore";
import { safeClipDefaults, formatTime } from "./sampleEditorUtils";
import { SEQUENCER_SIDEBAR_WIDTH } from "@/config/daw.constants";
import {
    SAMPLE_PITCH_SEMITONES_MIN, SAMPLE_PITCH_SEMITONES_MAX, SAMPLE_PITCH_SEMITONES_STEP,
    SAMPLE_RATE_MIN, SAMPLE_RATE_MAX, SAMPLE_RATE_STEP,
    SAMPLE_GAIN_MIN, SAMPLE_GAIN_MAX, SAMPLE_GAIN_STEP,
    SAMPLE_FADE_MIN, SAMPLE_FADE_MAX_SECONDS, SAMPLE_FADE_STEP,
    SAMPLE_TRIM_STEP,
} from "@/config/audio.constants";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Re-exported for consumers that need to align their layout with the sidebar. */
export const SAMPLE_EDITOR_SIDEBAR_WIDTH = SEQUENCER_SIDEBAR_WIDTH;

type SampleEditorTab = "audio" | "region";

const SAMPLE_EDITOR_TABS = [
    { id: "audio"  as SampleEditorTab, icon: Volume2,  label: "Audio"  },
    { id: "region" as SampleEditorTab, icon: Scissors, label: "Region" },
];

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

    const {
        audioOffset, audioEnd,
        pitchSemitones, playbackRate, gain,
        fadeIn, fadeOut,
        reverse, loopEnabled, loopStart, loopEnd,
    } = safeClipDefaults(clip ?? {} as any);

    // ========================================================================
    // LOCAL STATE — source of truth for sliders during interaction
    // ========================================================================
    const [activeTab,        setActiveTab]        = useState<SampleEditorTab>("audio");
    const [localPitch,       setLocalPitch]       = useState(pitchSemitones);
    const [localRate,        setLocalRate]        = useState(playbackRate);
    const [localGain,        setLocalGain]        = useState(gain);
    const [localFadeIn,      setLocalFadeIn]      = useState(fadeIn);
    const [localFadeOut,     setLocalFadeOut]     = useState(fadeOut);
    const [localLoopStart,   setLocalLoopStart]   = useState(loopStart);
    const [localLoopEnd,     setLocalLoopEnd]     = useState(loopEnd ?? dur);
    const [localAudioOffset, setLocalAudioOffset] = useState(audioOffset);
    const [localAudioEnd,    setLocalAudioEnd]    = useState(audioEnd ?? dur);

    // Sync local state whenever the store changes (new clip selected, AI edit, etc.)
    useEffect(() => {
        setLocalPitch(pitchSemitones);
        setLocalRate(playbackRate);
        setLocalGain(gain);
        setLocalFadeIn(fadeIn);
        setLocalFadeOut(fadeOut);
        setLocalLoopStart(loopStart);
        setLocalLoopEnd(loopEnd ?? dur);
        setLocalAudioOffset(audioOffset);
        setLocalAudioEnd(audioEnd ?? dur);
    }, [pitchSemitones, playbackRate, gain, fadeIn, fadeOut, loopStart, loopEnd, dur, audioOffset, audioEnd]);

    // ========================================================================
    // GUARD — after all hooks
    // ========================================================================
    if (!clip) return null;

    // ========================================================================
    // RENDER
    // ========================================================================
    return (
        <div
            className="flex-shrink-0 border-r border-border flex flex-col bg-background"
            style={{ width: SAMPLE_EDITOR_SIDEBAR_WIDTH }}
        >
            {/* ── Tab bar (32px) — aligns with SampleEditorRuler ── */}
            <div className="h-8 flex-shrink-0 border-b border-border">
                <EditorTabBar
                    tabs={SAMPLE_EDITOR_TABS}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                />
            </div>

            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto px-3 py-1.5 min-h-0">

                {/* ─── Audio tab ─────────────────────────────────────────────── */}
                {activeTab === "audio" && (
                    <>
                        <SectionLabel withLine spacing>Playback</SectionLabel>
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
                            min={SAMPLE_GAIN_MIN} max={SAMPLE_GAIN_MAX} step={SAMPLE_GAIN_STEP}
                            formatValue={v => `${Math.round(v * 100)}%`}
                            onChange={setLocalGain}
                            onCommit={v => updateClip(clip.id, { gain: v })}
                        />

                        <SectionLabel withLine spacing>Modifiers</SectionLabel>
                        <div className="flex gap-1.5 pb-0.5">
                            <FeatureToggle
                                icon={RotateCcw}
                                label="Reverse"
                                active={reverse}
                                color="primary"
                                onClick={() => updateClip(clip.id, { reverse: !reverse })}
                                title="Play sample backwards"
                            />
                        </div>
                    </>
                )}

                {/* ─── Region tab ────────────────────────────────────────────── */}
                {activeTab === "region" && (
                    <>
                        <SectionLabel withLine spacing>Trim</SectionLabel>
                        <ControlRow
                            label="In"
                            value={localAudioOffset}
                            min={0}
                            max={Math.max(localAudioEnd - SAMPLE_TRIM_STEP, 0)}
                            step={SAMPLE_TRIM_STEP}
                            formatValue={v => formatTime(v)}
                            onChange={v => setLocalAudioOffset(Math.min(v, localAudioEnd - SAMPLE_TRIM_STEP))}
                            onCommit={v => updateClip(clip.id, { audio_offset: Math.min(v, (audioEnd ?? dur) - SAMPLE_TRIM_STEP) })}
                        />
                        <ControlRow
                            label="Out"
                            value={localAudioEnd}
                            min={localAudioOffset + SAMPLE_TRIM_STEP}
                            max={dur}
                            step={SAMPLE_TRIM_STEP}
                            formatValue={v => formatTime(v)}
                            onChange={v => setLocalAudioEnd(Math.max(v, localAudioOffset + SAMPLE_TRIM_STEP))}
                            onCommit={v => updateClip(clip.id, { audio_end: Math.max(v, audioOffset + SAMPLE_TRIM_STEP) })}
                        />

                        <SectionLabel withLine spacing>Envelope</SectionLabel>
                        <ControlRow
                            label="Fade In"
                            value={localFadeIn}
                            min={SAMPLE_FADE_MIN} max={SAMPLE_FADE_MAX_SECONDS} step={SAMPLE_FADE_STEP}
                            formatValue={v => `${v.toFixed(2)}s`}
                            onChange={setLocalFadeIn}
                            onCommit={v => updateClip(clip.id, { fade_in: v })}
                        />
                        <ControlRow
                            label="Fade Out"
                            value={localFadeOut}
                            min={SAMPLE_FADE_MIN} max={SAMPLE_FADE_MAX_SECONDS} step={SAMPLE_FADE_STEP}
                            formatValue={v => `${v.toFixed(2)}s`}
                            onChange={setLocalFadeOut}
                            onCommit={v => updateClip(clip.id, { fade_out: v })}
                        />

                        <SectionLabel withLine spacing>Loop</SectionLabel>
                        <div className="flex gap-1.5 pb-0.5">
                            <FeatureToggle
                                icon={Repeat}
                                label="Loop"
                                active={loopEnabled}
                                color="warning"
                                onClick={() => updateClip(clip.id, { loop_enabled: !loopEnabled })}
                                title="Loop sample — drag yellow handles on waveform"
                            />
                        </div>

                        {loopEnabled && (
                            <>
                                <SectionLabel withLine spacing>Loop Region</SectionLabel>
                                <ControlRow
                                    label="Start"
                                    value={localLoopStart}
                                    min={0}
                                    max={Math.max(localLoopEnd - SAMPLE_TRIM_STEP, SAMPLE_TRIM_STEP)}
                                    step={SAMPLE_TRIM_STEP}
                                    formatValue={v => formatTime(v)}
                                    onChange={v => setLocalLoopStart(Math.min(v, localLoopEnd - SAMPLE_TRIM_STEP))}
                                    onCommit={v => updateClip(clip.id, { loop_start: Math.min(v, (loopEnd ?? dur) - SAMPLE_TRIM_STEP) })}
                                />
                                <ControlRow
                                    label="End"
                                    value={localLoopEnd}
                                    min={SAMPLE_TRIM_STEP}
                                    max={dur}
                                    step={SAMPLE_TRIM_STEP}
                                    formatValue={v => formatTime(v)}
                                    onChange={v => setLocalLoopEnd(Math.max(v, localLoopStart + SAMPLE_TRIM_STEP))}
                                    onCommit={v => updateClip(clip.id, { loop_end: Math.max(v, loopStart + SAMPLE_TRIM_STEP) })}
                                />
                            </>
                        )}

                        <SectionLabel withLine spacing>Clip Info</SectionLabel>
                        <div className="space-y-0.5 pb-1">
                            <div className="flex justify-between text-xs tabular-nums text-muted-foreground/70">
                                <span>Duration</span>
                                <span>{dur > 0 ? formatTime(dur) : `${clip.duration}b`}</span>
                            </div>
                            <div className="flex justify-between text-xs tabular-nums text-muted-foreground/70">
                                <span>Active</span>
                                <span>{formatTime((audioEnd ?? dur) - audioOffset)}</span>
                            </div>
                            <div className="flex justify-between text-xs tabular-nums text-muted-foreground/70">
                                <span>Bar</span>
                                <span>{Math.floor(clip.start_time / 4) + 1}</span>
                            </div>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}
