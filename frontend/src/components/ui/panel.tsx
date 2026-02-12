/**
 * Panel Component - THE SINGLE SOURCE OF TRUTH for all panel UI structure
 *
 * CRITICAL ARCHITECTURE PATTERN:
 * - ALL panels MUST wrap their content in <Panel>
 * - Panel handles: title bar, subtitle bar, drag handle, close button
 * - Panel provides consistent glass styling and layout
 * - Subtitle bar shows DYNAMIC STATUS INFO (never repeats the title!)
 *
 * USAGE PATTERN:
 * ```tsx
 * export function MyPanel() {
 *   const [state, setState] = useState(...);
 *
 *   const getSubtitle = () => {
 *     return `Status • ${state.count} items • ${state.mode}`;
 *   };
 *
 *   return (
 *     <Panel title="MY PANEL" subtitle={getSubtitle()} draggable={true}>
 *       <SubPanel title="Section 1">
 *         {content}
 *       </SubPanel>
 *     </Panel>
 *   );
 * }
 * ```
 *
 * DO NOT:
 * - Wrap panels in additional Panel components (causes duplicate titles)
 * - Put static text in subtitle (defeats the purpose)
 * - Forget to add draggable={true} for grid panels
 */

import * as React from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Panel title displayed in header */
    title?: string;

    /** Subtitle/context bar - shows dynamic status information */
    subtitle?: string;

    /** Whether panel can be dragged (adds drag-handle class to header) */
    draggable?: boolean;

    /** Whether panel can be closed */
    closeable?: boolean;

    /** Callback when close button is clicked */
    onClose?: () => void;

    /** Whether panel is currently maximized */
    isMaximized?: boolean;

    /** Callback when maximize/minimize button is clicked */
    onMaximize?: () => void;

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
            subtitle,
            draggable = false,
            closeable = false,
            onClose,
            isMaximized = false,
            onMaximize,
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
                    isMaximized && "h-full",
                    className
                )}
                {...props}
            >
                {/* Panel Header */}
                {showHeader && (
                    <>
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
                                        {onMaximize && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onMaximize();
                                                }}
                                                className="hover:bg-primary/20 cursor-pointer touch-manipulation rounded p-2 transition-colors"
                                                aria-label={isMaximized ? "Minimize panel" : "Maximize panel"}
                                                title={isMaximized ? "Minimize panel" : "Maximize panel"}
                                            >
                                                {isMaximized ? (
                                                    <Minimize2 className="h-4 w-4" />
                                                ) : (
                                                    <Maximize2 className="h-4 w-4" />
                                                )}
                                            </button>
                                        )}
                                        {closeable && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onClose?.();
                                                }}
                                                className="hover:bg-destructive/20 cursor-pointer touch-manipulation rounded p-2 transition-colors"
                                                aria-label="Close panel"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Subtitle/Context Bar */}
                        {subtitle && (
                            <div className="border-border bg-muted/30 border-b px-4 py-2">
                                <span className="text-muted-foreground font-mono text-xs">
                                    {subtitle}
                                </span>
                            </div>
                        )}
                    </>
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
