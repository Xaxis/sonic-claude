/**
 * ValueDisplay
 *
 * Monospaced numeric readout for any DAW parameter value — dB, pan, pitch,
 * rate, time, percentage, etc.  Eliminates the scattered `text-[11px] font-mono
 * font-bold text-cyan-400` strings that currently litter channel strips and
 * control sections.
 *
 * Variants:
 *   size       xs | sm (default) | default | lg
 *   emphasis   accent (cyan glow, default) | primary (full primary) | muted
 *   align      center (default) | right | left
 *
 * Usage:
 *   <ValueDisplay value={formatDb(faderValue)} />
 *   <ValueDisplay value="L35" emphasis="accent" align="right" size="xs" />
 *   <ValueDisplay value={formatDb(master.fader)} size="lg" emphasis="primary" />
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const valueDisplayVariants = cva(
    "font-mono select-none tabular-nums leading-none",
    {
        variants: {
            size: {
                xs:      "text-[10px]",
                sm:      "text-[11px]",
                default: "text-xs",
                lg:      "text-sm",
            },
            emphasis: {
                accent:  "text-cyan-400 font-bold",
                primary: "text-primary font-black drop-shadow-[0_0_6px_rgba(0,245,255,0.3)]",
                muted:   "text-muted-foreground font-normal",
            },
            align: {
                center: "text-center",
                right:  "text-right",
                left:   "text-left",
            },
        },
        defaultVariants: {
            size:     "sm",
            emphasis: "accent",
            align:    "center",
        },
    }
);

export interface ValueDisplayProps
    extends React.ComponentProps<"div">,
        VariantProps<typeof valueDisplayVariants> {
    /** Pre-formatted value string (caller handles formatting) */
    value: string;
}

export function ValueDisplay({
    value,
    size,
    emphasis,
    align,
    className,
    ...props
}: ValueDisplayProps) {
    return (
        <div
            data-slot="value-display"
            className={cn(valueDisplayVariants({ size, emphasis, align }), className)}
            {...props}
        >
            {value}
        </div>
    );
}
