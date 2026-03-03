/**
 * ResizeHandle
 *
 * Reusable hit-area for drag-to-resize interactions.
 *
 * orientation="horizontal" — left/right edge handle (cursor-ew-resize, absolute w-2)
 * orientation="vertical"   — top/bottom divider  (cursor-ns-resize, not absolute)
 *
 * Usage:
 *   <ResizeHandle orientation="horizontal" side="right" onMouseDown={...} className="z-10" />
 *   <ResizeHandle orientation="vertical" side="top" onMouseDown={...} className="h-1 flex-shrink-0 ...">
 *     <div className="grip-indicator" />
 *   </ResizeHandle>
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ResizeHandleProps {
    orientation: "horizontal" | "vertical";
    side: "left" | "right" | "top" | "bottom";
    onMouseDown: (e: React.MouseEvent) => void;
    onDoubleClick?: (e: React.MouseEvent) => void;
    title?: string;
    className?: string;
    children?: React.ReactNode;
}

export function ResizeHandle({
    orientation,
    side,
    onMouseDown,
    onDoubleClick,
    title,
    className,
    children,
}: ResizeHandleProps) {
    return (
        <div
            className={cn(
                "hover:bg-white/20 transition-colors",
                orientation === "horizontal" && [
                    "absolute inset-y-0 w-2 cursor-ew-resize",
                    side === "left" && "left-0",
                    side === "right" && "right-0",
                ],
                orientation === "vertical" && "cursor-ns-resize",
                className,
            )}
            onMouseDown={onMouseDown}
            onDoubleClick={onDoubleClick}
            title={title}
        >
            {children}
        </div>
    );
}
