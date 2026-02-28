/**
 * ToggleButtonGroup — mutually exclusive option buttons.
 *
 * Used for view mode toggles, filter selectors, and any "pick one" control.
 * Renders as a pill container with internal buttons.
 *
 * Visual states:
 *   Active   — bg-background + text-foreground + shadow (lifted card look)
 *   Inactive — transparent + text-muted-foreground, hover lifts slightly
 *
 * Usage:
 *   <ToggleButtonGroup
 *     value="pad"
 *     onChange={setMode}
 *     options={[
 *       { value: "pad",        label: "Pad View",    icon: Gamepad2 },
 *       { value: "assignment", label: "Assignment",  icon: ListTree },
 *     ]}
 *   />
 *
 *   // Icon-only (compact):
 *   <ToggleButtonGroup value={mode} onChange={setMode} options={options} display="icon-only" />
 */

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToggleOption<T extends string = string> {
    value:   T;
    label:   string;
    icon?:   LucideIcon;
    /** Tooltip / title text (falls back to label) */
    title?:  string;
    disabled?: boolean;
}

export interface ToggleButtonGroupProps<T extends string = string> {
    value:    T;
    onChange: (v: T) => void;
    options:  ToggleOption<T>[];
    /** Whether to show icon, label, or both. Default: "both" */
    display?: "both" | "label-only" | "icon-only";
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ToggleButtonGroup<T extends string = string>({
    value,
    onChange,
    options,
    display = "both",
    className,
}: ToggleButtonGroupProps<T>) {
    return (
        <div
            role="group"
            className={cn(
                "flex items-center gap-0.5 p-0.5 rounded-md",
                "bg-muted/30 border border-border/30",
                className,
            )}
        >
            {options.map((opt) => {
                const active = opt.value === value;
                const Icon   = opt.icon;

                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={opt.disabled}
                        onClick={() => !opt.disabled && onChange(opt.value)}
                        title={opt.title ?? opt.label}
                        className={cn(
                            "flex items-center gap-1.5 rounded px-2.5 py-1",
                            "text-xs font-medium transition-all select-none",
                            "disabled:opacity-40 disabled:pointer-events-none",
                            active
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/40",
                        )}
                    >
                        {Icon && display !== "label-only" && <Icon size={12} />}
                        {display !== "icon-only" && opt.label}
                    </button>
                );
            })}
        </div>
    );
}
