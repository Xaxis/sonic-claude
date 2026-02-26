/**
 * PanelGridItem Component
 *
 * Represents a single panel item within the PanelGrid.
 * Handles panel attachment logic and AI integration.
 */

import React from "react";
import { Panel } from "@/components/ui/panel";
import type { PanelSnapTarget, PanelAttachment, SnapZone } from "@/types/grid-layout";
import { useInlineAI } from "@/hooks/useInlineAI";
import { InlineAIPromptPopover } from "@/components/ai/InlineAIPromptPopover";
import { useDAWStore } from "@/stores/dawStore";

export interface PanelConfig {
    id: string;
    title: string;
    component: React.ReactNode;
    closeable?: boolean;
    getSubtitle?: () => string; // Function to get dynamic subtitle
    enableAI?: boolean; // Enable AI inline prompt on panel header
    defaultLayout?: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    // Panel attachment system
    snapTargets?: PanelSnapTarget[]; // Which panels this panel can snap to
    attachment?: PanelAttachment | null; // Current attachment state (persisted)
}

/**
 * Wrapper component for individual panel items with AI support
 * This must be a separate component to use hooks
 * Uses forwardRef to allow react-grid-layout to apply styles
 */
export const PanelGridItem = React.forwardRef<HTMLDivElement, {
    panels: PanelConfig[];
    panel: PanelConfig;
    draggingPanelId: string | null;
    attachments: Record<string, PanelAttachment>;
    activeSnapZone: SnapZone | null;
    onPanelClose?: (panelId: string) => void;
    maximizePanel: (panelId: string) => void;
    detachPanel: (panelId: string) => void;
    className?: string;
    style?: React.CSSProperties;
}>(({
    panels,
    panel,
    draggingPanelId,
    attachments,
    activeSnapZone,
    onPanelClose,
    maximizePanel,
    detachPanel,
    className: gridClassName,
    style: gridStyle,
    ...rest
}, ref) => {
    const attachment = attachments[panel.id];
    const isSnapTarget = activeSnapZone?.targetPanelId === panel.id;
    const isDraggingPanel = draggingPanelId === panel.id;

    // Use AI hook for this panel
    const activeComposition = useDAWStore(state => state.activeComposition);
    const { handlers: aiHandlers, showPrompt, position, closePrompt } = useInlineAI({
        entityType: "panel",
        entityId: panel.id,
        disabled: !activeComposition || !panel.enableAI,
    });

    // Check if this panel is attached to another (child)
    const isAttachedChild = !!attachment;

    // Check if another panel is attached to this one (parent)
    const attachedChildEntries = Object.entries(attachments)
        .filter(([_, att]) => att.attachedTo === panel.id);
    const hasAttachedChildren = attachedChildEntries.length > 0;
    const attachedChildId = attachedChildEntries[0]?.[0];
    const attachedChildPanel = attachedChildId ? panels.find(p => p.id === attachedChildId) : null;

    // Find which edge the child is attached to (if any)
    const childAttachmentEdge = attachedChildEntries[0]?.[1]?.edge;

    // Determine attachment edge for styling
    const attachmentEdge = attachment?.edge;

    // Build combined title when this panel has attached children
    const combinedTitle = hasAttachedChildren && attachedChildPanel
        ? `${panel.title} + ${attachedChildPanel.title}`
        : panel.title;

    // Build detach button for header actions (when this panel has children)
    const detachButton = hasAttachedChildren && attachedChildId ? (
        <button
            onClick={(e) => {
                e.stopPropagation();
                detachPanel(attachedChildId);
            }}
            className="hover:bg-primary/20 cursor-pointer touch-manipulation rounded p-2 transition-colors"
            aria-label="Detach panels"
            title="Detach panels"
        >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
        </button>
    ) : null;

    return (
        <div
            ref={ref}
            className={`grid-item-wrapper relative ${gridClassName || ''}`}
            style={{
                ...gridStyle,
                // Override grid margin to eliminate spacing between attached panels
                marginTop: attachmentEdge === 'bottom' ? '-8px' : undefined,
                marginBottom: attachmentEdge === 'top' ? '-8px' : undefined,
            }}
            {...rest}
        >
            <Panel
                title={combinedTitle}
                subtitle={panel.getSubtitle?.()}
                draggable={!isAttachedChild} // Child panels can't be dragged independently
                closeable={panel.closeable ?? true}
                onClose={() => onPanelClose?.(panel.id)}
                isMaximized={false}
                onMaximize={() => maximizePanel(panel.id)}
                showHeader={!isAttachedChild} // ALWAYS hide child panel's header
                headerActions={detachButton}
                aiHandlers={panel.enableAI ? aiHandlers : undefined}
                className={`h-full transition-all ${
                    // When attached to parent's bottom edge: child is below, remove top border/corners
                    attachmentEdge === 'bottom' ? 'rounded-t-none border-t-0' : ''
                } ${
                    // When attached to parent's top edge: child is above, remove bottom border/corners
                    attachmentEdge === 'top' ? 'rounded-b-none border-b-0' : ''
                } ${
                    // When child is attached to our bottom: we're parent, remove bottom border/corners
                    childAttachmentEdge === 'bottom' ? 'rounded-b-none border-b-0' : ''
                } ${
                    // When child is attached to our top: we're parent, remove top border/corners
                    childAttachmentEdge === 'top' ? 'rounded-t-none border-t-0' : ''
                }`}
            >
                {panel.component}
            </Panel>

            {/* Animated Drop Zone Indicator */}
            {isSnapTarget && activeSnapZone && !isDraggingPanel && (
                <div className="absolute inset-0 pointer-events-none z-50">
                    {activeSnapZone.edge === 'bottom' && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary animate-pulse">
                            <div className="absolute inset-0 bg-gradient-to-t from-primary/50 to-transparent h-8 -translate-y-full" />
                            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold shadow-lg whitespace-nowrap">
                                Drop to attach below
                            </div>
                        </div>
                    )}
                    {activeSnapZone.edge === 'top' && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-primary animate-pulse">
                            <div className="absolute inset-0 bg-gradient-to-b from-primary/50 to-transparent h-8 translate-y-full" />
                            <div className="absolute left-1/2 -translate-x-1/2 translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold shadow-lg whitespace-nowrap">
                                Drop to attach above
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* AI Prompt Popover */}
            {showPrompt && position && (
                <InlineAIPromptPopover
                    entityType="panel"
                    entityId={panel.id}
                    position={position}
                    onClose={closePrompt}
                    contextLabel={`Panel: ${panel.title}`}
                />
            )}
        </div>
    );
});

PanelGridItem.displayName = 'PanelGridItem';