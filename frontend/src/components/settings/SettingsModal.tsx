/**
 * SettingsModal - Unified app settings
 *
 * Two-column layout:
 *   Left (160px):  Section navigation (icon + label)
 *   Right (flex-1): Section content
 *
 * State ownership:
 *   settingsStore → metronome, autosave, inline AI, note defaults,
 *                   scroll-follows-playhead
 *   dawStore      → snap, gridSize, showMeters, meterMode, numClipSlots,
 *                   launchQuantization
 *   layoutStore   → (no settings surfaced here; sidebar state is in the sidebar)
 *
 * Keyboard shortcut: ⌘, / Ctrl+, (registered in Header.tsx)
 */

import { useState, useEffect } from "react";
import {
    LayoutGrid,
    Music2,
    Music,
    SlidersHorizontal,
    Sparkles,
    Save,
    Command,
    X,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { useDAWStore } from "@/stores/dawStore";

// ============================================================================
// SECTION REGISTRY
// ============================================================================

type SectionId =
    | "sequencer"
    | "playback"
    | "notes"
    | "mixer"
    | "ai"
    | "autosave"
    | "shortcuts";

interface SectionDef {
    id: SectionId;
    label: string;
    icon: React.ComponentType<LucideProps>;
}

const SECTIONS: SectionDef[] = [
    { id: "sequencer",  label: "Sequencer",    icon: LayoutGrid },
    { id: "playback",   label: "Playback",      icon: Music2 },
    { id: "notes",      label: "MIDI Notes",    icon: Music },
    { id: "mixer",      label: "Mixer",         icon: SlidersHorizontal },
    { id: "ai",         label: "AI Assistant",  icon: Sparkles },
    { id: "autosave",   label: "Auto-save",     icon: Save },
    { id: "shortcuts",  label: "Shortcuts",     icon: Command },
];

// ============================================================================
// REUSABLE SETTING CONTROLS
// ============================================================================

/** A row with a label + optional description on the left, a control on the right. */
function SettingRow({
    label,
    description,
    children,
}: {
    label: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-6 py-3.5 border-b border-border/30 last:border-0">
            <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">{label}</div>
                {description && (
                    <div className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed">
                        {description}
                    </div>
                )}
            </div>
            <div className="flex-shrink-0 flex items-center">{children}</div>
        </div>
    );
}

/** Section heading — separates groups within a section. */
function SettingGroup({ title }: { title: string }) {
    return (
        <div className="flex items-center gap-2 pt-5 pb-1 first:pt-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {title}
            </span>
            <div className="flex-1 h-px bg-border/30" />
        </div>
    );
}

/** Accessible toggle switch. */
function SettingToggle({
    checked,
    onCheckedChange,
    disabled = false,
}: {
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onCheckedChange(!checked)}
            className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full",
                "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                checked ? "bg-primary" : "bg-muted/80",
                disabled && "opacity-40 cursor-not-allowed",
            )}
        >
            <span
                className="inline-block h-4 w-4 rounded-full bg-background shadow transition-transform duration-200"
                style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
            />
        </button>
    );
}

