/**
 * ChannelStripHeader
 *
 * The track identity block that sits at the top of every vertical column in
 * the Mixer, Effects panel, and any future channel-strip layout.
 *
 * Structure:
 *   ┌─────────────────────┐
 *   │   TRACK NAME        │  ← coloured, uppercase, truncated
 *   │   [  FX CHAIN  ]    │  ← coloured pill badge (type label)
 *   └─────────────────────┘
 *
 * Props:
 *   name       — Track / section name
 *   color      — Track accent colour (hex string, e.g. "#22d3ee")
 *   label      — Badge label (defaults to track type when omitted)
 *   aiHandlers — Spread onto the name div to enable inline-AI long-press/right-click
 *
 * Usage:
 *   <ChannelStripHeader name={track.name} color={track.color} label={track.type} {...aiHandlers} />
 *   <ChannelStripHeader name={track.name} color={track.color} label="FX Chain" />
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ChannelStripHeaderProps extends React.ComponentProps<"div"> {
    name:        string;
    color:       string;
    /** Badge pill text — defaults to empty (hidden) when omitted */
    label?:      string;
    /** Extra props spread onto the name element (e.g. inline-AI handlers) */
    nameProps?:  React.HTMLAttributes<HTMLDivElement>;
}

export function ChannelStripHeader({
    name,
    color,
    label,
    nameProps,
    className,
    ...props
}: ChannelStripHeaderProps) {
    return (
        <div
            data-slot="channel-strip-header"
            className={cn(
                "flex flex-col gap-1.5 border-b border-border/30 pb-2.5",
                className
            )}
            {...props}
        >
            {/* Track name */}
            <div
                className="truncate text-center text-xs font-bold uppercase tracking-wider drop-shadow-sm cursor-pointer"
                style={{ color }}
                {...nameProps}
            >
                {name}
            </div>

            {/* Type / label badge */}
            {label && (
                <div className="flex justify-center">
                    <span
                        className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm"
                        style={{
                            backgroundColor: `${color}20`,
                            color,
                            border: `1px solid ${color}40`,
                        }}
                    >
                        {label}
                    </span>
                </div>
            )}
        </div>
    );
}
