/**
 * ChannelStrip
 *
 * The outer shell for any vertical DAW channel column — Mixer channels,
 * Effects chains, and any future column-based panel layout.
 *
 * Provides the fixed width, flex column layout, rounded border, gradient
 * background, and hover treatment. Inner content (header, controls, buttons)
 * is entirely determined by children.
 *
 * Variants:
 *   default  — standard channel: subtle border, card gradient, p-3
 *   master   — master/primary accent: bold primary border, primary-tinted
 *              gradient, p-4, stronger shadow
 *
 * The `highlightClass` from useEntityHighlight should be passed via className.
 *
 * Usage:
 *   <ChannelStrip>
 *     <ChannelStripHeader ... />
 *     <ControlCell variant="inset" center>...</ControlCell>
 *     ...
 *   </ChannelStrip>
 *
 *   <ChannelStrip variant="master">
 *     ...
 *   </ChannelStrip>
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const channelStripVariants = cva(
    // Base — fixed width, vertical flex, rounded, shadow, transition
    "w-56 flex-shrink-0 flex flex-col rounded-lg shadow-lg transition-all",
    {
        variants: {
            variant: {
                default: [
                    "gap-3 p-3",
                    "border border-border/70",
                    "bg-gradient-to-b from-card to-card/60",
                    "hover:border-border",
                ].join(" "),
                master: [
                    "gap-3 p-4",
                    "border-2 border-primary/60",
                    "bg-gradient-to-b from-primary/10 via-card to-card/80",
                    "shadow-2xl",
                ].join(" "),
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface ChannelStripProps
    extends React.ComponentProps<"div">,
        VariantProps<typeof channelStripVariants> {}

export function ChannelStrip({
    variant,
    className,
    children,
    ...props
}: ChannelStripProps) {
    return (
        <div
            data-slot="channel-strip"
            data-variant={variant ?? "default"}
            className={cn(channelStripVariants({ variant }), className)}
            {...props}
        >
            {children}
        </div>
    );
}
