/**
 * SubPanel Component
 *
 * A lighter, nested panel component for sections within main panels.
 * Used for organizing content within Studio lanes and other complex panels.
 *
 * Design: Lighter background, subtle borders, consistent with main Panel theme
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SubPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    headerActions?: React.ReactNode;
    showHeader?: boolean;
}

export const SubPanel = React.forwardRef<HTMLDivElement, SubPanelProps>(
    ({ title, headerActions, showHeader = true, className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "bg-card/20 border-primary/5 flex flex-col overflow-hidden border",
                    className
                )}
                {...props}
            >
                {showHeader && (title || headerActions) && (
                    <div className="border-primary/5 bg-card/10 flex items-center justify-between border-b px-3 py-2">
                        {title && (
                            <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                                {title}
                            </h3>
                        )}
                        {headerActions && (
                            <div className="flex items-center gap-2">{headerActions}</div>
                        )}
                    </div>
                )}
                <div className="min-h-0 flex-1 overflow-auto">{children}</div>
            </div>
        );
    }
);

SubPanel.displayName = "SubPanel";
