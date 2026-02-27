/**
 * SectionLabel
 *
 * Compact uppercase label used to name sections within panels, control columns,
 * and editor sidebars.  Optionally includes a trailing hairline rule to visually
 * separate a section from the content below it.
 *
 * Replaces every one-off `text-[9px] uppercase tracking-widest text-muted-foreground/40`
 * occurrence that currently lives as an inline string or private sub-component.
 *
 * Variants:
 *   size       xs (default, very subtle) | sm | default
 *   emphasis   subtle (default) | muted | primary
 *
 * Props:
 *   withLine   — appends a flex-1 hairline rule after the label text (divider pattern)
 *   spacing    — adds top/bottom padding when used as a section divider
 *
 * Usage:
 *   <SectionLabel>Playback</SectionLabel>
 *   <SectionLabel withLine spacing>Envelope</SectionLabel>
 *   <SectionLabel size="sm" emphasis="muted">Channel</SectionLabel>
 *   <SectionLabel size="sm" emphasis="primary">Limiter</SectionLabel>
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const sectionLabelTextVariants = cva(
    "uppercase tracking-widest select-none whitespace-nowrap",
    {
        variants: {
            size: {
                xs:      "text-[9px] font-semibold",
                sm:      "text-[10px] font-bold",
                default: "text-xs font-bold",
            },
            emphasis: {
                subtle:  "text-muted-foreground/40",
                muted:   "text-muted-foreground",
                primary: "text-primary",
            },
        },
        defaultVariants: {
            size:     "xs",
            emphasis: "subtle",
        },
    }
);

export interface SectionLabelProps
    extends React.ComponentProps<"div">,
        VariantProps<typeof sectionLabelTextVariants> {
    /** Append a flex-1 hairline rule after the label (section divider pattern) */
    withLine?: boolean;
    /** Add vertical spacing — useful when used as a standalone section divider */
    spacing?: boolean;
}

export function SectionLabel({
    children,
    withLine = false,
    spacing  = false,
    size,
    emphasis,
    className,
    ...props
}: SectionLabelProps) {
    return (
        <div
            data-slot="section-label"
            className={cn(
                "flex items-center gap-2",
                spacing && "pt-2 pb-1",
                className
            )}
            {...props}
        >
            <span className={sectionLabelTextVariants({ size, emphasis })}>
                {children}
            </span>
            {withLine && (
                <div className="flex-1 h-px bg-border/40" aria-hidden />
            )}
        </div>
    );
}
