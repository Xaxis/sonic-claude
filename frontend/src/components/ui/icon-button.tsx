/**
 * IconButton Component
 * 
 * A button with an icon and automatic tooltip support.
 * Best practice for all icon-only buttons in the app.
 * 
 * Usage:
 * ```tsx
 * <IconButton
 *   icon={Play}
 *   tooltip="Play sequence"
 *   onClick={handlePlay}
 *   variant="default"
 *   size="sm"
 * />
 * ```
 */

import * as React from "react";
import { LucideIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type VariantProps } from "class-variance-authority";

export interface IconButtonProps
    extends Omit<React.ComponentProps<"button">, "children">,
        VariantProps<typeof buttonVariants> {
    /** Lucide icon component */
    icon: LucideIcon;
    /** Tooltip text - REQUIRED for accessibility */
    tooltip: string;
    /** Icon size class (default: "h-4 w-4") */
    iconSize?: string;
    /** Tooltip side (default: "top") */
    tooltipSide?: "top" | "bottom" | "left" | "right";
    /** Whether tooltip is disabled */
    disableTooltip?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
    (
        {
            icon: Icon,
            tooltip,
            iconSize = "h-4 w-4",
            tooltipSide = "top",
            disableTooltip = false,
            className,
            variant = "ghost",
            size = "icon",
            ...props
        },
        ref
    ) => {
        const button = (
            <Button
                ref={ref}
                variant={variant}
                size={size}
                className={cn(className)}
                aria-label={tooltip}
                {...props}
            >
                <Icon className={iconSize} />
            </Button>
        );

        if (disableTooltip) {
            return button;
        }

        return (
            <Tooltip>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side={tooltipSide}>
                    <p>{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        );
    }
);

IconButton.displayName = "IconButton";

