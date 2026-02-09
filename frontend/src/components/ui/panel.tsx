/**
 * Panel Component - Consistent panel styling across the entire app
 * 
 * Features:
 * - Consistent color scheme (cyan/purple gradient, glass effect)
 * - Optional drag handle for draggable panels
 * - Optional close button
 * - Optional actions in header
 * - Flexible content area
 * 
 * Used everywhere: DraggableWrapper, Studio lanes, standalone panels
 */

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Panel title displayed in header */
    title?: string;
    
    /** Whether panel can be dragged (adds drag-handle class to header) */
    draggable?: boolean;
    
    /** Whether panel can be closed */
    closeable?: boolean;
    
    /** Callback when close button is clicked */
    onClose?: () => void;
    
    /** Additional actions to display in header (right side) */
    headerActions?: React.ReactNode;
    
    /** Custom header content (replaces default title) */
    headerContent?: React.ReactNode;
    
    /** Whether to show header at all */
    showHeader?: boolean;
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
    (
        {
            title,
            draggable = false,
            closeable = false,
            onClose,
            headerActions,
            headerContent,
            showHeader = true,
            className,
            children,
            ...props
        },
        ref
    ) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "panel-glass flex flex-col overflow-hidden",
                    className
                )}
                {...props}
            >
                {/* Panel Header */}
                {showHeader && (
                    <div
                        className={cn(
                            "from-primary/5 to-secondary/5 border-primary/10 flex items-center justify-between border-b bg-gradient-to-r px-4 py-3",
                            draggable && "drag-handle cursor-move"
                        )}
                    >
                        {headerContent ? (
                            headerContent
                        ) : (
                            <>
                                <span className="text-primary flex-1 text-xs font-bold tracking-widest uppercase">
                                    {title}
                                </span>
                                <div className="flex items-center gap-2">
                                    {headerActions}
                                    {closeable && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onClose?.();
                                            }}
                                            className="hover:bg-destructive/20 cursor-pointer rounded p-2 touch-manipulation transition-colors"
                                            aria-label="Close panel"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Panel Content */}
                <div
                    className="min-h-0 flex-1 overflow-auto"
                    onMouseDown={(e) => draggable && e.stopPropagation()}
                    onPointerDown={(e) => draggable && e.stopPropagation()}
                >
                    {children}
                </div>
            </div>
        );
    }
);

Panel.displayName = "Panel";

