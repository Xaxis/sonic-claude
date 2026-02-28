/**
 * FeatureToggle
 *
 * An icon + label toggle button for named feature switches — distinct from
 * TrackButton (compact letter-only DAW controls) in that it shows a Lucide icon
 * alongside a readable label and is intended to fill available horizontal space.
 *
 * Active state uses a named colour preset rather than a freeform class string,
 * keeping visual language consistent across the app.
 *
 * Colour presets (active state):
 *   primary  — cyan  bg-primary/20 border-primary text-primary  (e.g. Reverse)
 *   warning  — yellow  bg-yellow-500/20 border-yellow-500 text-yellow-400  (e.g. Loop)
 *   danger   — red   bg-red-500/20 border-red-500 text-red-400
 *   success  — green bg-green-500/20 border-green-500 text-green-400
 *
 * Inactive state is identical for all presets:
 *   border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground
 *
 * Usage:
 *   <FeatureToggle
 *     icon={RotateCcw}
 *     label="Reverse"
 *     active={reverse}
 *     color="primary"
 *     onClick={() => updateClip(clip.id, { reverse: !reverse })}
 *     title="Play sample backwards"
 *   />
 *   <FeatureToggle
 *     icon={Repeat}
 *     label="Loop"
 *     active={loopEnabled}
 *     color="warning"
 *     onClick={() => updateClip(clip.id, { loop_enabled: !loopEnabled })}
 *   />
 */

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Colour presets ───────────────────────────────────────────────────────────

const ACTIVE_CLASSES: Record<string, string> = {
    primary: "bg-primary/20 border-primary text-primary",
    warning: "bg-yellow-500/20 border-yellow-500 text-yellow-400",
    danger:  "bg-red-500/20 border-red-500 text-red-400",
    success: "bg-green-500/20 border-green-500 text-green-400",
};

const INACTIVE_CLASS =
    "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground";

// ─── Props ────────────────────────────────────────────────────────────────────

export type FeatureToggleColor = "primary" | "warning" | "danger" | "success";

export interface FeatureToggleProps
    extends Omit<React.ComponentProps<"button">, "children"> {
    icon:      LucideIcon;
    label:     string;
    active:    boolean;
    color?:    FeatureToggleColor;
    iconSize?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FeatureToggle({
    icon:     Icon,
    label,
    active,
    color     = "primary",
    iconSize  = 12,
    className,
    type      = "button",
    ...props
}: FeatureToggleProps) {
    return (
        <button
            type={type}
            data-slot="feature-toggle"
            data-active={active}
            data-color={color}
            className={cn(
                "flex flex-1 items-center justify-center gap-1.5",
                "rounded border px-2.5 py-1.5 text-xs",
                "select-none transition-colors",
                active ? ACTIVE_CLASSES[color] : INACTIVE_CLASS,
                className
            )}
            {...props}
        >
            <Icon size={iconSize} />
            {label}
        </button>
    );
}
