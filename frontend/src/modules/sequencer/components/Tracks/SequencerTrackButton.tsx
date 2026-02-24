/**
 * SequencerTrackButton Component
 *
 * Specialized button for track controls (Mute, Solo, Record/Arm).
 * Provides consistent styling and behavior for track header buttons.
 *
 * Usage:
 * ```tsx
 * <SequencerTrackButton
 *   variant="mute"
 *   active={track.is_muted}
 *   onClick={() => onToggleMute(track.id)}
 *   size="sm"
 * >
 *   M
 * </SequencerTrackButton>
 * ```
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const sequencerTrackButtonVariants = cva(
    "inline-flex items-center justify-center rounded font-bold uppercase tracking-wide transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    {
        variants: {
            variant: {
                mute: "data-[active=true]:bg-yellow-500/20 data-[active=true]:text-yellow-500 data-[active=false]:bg-muted/50 data-[active=false]:text-muted-foreground data-[active=false]:hover:bg-muted",
                solo: "data-[active=true]:bg-blue-500/20 data-[active=true]:text-blue-500 data-[active=false]:bg-muted/50 data-[active=false]:text-muted-foreground data-[active=false]:hover:bg-muted",
                arm: "data-[active=true]:bg-red-500/20 data-[active=true]:text-red-500 data-[active=false]:bg-muted/50 data-[active=false]:text-muted-foreground data-[active=false]:hover:bg-muted",
            },
            size: {
                xs: "px-1.5 py-0.5 text-[9px]",
                sm: "px-2 py-1 text-[10px]",
                default: "px-3 py-1.5 text-xs",
            },
            bordered: {
                true: "border",
                false: "",
            },
        },
        compoundVariants: [
            {
                variant: "mute",
                bordered: true,
                className: "data-[active=true]:border-yellow-500/50 data-[active=false]:border-border data-[active=false]:hover:border-yellow-500/30",
            },
            {
                variant: "solo",
                bordered: true,
                className: "data-[active=true]:border-blue-500/50 data-[active=false]:border-border data-[active=false]:hover:border-blue-500/30",
            },
            {
                variant: "arm",
                bordered: true,
                className: "data-[active=true]:border-red-500/50 data-[active=false]:border-border data-[active=false]:hover:border-red-500/30",
            },
        ],
        defaultVariants: {
            variant: "mute",
            size: "default",
            bordered: false,
        },
    }
);

export interface SequencerTrackButtonProps
    extends Omit<React.ComponentProps<"button">, "children">,
        VariantProps<typeof sequencerTrackButtonVariants> {
    /** Whether the button is in active state */
    active?: boolean;
    /** Button label (typically single letter: M, S, R) */
    children: React.ReactNode;
}

export const SequencerTrackButton = React.forwardRef<HTMLButtonElement, SequencerTrackButtonProps>(
    ({ active = false, variant = "mute", size = "default", bordered = false, className, children, type = "button", ...props }, ref) => {
        return (
            <button
                ref={ref}
                type={type}
                data-slot="track-button"
                data-active={active}
                data-variant={variant}
                data-size={size}
                className={cn(sequencerTrackButtonVariants({ variant, size, bordered, className }))}
                title={
                    variant === "mute"
                        ? active
                            ? "Unmute"
                            : "Mute"
                        : variant === "solo"
                        ? active
                            ? "Unsolo"
                            : "Solo"
                        : active
                        ? "Disarm"
                        : "Arm for recording"
                }
                {...props}
            >
                {children}
            </button>
        );
    }
);

SequencerTrackButton.displayName = "SequencerTrackButton";

