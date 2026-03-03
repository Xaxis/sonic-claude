/**
 * ControlRow
 *
 * Horizontal label + slider + value readout, the standard layout for any
 * continuously-adjustable parameter in a sidebar or settings column.
 *
 * Pattern (left → right):
 *   [label]  ─────────[slider]─────────  [value]
 *
 * Optimistic update contract (matches the rest of the app):
 *   onChange  — fires on every pointer move (updates local state for instant feedback)
 *   onCommit  — fires once on pointer-up   (calls store action / backend sync)
 *
 * When only `onChange` is provided it is used for both live feedback and commit
 * (suitable for non-optimistic callers such as inline sliders in expanded rows).
 *
 * Props:
 *   label        — Parameter name shown on the left
 *   value        — Current numeric value (controlled)
 *   min / max / step  — Slider range
 *   formatValue  — Formats the number into a display string (e.g. "+2.5 st", "75%")
 *   onChange     — Called on every frame during drag
 *   onCommit     — Called once on mouseup (optional; falls back to onChange)
 *   labelWidth   — Tailwind w-* class for the label column (default "w-14")
 *   valueWidth   — Tailwind w-* class for the value column (default "w-14")
 *   disabled     — Dims the row and disables interaction
 *
 * Usage:
 *   <ControlRow
 *     label="Pitch"
 *     value={localPitch}
 *     min={-24} max={24} step={0.1}
 *     formatValue={v => `${v >= 0 ? "+" : ""}${v.toFixed(1)} st`}
 *     onChange={setLocalPitch}
 *     onCommit={v => updateClip(clip.id, { pitch_semitones: v })}
 *   />
 *
 *   // Non-optimistic (single callback):
 *   <ControlRow
 *     label="Vol"
 *     value={track.volume * 100}
 *     min={0} max={200} step={1}
 *     formatValue={v => `${Math.round(v)}%`}
 *     onChange={v => handleUpdateVolume(v / 100)}
 *   />
 */

import * as React from "react";
import { Slider }          from "@/components/ui/slider.tsx";
import { NumericScrubber } from "@/components/ui/numeric-scrubber";
import { cn }              from "@/lib/utils";

export interface ControlRowProps {
    label:       string;
    value:       number;
    min:         number;
    max:         number;
    step:        number;
    formatValue: (v: number) => string;
    onChange:    (v: number) => void;
    onCommit?:   (v: number) => void;
    labelWidth?: string;
    valueWidth?: string;
    disabled?:   boolean;
    className?:  string;
}

export function ControlRow({
    label,
    value,
    min,
    max,
    step,
    formatValue,
    onChange,
    onCommit,
    labelWidth = "w-14",
    valueWidth = "w-14",
    disabled   = false,
    className,
}: ControlRowProps) {
    return (
        <div
            className={cn(
                "flex items-center gap-2 py-1",
                disabled && "opacity-50 pointer-events-none",
                className
            )}
        >
            <span className={cn("flex-shrink-0 select-none text-xs text-muted-foreground/80", labelWidth)}>
                {label}
            </span>

            <Slider
                value={[value]}
                onValueChange={([v]) => onChange(v)}
                onValueCommit={([v]) => (onCommit ?? onChange)(v)}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                className="flex-1 min-w-0"
            />

            <NumericScrubber
                value={value}
                onChange={onChange}
                onCommit={onCommit}
                min={min}
                max={max}
                step={step}
                formatValue={formatValue}
                emphasis="accent"
                size="xs"
                align="right"
                className={cn("flex-shrink-0", valueWidth)}
            />
        </div>
    );
}