/** Styled native <select>. */
function SettingSelect<T extends string | number>({
    value,
    onChange,
    options,
    className,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
    className?: string;
}) {
    return (
        <select
            value={value as string}
            onChange={(e) => {
                const raw = e.target.value;
                // Preserve numeric type if the original value was a number
                const coerced = typeof value === "number" ? Number(raw) : raw;
                onChange(coerced as T);
            }}
            className={cn(
                "bg-background border border-border/60 rounded px-2.5 py-1.5",
                "text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40",
                "cursor-pointer",
                className,
            )}
        >
            {options.map((opt) => (
                <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}

/** Segmented button group for mutually exclusive options. */
function SettingSegment<T extends string>({
    value,
    onChange,
    options,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
}) {
    return (
        <div className="flex rounded border border-border/60 overflow-hidden">
            {options.map((opt, i) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        "px-3 py-1.5 text-xs font-medium transition-colors",
                        i > 0 && "border-l border-border/60",
                        opt.value === value
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                    )}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

// ============================================================================
// SECTION CONTENT COMPONENTS
// ============================================================================

function SequencerSection() {
    const snapEnabled   = useDAWStore(s => s.snapEnabled);
    const gridSize      = useDAWStore(s => s.gridSize);
    const setSnapEnabled  = useDAWStore(s => s.setSnapEnabled);
    const setGridSize     = useDAWStore(s => s.setGridSize);

    const scrollFollowsPlayhead    = useSettingsStore(s => s.scrollFollowsPlayhead);
    const setScrollFollowsPlayhead = useSettingsStore(s => s.setScrollFollowsPlayhead);

    return (
        <div>
            <SettingGroup title="Grid" />
            <SettingRow label="Snap to Grid" description="Snap clips and notes to the grid when moving or drawing.">
                <SettingToggle checked={snapEnabled} onCheckedChange={setSnapEnabled} />
            </SettingRow>
            <SettingRow label="Grid Size" description="Subdivisions per beat used for snapping and visual grid lines.">
                <SettingSelect
                    value={gridSize}
                    onChange={setGridSize}
                    options={[
                        { value: 1,  label: "1 bar"    },
                        { value: 2,  label: "1/2"      },
                        { value: 4,  label: "1/4"      },
                        { value: 8,  label: "1/8"      },
                        { value: 16, label: "1/16"     },
                        { value: 32, label: "1/32"     },
                    ]}
                    className="w-24"
                />
            </SettingRow>

            <SettingGroup title="Playhead" />
            <SettingRow
                label="Scroll Follows Playhead"
                description="Automatically scroll the timeline to keep the playhead in view during playback."
            >
                <SettingToggle
                    checked={scrollFollowsPlayhead}
                    onCheckedChange={setScrollFollowsPlayhead}
                />
            </SettingRow>
        </div>
    );
}

function PlaybackSection() {
    const metronomeVolume    = useSettingsStore(s => s.metronomeVolume);
    const setMetronomeVolume = useSettingsStore(s => s.setMetronomeVolume);

    const numClipSlots       = useDAWStore(s => s.numClipSlots);
    const launchQuantization = useDAWStore(s => s.launchQuantization);
    const setNumClipSlots       = useDAWStore(s => s.setNumClipSlots);
    const setLaunchQuantization = useDAWStore(s => s.setLaunchQuantization);

    return (
        <div>
            <SettingGroup title="Metronome" />
            <SettingRow label="Metronome Volume" description="Click volume during playback. Takes effect immediately.">
                <div className="flex items-center gap-3 w-44">
                    <Slider
                        value={[metronomeVolume * 100]}
                        onValueChange={([v]) => setMetronomeVolume(v / 100)}
                        onValueCommit={([v]) => setMetronomeVolume(v / 100)}
                        min={0}
                        max={100}
                        step={5}
                        className="flex-1"
                    />
                    <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
                        {Math.round(metronomeVolume * 100)}%
                    </span>
                </div>
            </SettingRow>

            <SettingGroup title="Clip Launcher" />
            <SettingRow label="Scene Count" description="Number of clip slots (scenes) per track in the Clip Launcher.">
                <SettingSelect
                    value={numClipSlots}
                    onChange={setNumClipSlots}
                    options={[
                        { value: 4,  label: "4 scenes"  },
                        { value: 8,  label: "8 scenes"  },
                        { value: 16, label: "16 scenes" },
                        { value: 32, label: "32 scenes" },
                    ]}
                    className="w-28"
                />
            </SettingRow>
            <SettingRow
                label="Launch Quantization"
                description="Quantize clip triggering to the nearest rhythmic value."
            >
                <SettingSelect
                    value={launchQuantization}
                    onChange={setLaunchQuantization}
                    options={[
                        { value: "none", label: "None" },
                        { value: "1/4",  label: "1/4"  },
                        { value: "1/2",  label: "1/2"  },
                        { value: "1",    label: "1 bar" },
                        { value: "2",    label: "2 bars"},
                        { value: "4",    label: "4 bars"},
                    ]}
                    className="w-24"
                />
            </SettingRow>
        </div>
    );
}

function NotesSection() {
    const defaultNoteVelocity    = useSettingsStore(s => s.defaultNoteVelocity);
    const defaultNoteDuration    = useSettingsStore(s => s.defaultNoteDuration);
    const setDefaultNoteVelocity = useSettingsStore(s => s.setDefaultNoteVelocity);
    const setDefaultNoteDuration = useSettingsStore(s => s.setDefaultNoteDuration);

    return (
        <div>
            <SettingGroup title="New Note Defaults" />
            <SettingRow label="Default Velocity" description="Velocity applied to notes drawn in the Piano Roll.">
                <div className="flex items-center gap-3 w-44">
                    <Slider
                        value={[defaultNoteVelocity]}
                        onValueChange={([v]) => setDefaultNoteVelocity(v)}
                        onValueCommit={([v]) => setDefaultNoteVelocity(v)}
                        min={1}
                        max={127}
                        step={1}
                        className="flex-1"
                    />
                    <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
                        {defaultNoteVelocity}
                    </span>
                </div>
            </SettingRow>
            <SettingRow
                label="Default Duration"
                description="Duration of notes drawn with the pencil tool in the Piano Roll."
            >
                <SettingSelect
                    value={defaultNoteDuration}
                    onChange={setDefaultNoteDuration}
                    options={[
                        { value: 0.0625, label: "1/16" },
                        { value: 0.125,  label: "1/8"  },
                        { value: 0.25,   label: "1/4"  },
                        { value: 0.5,    label: "1/2"  },
                        { value: 1,      label: "1 bar" },
                    ]}
                    className="w-24"
                />
            </SettingRow>
        </div>
    );
}

function MixerSection() {
    const showMeters  = useDAWStore(s => s.showMeters);
    const meterMode   = useDAWStore(s => s.meterMode);
    const setShowMeters  = useDAWStore(s => s.setShowMeters);
    const setMeterMode   = useDAWStore(s => s.setMeterMode);

    return (
        <div>
            <SettingGroup title="Level Meters" />
            <SettingRow label="Show Meters" description="Display level meters in the Mixer panel.">
                <SettingToggle checked={showMeters} onCheckedChange={setShowMeters} />
            </SettingRow>
            <SettingRow
                label="Meter Display"
                description="Choose which level values are shown in the channel meters."
            >
                <SettingSegment<"peak" | "rms" | "both">
                    value={meterMode}
                    onChange={setMeterMode}
                    options={[
                        { value: "peak", label: "Peak" },
                        { value: "rms",  label: "RMS"  },
                        { value: "both", label: "Both" },
                    ]}
                />
            </SettingRow>
        </div>
    );
}

// ── Quick Command editor ──────────────────────────────────────────────────────
function QuickCommandEditor() {
    const aiQuickCommands    = useSettingsStore(s => s.aiQuickCommands);
    const setAIQuickCommands = useSettingsStore(s => s.setAIQuickCommands);

    const updateCommand = (idx: number, field: "label" | "prompt", value: string) => {
        const next = aiQuickCommands.map((cmd, i) =>
            i === idx ? { ...cmd, [field]: value } : cmd
        );
        setAIQuickCommands(next);
    };

    const removeCommand = (idx: number) => {
        setAIQuickCommands(aiQuickCommands.filter((_, i) => i !== idx));
    };

    const addCommand = () => {
        if (aiQuickCommands.length >= 8) return;
        setAIQuickCommands([...aiQuickCommands, { label: "New Command", prompt: "" }]);
    };

    return (
        <div className="space-y-2">
            {aiQuickCommands.map((cmd, idx) => (
                <div key={idx} className="flex items-start gap-2">
                    <input
                        type="text"
                        value={cmd.label}
                        onChange={e => updateCommand(idx, "label", e.target.value)}
                        placeholder="Label"
                        className="w-24 flex-shrink-0 bg-background border border-border/60 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <input
                        type="text"
                        value={cmd.prompt}
                        onChange={e => updateCommand(idx, "prompt", e.target.value)}
                        placeholder="Prompt sent to AI…"
                        className="flex-1 min-w-0 bg-background border border-border/60 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <button
                        onClick={() => removeCommand(idx)}
                        className="flex-shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors px-1 py-1 text-xs"
                        title="Remove"
                    >
                        ✕
                    </button>
                </div>
            ))}
            {aiQuickCommands.length < 8 && (
                <button
                    onClick={addCommand}
                    className="text-xs text-primary/70 hover:text-primary transition-colors"
                >
                    + Add command
                </button>
            )}
        </div>
    );
}

function AISection() {
    // Model & Intelligence
    const aiExecutionModel    = useSettingsStore(s => s.aiExecutionModel);
    const aiCreativity        = useSettingsStore(s => s.aiCreativity);
    const aiResponseStyle     = useSettingsStore(s => s.aiResponseStyle);
    const setAIExecutionModel = useSettingsStore(s => s.setAIExecutionModel);
    const setAICreativity     = useSettingsStore(s => s.setAICreativity);
    const setAIResponseStyle  = useSettingsStore(s => s.setAIResponseStyle);

    // Context & Memory
    const aiHistoryLength          = useSettingsStore(s => s.aiHistoryLength);
    const aiIncludeHarmonicContext = useSettingsStore(s => s.aiIncludeHarmonicContext);
    const aiIncludeRhythmicContext = useSettingsStore(s => s.aiIncludeRhythmicContext);
    const aiIncludeTimbreContext   = useSettingsStore(s => s.aiIncludeTimbreContext);
    const setAIHistoryLength           = useSettingsStore(s => s.setAIHistoryLength);
    const setAIIncludeHarmonicContext  = useSettingsStore(s => s.setAIIncludeHarmonicContext);
    const setAIIncludeRhythmicContext  = useSettingsStore(s => s.setAIIncludeRhythmicContext);
    const setAIIncludeTimbreContext    = useSettingsStore(s => s.setAIIncludeTimbreContext);

    // Behavior
    const aiAutoPlayAfterChanges  = useSettingsStore(s => s.aiAutoPlayAfterChanges);
    const aiUseIntentRouting      = useSettingsStore(s => s.aiUseIntentRouting);
    const setAIAutoPlayAfterChanges = useSettingsStore(s => s.setAIAutoPlayAfterChanges);
    const setAIUseIntentRouting     = useSettingsStore(s => s.setAIUseIntentRouting);

    // Inline AI
    const inlineAIEnabled       = useSettingsStore(s => s.inlineAIEnabled);
    const inlineAILongPressDelay = useSettingsStore(s => s.inlineAILongPressDelay);
    const setInlineAIEnabled        = useSettingsStore(s => s.setInlineAIEnabled);
    const setInlineAILongPressDelay = useSettingsStore(s => s.setInlineAILongPressDelay);

    // Transparency
    const aiShowRoutingIntent  = useSettingsStore(s => s.aiShowRoutingIntent);
    const aiShowMusicalContext = useSettingsStore(s => s.aiShowMusicalContext);
    const setAIShowRoutingIntent  = useSettingsStore(s => s.setAIShowRoutingIntent);
    const setAIShowMusicalContext = useSettingsStore(s => s.setAIShowMusicalContext);

    // Local state for creativity slider
    const [localCreativity, setLocalCreativity] = useState(aiCreativity);
    useEffect(() => { setLocalCreativity(aiCreativity); }, [aiCreativity]);

    return (
        <div>
            {/* ── Model & Intelligence ──────────────────────────────── */}
            <SettingGroup title="Model & Intelligence" />

            <SettingRow
                label="Execution Model"
                description="Which Claude model processes your requests. Haiku is fastest; Opus is most capable."
            >
                <div className="flex rounded border border-border/60 overflow-hidden">
                    {(["haiku", "sonnet", "opus"] as const).map((m, i) => (
                        <button
                            key={m}
                            onClick={() => setAIExecutionModel(m)}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium transition-colors",
                                i > 0 && "border-l border-border/60",
                                aiExecutionModel === m
                                    ? "bg-primary/15 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                            )}
                        >
                            {m === "haiku" ? "Haiku" : m === "sonnet" ? "Sonnet" : "Opus"}
                        </button>
                    ))}
                </div>
            </SettingRow>

            {/* Model speed/capability hint */}
            <div className="mb-2 flex justify-between text-[10px] text-muted-foreground/40 px-0.5">
                <span>← Fastest / cheapest</span>
                <span>Most capable / creative →</span>
            </div>

            <SettingRow
                label="Creativity"
                description="Controls how exploratory and surprising the AI is. Low = precise and reliable. High = unexpected and experimental."
            >
                <div className="flex items-center gap-3 w-44">
                    <Slider
                        value={[localCreativity * 100]}
                        onValueChange={([v]) => setLocalCreativity(v / 100)}
                        onValueCommit={([v]) => setAICreativity(v / 100)}
                        min={0}
                        max={100}
                        step={5}
                        className="flex-1"
                    />
                    <span className="text-xs tabular-nums text-muted-foreground w-14 text-right">
                        {localCreativity < 0.3 ? "Precise" : localCreativity > 0.7 ? "Creative" : "Balanced"}
                    </span>
                </div>
            </SettingRow>

            <SettingRow
                label="Response Style"
                description="How much the AI explains what it's doing. Concise = just act; Detailed = full reasoning."
            >
                <SettingSegment<"concise" | "balanced" | "detailed">
                    value={aiResponseStyle}
                    onChange={setAIResponseStyle}
                    options={[
                        { value: "concise",  label: "Concise"  },
                        { value: "balanced", label: "Balanced" },
                        { value: "detailed", label: "Detailed" },
                    ]}
                />
            </SettingRow>

            {/* ── Context & Memory ──────────────────────────────────── */}
            <SettingGroup title="Context & Memory" />

            <SettingRow
                label="Conversation Memory"
                description="How many recent messages the AI remembers. More = better continuity but more tokens."
            >
                <SettingSelect
                    value={aiHistoryLength}
                    onChange={setAIHistoryLength}
                    options={[
                        { value: 2,  label: "2 messages" },
                        { value: 4,  label: "4 messages" },
                        { value: 6,  label: "6 messages" },
                        { value: 10, label: "10 messages" },
                        { value: 20, label: "20 messages" },
                    ]}
                    className="w-32"
                />
            </SettingRow>

            <SettingRow
                label="Harmonic Analysis"
                description="Include chord progressions, key and scale detection in the AI context. Helpful for melodic/harmonic tasks."
            >
                <SettingToggle checked={aiIncludeHarmonicContext} onCheckedChange={setAIIncludeHarmonicContext} />
            </SettingRow>

            <SettingRow
                label="Rhythmic Analysis"
                description="Include groove patterns, syncopation and timing data in the AI context. Helpful for drum and rhythm tasks."
            >
                <SettingToggle checked={aiIncludeRhythmicContext} onCheckedChange={setAIIncludeRhythmicContext} />
            </SettingRow>

            <SettingRow
                label="Timbral Analysis"
                description="Include audio energy, brightness and loudness data in the AI context. Helps with mix and texture decisions."
            >
                <SettingToggle checked={aiIncludeTimbreContext} onCheckedChange={setAIIncludeTimbreContext} />
            </SettingRow>

            {/* ── Behavior ──────────────────────────────────────────── */}
            <SettingGroup title="Behavior" />

            <SettingRow
                label="Auto-play After Changes"
                description="Automatically start playback after the AI makes compositional changes so you hear the result immediately."
            >
                <SettingToggle checked={aiAutoPlayAfterChanges} onCheckedChange={setAIAutoPlayAfterChanges} />
            </SettingRow>

            <SettingRow
                label="Intent-based Routing"
                description="Route requests to the best-fit tool set for each intent (recommended). Disable to always load all tools — slower but maximally flexible."
            >
                <SettingToggle checked={aiUseIntentRouting} onCheckedChange={setAIUseIntentRouting} />
            </SettingRow>

            {/* ── Inline AI ─────────────────────────────────────────── */}
            <SettingGroup title="Inline AI Prompts" />

            <SettingRow
                label="Inline AI Enabled"
                description="Show the AI editing popover when long-pressing clips, tracks, or mixer channels."
            >
                <SettingToggle checked={inlineAIEnabled} onCheckedChange={setInlineAIEnabled} />
            </SettingRow>

            <SettingRow
                label="Long-press Delay"
                description="How long to hold before the inline AI popover appears."
                // Dimmed when disabled
            >
                <div className={cn("flex items-center gap-3 w-44", !inlineAIEnabled && "opacity-40 pointer-events-none")}>
                    <Slider
                        value={[inlineAILongPressDelay]}
                        onValueChange={([v]) => setInlineAILongPressDelay(v)}
                        onValueCommit={([v]) => setInlineAILongPressDelay(v)}
                        min={250}
                        max={1500}
                        step={50}
                        className="flex-1"
                    />
                    <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">
                        {inlineAILongPressDelay}ms
                    </span>
                </div>
            </SettingRow>

            {/* ── Transparency ──────────────────────────────────────── */}
            <SettingGroup title="Transparency" />

            <SettingRow
                label="Show Routing Intent"
                description="Display a badge in each AI response showing the detected intent (Create, Modify, Effects…)."
            >
                <SettingToggle checked={aiShowRoutingIntent} onCheckedChange={setAIShowRoutingIntent} />
            </SettingRow>

            <SettingRow
                label="Show Musical Context"
                description="Add an expandable panel to each AI response showing the full DAW state that was sent to the model. Useful for debugging or learning."
            >
                <SettingToggle checked={aiShowMusicalContext} onCheckedChange={setAIShowMusicalContext} />
            </SettingRow>

            {/* ── Quick Commands ────────────────────────────────────── */}
            <SettingGroup title="Quick Commands" />
            <div className="py-2">
                <p className="text-xs text-muted-foreground/60 mb-3 leading-relaxed">
                    One-click prompt buttons shown at the top of the chat panel. Up to 8 commands.
                </p>
                <QuickCommandEditor />
            </div>
        </div>
    );
}

function AutosaveSection() {
    const autosaveEnabled    = useSettingsStore(s => s.autosaveEnabled);
    const autosaveIntervalMs = useSettingsStore(s => s.autosaveIntervalMs);
    const setAutosaveEnabled    = useSettingsStore(s => s.setAutosaveEnabled);
    const setAutosaveIntervalMs = useSettingsStore(s => s.setAutosaveIntervalMs);

    return (
        <div>
            <SettingGroup title="History Snapshots" />
            <SettingRow
                label="Auto-save History"
                description="Periodically create undo/redo history points. The composition is always saved to disk after every change."
            >
                <SettingToggle checked={autosaveEnabled} onCheckedChange={setAutosaveEnabled} />
            </SettingRow>
            <SettingRow
                label="Snapshot Interval"
                description="How often to create an undo history snapshot while working."
            >
                <SettingSelect
                    value={autosaveIntervalMs}
                    onChange={setAutosaveIntervalMs}
                    options={[
                        { value: 30_000,  label: "30 seconds" },
                        { value: 60_000,  label: "1 minute"   },
                        { value: 120_000, label: "2 minutes"  },
                        { value: 300_000, label: "5 minutes"  },
                    ]}
                    className="w-28"
                    // Disable when autosave is off
                />
            </SettingRow>
        </div>
    );
}

const SHORTCUTS: Array<{ key: string; description: string }> = [
    { key: "⌘Z / Ctrl+Z",     description: "Undo" },
    { key: "⌘⇧Z / Ctrl+⇧Z",   description: "Redo" },
    { key: "⌘, / Ctrl+,",     description: "Open Settings" },
    { key: "⌘X / Ctrl+X",     description: "Toggle X-Ray Mode" },
    { key: "Space",            description: "Play / Pause" },
];

function ShortcutsSection() {
    return (
        <div>
            <SettingGroup title="Global Shortcuts" />
            <div className="space-y-0.5">
                {SHORTCUTS.map(({ key, description }) => (
                    <div
                        key={key}
                        className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0"
                    >
                        <span className="text-sm text-foreground">{description}</span>
                        <kbd className="text-[10px] font-mono bg-muted/50 border border-border/50 text-muted-foreground rounded px-2 py-0.5">
                            {key}
                        </kbd>
                    </div>
                ))}
            </div>
            <div className="mt-4 p-3 rounded bg-muted/20 border border-border/30">
                <p className="text-xs text-muted-foreground/70 leading-relaxed">
                    Keyboard shortcut customization is not yet available. Shortcuts listed above
                    are fixed.
                </p>
            </div>
        </div>
    );
}

// Map section ID to its content component
const SECTION_CONTENT: Record<SectionId, React.ComponentType> = {
    sequencer: SequencerSection,
    playback:  PlaybackSection,
    notes:     NotesSection,
    mixer:     MixerSection,
    ai:        AISection,
    autosave:  AutosaveSection,
    shortcuts: ShortcutsSection,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface SettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
    const [activeSection, setActiveSection] = useState<SectionId>("sequencer");

    const SectionContent = SECTION_CONTENT[activeSection];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="p-0 gap-0 overflow-hidden border-border/60"
                style={{ maxWidth: 800, height: "min(88vh, 740px)" }}
                showCloseButton={false}
            >
                <div className="flex h-full">
                    {/* ── Left: Section navigation ──────────────────────── */}
                    <div className="w-44 border-r border-border/50 bg-muted/10 flex flex-col flex-shrink-0 overflow-y-auto">
                        {/* Modal title */}
                        <div className="px-3 pt-4 pb-3 border-b border-border/30">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                Settings
                            </span>
                        </div>

                        {/* Section list */}
                        <nav className="flex flex-col gap-0.5 p-2 flex-1">
                            {SECTIONS.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={cn(
                                        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left",
                                        activeSection === section.id
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                                    )}
                                >
                                    <section.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>{section.label}</span>
                                </button>
                            ))}
                        </nav>

                        {/* Keyboard shortcut hint at the bottom */}
                        <div className="px-3 pb-3 pt-2 border-t border-border/30">
                            <kbd className="text-[9px] font-mono text-muted-foreground/40">⌘,</kbd>
                        </div>
                    </div>

                    {/* ── Right: Section content ─────────────────────────── */}
                    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                        {/* Section header */}
                        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/30 flex-shrink-0">
                            <div className="flex items-center gap-2.5">
                                {(() => {
                                    const section = SECTIONS.find(s => s.id === activeSection)!;
                                    return (
                                        <>
                                            <section.icon className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-semibold">{section.label}</span>
                                        </>
                                    );
                                })()}
                            </div>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted/30"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Section body */}
                        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                            <SectionContent />
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
