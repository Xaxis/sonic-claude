/**
 * ControlCell
 *
 * Standardised visual wrapper for a single control area within a channel strip,
 * panel section, or any tool layout. Provides consistent inset / surface / accent
 * treatment without duplicating Tailwind strings across every consumer.
 *
 * Variants:
 *   default      — standard control surface (knobs, generic controls)
 *   inset        — sunken dark well (meters, waveforms, display areas)
 *   accent       — primary-tinted surface (master section controls)
 *   accent-inset — primary-tinted dark well (master section meters)
 *
 * Props:
 *   grow    — adds flex-1 so the cell fills remaining height (fader sections)
 *   center  — centres children both axes (knob cells, meter cells)
 *   gap     — flex gap between stacked children (default "2")
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const controlCellVariants = cva(
    "rounded-md flex flex-col",
    {
        variants: {
            variant: {
                default:        "bg-background/40 border border-border/30 p-2",
                inset:          "bg-black/30 shadow-inner border border-white/5 p-2.5",
                accent:         "bg-gradient-to-b from-primary/5 to-background/60 border-2 border-primary/30 p-3",
                "accent-inset": "bg-black/40 shadow-inner border border-primary/20 p-3",
            },
            grow: {
                true:  "flex-1",
                false: "",
            },
            center: {
                true:  "items-center justify-center",
                false: "",
            },
            gap: {
                "0": "gap-0",
                "1": "gap-1",
                "2": "gap-2",
                "3": "gap-3",
            },
        },
        defaultVariants: {
            variant: "default",
            grow:    false,
            center:  false,
            gap:     "2",
        },
    }
);

export interface ControlCellProps
    extends React.ComponentProps<"div">,
        VariantProps<typeof controlCellVariants> {}

export function ControlCell({
    variant,
    grow,
    center,
    gap,
    className,
    children,
    ...props
}: ControlCellProps) {
    return (
        <div
            data-slot="control-cell"
            data-variant={variant}
            className={cn(controlCellVariants({ variant, grow, center, gap }), className)}
            {...props}
        >
            {children}
        </div>
    );
}
