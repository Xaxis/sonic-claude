/**
 * TrackButton
 *
 * Unified DAW track-control button — replaces both MixerButton and
 * SequencerTrackButton with a single, consistent component.
 *
 * Visual language: solid active colour + coloured glow shadow when active;
 * muted background with border when inactive.  This matches the professional
 * DAW convention used by Ableton, Logic, and Pro Tools.
 *
 * Variants:
 *   mute     — Orange  (M)   DAW-standard mute colour
 *   solo     — Yellow  (S)   DAW-standard solo colour
 *   arm      — Red     (R)   Record-arm
 *   record   — Red     (R)   Actively recording (pulses when active)
 *   monitor  — Green   (Mon) Input monitor
 *   bypass   — Orange  (On/Off) Effect enabled/bypassed (active = enabled = orange)
 *
 * Sizes:
 *   xs       — Compact sequencer row (minimised track header)
 *   sm       — Standard sequencer row (expanded track header)
 *   default  — Mixer channel strip
 *   lg       — Spacious / large layouts
 *
 * The label and title are auto-derived from variant + active state.
 * Pass children to override the label.
 *
 * Usage:
 *   <TrackButton variant="mute"  active={track.is_muted} onClick={handleMute} />
 *   <TrackButton variant="solo"  active={track.is_solo}  onClick={handleSolo} size="sm" bordered />
 *   <TrackButton variant="arm"   active={track.is_armed} onClick={handleArm}  size="xs" />
 *   <TrackButton variant="mute"  active={track.is_muted} onClick={handleMute} className="flex-1" />
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ─── Variant maps ──────────────────────────────────────────────────────────────

const AUTO_LABELS: Record<string, string> = {
    mute:    "M",
    solo:    "S",
    arm:     "R",
    record:  "R",
    monitor: "Mon",
    bypass:  "On",
};

// [inactive label, active label] — only bypass differs from the rest
const AUTO_LABELS_ACTIVE: Partial<Record<string, string>> = {
    bypass: "On",
};
const AUTO_LABELS_INACTIVE: Partial<Record<string, string>> = {
    bypass: "Off",
};

const AUTO_TITLES: Record<string, [inactive: string, active: string]> = {
    mute:    ["Mute",               "Unmute"],
    solo:    ["Solo",               "Unsolo"],
    arm:     ["Arm for recording",  "Disarm"],
    record:  ["Record",             "Stop recording"],
    monitor: ["Enable monitor",     "Disable monitor"],
    bypass:  ["Activate",           "Bypass"],
};

// ─── CVA ──────────────────────────────────────────────────────────────────────

const trackButtonVariants = cva(
    // Base
    "inline-flex items-center justify-center font-bold uppercase tracking-wide rounded transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    {
        variants: {
            // Variant determines the active colour; inactive is uniform across all variants.
            variant: {
                mute:    "",
                solo:    "",
                arm:     "",
                record:  "",
                monitor: "",
                bypass:  "",
            },
            // Active is expressed as a string so compound variants resolve cleanly.
            active: {
                true:  "",
                false: "bg-muted text-muted-foreground hover:bg-muted/80 border border-border",
            },
            size: {
                xs:      "h-5 px-1.5 text-[9px]",
                sm:      "h-6 px-2 text-[10px]",
                default: "h-7 px-2 text-xs",
                lg:      "h-8 px-3 text-xs",
            },
            // Optional visible border when inactive (tighter layouts)
            bordered: {
                true:  "",
                false: "",
            },
        },
        compoundVariants: [
            // ── Active colours ────────────────────────────────────────────────
            { variant: "mute",    active: "true",
              className: "bg-orange-500 text-white shadow-lg shadow-orange-500/50 hover:bg-orange-600" },
            { variant: "solo",    active: "true",
              className: "bg-yellow-500 text-black shadow-lg shadow-yellow-500/50 hover:bg-yellow-600" },
            { variant: "arm",     active: "true",
              className: "bg-red-500 text-white shadow-lg shadow-red-500/50 hover:bg-red-600" },
            { variant: "record",  active: "true",
              className: "bg-red-500 text-white shadow-lg shadow-red-500/50 hover:bg-red-600 animate-pulse" },
            { variant: "monitor", active: "true",
              className: "bg-green-500 text-white shadow-lg shadow-green-500/50 hover:bg-green-600" },
            // bypass active = effect is ON (enabled) = orange
            { variant: "bypass",  active: "true",
              className: "bg-orange-500 text-white shadow-lg shadow-orange-500/50 hover:bg-orange-600" },

            // ── Bordered inactive hover hints ──────────────────────────────────
            { variant: "mute",    bordered: true, active: "false",
              className: "hover:border-orange-500/30" },
            { variant: "solo",    bordered: true, active: "false",
              className: "hover:border-yellow-500/30" },
            { variant: "arm",     bordered: true, active: "false",
              className: "hover:border-red-500/30" },
            { variant: "record",  bordered: true, active: "false",
              className: "hover:border-red-500/30" },
            { variant: "monitor", bordered: true, active: "false",
              className: "hover:border-green-500/30" },
            { variant: "bypass",  bordered: true, active: "false",
              className: "hover:border-orange-500/30" },
        ],
        defaultVariants: {
            variant:  "mute",
            active:   "false",
            size:     "default",
            bordered: false,
        },
    }
);

// ─── Props ────────────────────────────────────────────────────────────────────

export type TrackButtonVariant = "mute" | "solo" | "arm" | "record" | "monitor" | "bypass";
export type TrackButtonSize    = "xs" | "sm" | "default" | "lg";

export interface TrackButtonProps
    extends Omit<React.ComponentProps<"button">, "children"> {
    variant:   TrackButtonVariant;
    active?:   boolean;
    size?:     TrackButtonSize;
    bordered?: boolean;
    /** Override the auto-derived label (M, S, R …) */
    children?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const TrackButton = React.forwardRef<HTMLButtonElement, TrackButtonProps>(
    (
        {
            variant,
            active   = false,
            size     = "default",
            bordered = false,
            className,
            children,
            type = "button",
            title,
            ...props
        },
        ref
    ) => {
        const autoTitle = AUTO_TITLES[variant]?.[active ? 1 : 0];

        return (
            <button
                ref={ref}
                type={type}
                data-slot="track-button"
                data-variant={variant}
                data-active={active}
                title={title ?? autoTitle}
                className={cn(
                    trackButtonVariants({
                        variant,
                        active:   active ? "true" : "false",
                        size,
                        bordered,
                        className,
                    })
                )}
                {...props}
            >
                {children ?? (active
                    ? (AUTO_LABELS_ACTIVE[variant]  ?? AUTO_LABELS[variant])
                    : (AUTO_LABELS_INACTIVE[variant] ?? AUTO_LABELS[variant])
                )}
            </button>
        );
    }
);

TrackButton.displayName = "TrackButton";
