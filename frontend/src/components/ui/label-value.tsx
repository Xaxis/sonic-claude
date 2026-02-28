/**
 * LabelValue — Compact label + value pair for status displays.
 *
 * The canonical pattern for showing named metrics inline — used in the Header
 * (CPU, Synths), toolbar sections (Position, Tempo), and anywhere a short
 * label precedes a live numeric or text value.
 *
 * Variants control the value colour:
 *   default  — primary (cyan)  — good / normal state
 *   warning  — yellow          — caution threshold
 *   danger   — destructive red — critical / clip threshold
 *   muted    — muted fg        — inactive / info
 *
 * Usage:
 *   // Static:
 *   <LabelValue label="SYNTHS" value={activeSynths} />
 *
 *   // Threshold-coloured (computed once by caller):
 *   <LabelValue
 *     label="CPU"
 *     value={`${cpuUsage.toFixed(1)}%`}
 *     variant={cpuUsage > 80 ? "danger" : cpuUsage > 50 ? "warning" : "default"}
 *     icon={Activity}
 *   />
 *
 *   // Two-row vertical layout:
 *   <LabelValue label="POSITION" value="1:1:00" orientation="vertical" />
 */

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LabelValueVariant = "default" | "warning" | "danger" | "muted";

const VALUE_CLASSES: Record<LabelValueVariant, string> = {
    default: "text-primary",
    warning: "text-yellow-500",
    danger:  "text-destructive",
    muted:   "text-muted-foreground",
};

export interface LabelValueProps {
    label:        string;
    value:        React.ReactNode;
    variant?:     LabelValueVariant;
    /** Optional Lucide icon rendered before the label */
    icon?:        LucideIcon;
    /** Horizontal (default) or vertical (label above value) layout */
    orientation?: "horizontal" | "vertical";
    className?:   string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LabelValue({
    label,
    value,
    variant     = "default",
    icon: Icon,
    orientation = "horizontal",
    className,
}: LabelValueProps) {
    if (orientation === "vertical") {
        return (
            <div className={cn("flex flex-col", className)}>
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                    {label}
                </span>
                <span className={cn("text-xs font-mono font-bold tabular-nums", VALUE_CLASSES[variant])}>
                    {value}
                </span>
            </div>
        );
    }

    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            {Icon && (
                <Icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            )}
            <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground select-none">
                {label}
            </span>
            <span className={cn(
                "text-xs font-bold tracking-wider tabular-nums",
                VALUE_CLASSES[variant],
            )}>
                {value}
            </span>
        </div>
    );
}
