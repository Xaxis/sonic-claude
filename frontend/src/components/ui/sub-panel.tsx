/**
 * SubPanel Component
 *
 * A lighter, nested panel component for sections within main panels.
 * Used for organizing content within Studio lanes and other complex panels.
 *
 * Features:
 * - Consistent styling with main Panel theme
 * - Optional accordion (min/max) functionality
 * - Collapsible content with smooth animation
 * - Min/max button in header
 *
 * Design: Lighter background, subtle borders, consistent with main Panel theme
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./button";

export interface SubPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    headerActions?: React.ReactNode;
    showHeader?: boolean;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    contentOverflow?: 'auto' | 'hidden'; // Control overflow behavior
}

export const SubPanel = React.forwardRef<HTMLDivElement, SubPanelProps>(
    (
        {
            title,
            headerActions,
            showHeader = true,
            collapsible = false,
            defaultCollapsed = false,
            contentOverflow = 'auto',
            className,
            children,
            ...props
        },
        ref
    ) => {
        const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

        return (
            <div
                ref={ref}
                className={cn(
                    "bg-card/20 border-primary/5 flex flex-1 flex-col overflow-hidden border min-h-0",
                    className
                )}
                {...props}
            >
                {showHeader && (title || headerActions || collapsible) && (
                    <div className="border-primary/5 bg-card/10 flex items-center justify-between border-b px-3 py-2">
                        {title && (
                            <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                {title}
                            </h3>
                        )}
                        <div className="flex items-center gap-2">
                            {headerActions}
                            {collapsible && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => setIsCollapsed(!isCollapsed)}
                                    title={isCollapsed ? "Expand" : "Collapse"}
                                >
                                    {isCollapsed ? (
                                        <ChevronDown className="h-3 w-3" />
                                    ) : (
                                        <ChevronUp className="h-3 w-3" />
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                )}
                {!isCollapsed && (
                    <div className={cn(
                        "flex min-h-0 flex-1 flex-col",
                        contentOverflow === 'auto' ? 'overflow-auto' : 'overflow-hidden'
                    )}>{children}</div>
                )}
            </div>
        );
    }
);

SubPanel.displayName = "SubPanel";
