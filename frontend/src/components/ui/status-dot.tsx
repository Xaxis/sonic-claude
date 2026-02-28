/**
 * StatusDot — Animated colored indicator dot for playback / record / connection state.
 *
 * Used in transport timers, recording indicators, engine status, clip state, etc.
 *
 * Statuses:
 *   playing   — red,   pulse animation  (transport is running)
 *   paused    — yellow, static          (transport is paused)
 *   recording — red,   fast pulse       (actively recording)
 *   active    — primary (cyan), pulse   (something is enabled/live)
 *   idle      — muted, static           (stopped / inactive)
 *
 * Sizes:
 *   sm      — 4px  (w-1  h-1)   ultra-compact rows
 *   default — 6px  (w-1.5 h-1.5)  standard toolbar/timer use
 *   lg      — 8px  (w-2  h-2)   prominent indicators
 *
 * Usage:
 *   <StatusDot status="playing" />
 *   <StatusDot status="paused" size="lg" />
 *   <StatusDot status={isPlaying ? "playing" : isPaused ? "paused" : "idle"} />
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatusDotStatus = "playing" | "paused" | "recording" | "active" | "idle";

const DOT_CLASSES: Record<StatusDotStatus, string> = {
    playing:   "bg-red-500 animate-pulse",
    paused:    "bg-yellow-400",
    recording: "bg-red-500 animate-[pulse_0.5s_ease-in-out_infinite]",
    active:    "bg-primary animate-pulse",
    idle:      "bg-muted-foreground/25",
};

const SIZE_CLASSES = {
    sm:      "w-1 h-1",
    default: "w-1.5 h-1.5",
    lg:      "w-2 h-2",
} as const;

export interface StatusDotProps {
    status:    StatusDotStatus;
    size?:     keyof typeof SIZE_CLASSES;
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatusDot({ status, size = "default", className }: StatusDotProps) {
    return (
        <span
            aria-label={status}
            className={cn(
                "rounded-full flex-shrink-0 transition-colors duration-200",
                SIZE_CLASSES[size],
                DOT_CLASSES[status],
                className,
            )}
        />
    );
}
