/**
 * PanelGrid Component
 *
 * Manages the draggable/resizable grid layout of panels within a tab.
 * Uses react-grid-layout for drag-and-drop functionality.
 *
 * Responsibilities:
 * - Render panels in a grid layout
 * - Handle panel dragging and resizing
 * - Persist layout to localStorage
 * - Broadcast layout changes via BroadcastChannel
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { GridLayout } from "react-grid-layout";
import { Panel } from "@/components/ui/panel";
import { GRID_CONFIG } from "@/config/layout.config";
import type { GridLayoutItem, PanelSnapTarget, PanelAttachment, SnapZone } from "@/types/grid-layout";
import { verticalCompactor } from "react-grid-layout";
import { useLayout } from "@/contexts/LayoutContext";

export interface PanelConfig {
    id: string;
    title: string;
    component: React.ReactNode;
    closeable?: boolean;
    getSubtitle?: () => string; // Function to get dynamic subtitle
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

interface PanelGridProps {
    panels: PanelConfig[];
    onLayoutChange?: (layout: GridLayoutItem[]) => void;
    onPanelClose?: (panelId: string) => void;
}

export function PanelGrid({ panels, onLayoutChange, onPanelClose }: PanelGridProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const { maximizedPanel, maximizePanel, minimizePanel, attachments, attachPanel, detachPanel } = useLayout();
    const [activeSnapZone, setActiveSnapZone] = useState<SnapZone | null>(null);
    const [draggingPanelId, setDraggingPanelId] = useState<string | null>(null);

    // Track current layout in state (so we can update it dynamically)
    const [currentLayout, setCurrentLayout] = useState<GridLayoutItem[]>([]);

    // Measure container size
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setContainerSize({ width, height });
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Initialize layout from panel configs
    useEffect(() => {
        const initialLayout: GridLayoutItem[] = panels.map((panel, index) => ({
            i: panel.id,
            x: panel.defaultLayout?.x ?? (index % 2) * 6,
            y: panel.defaultLayout?.y ?? Math.floor(index / 2) * 6,
            w: panel.defaultLayout?.w ?? 6,
            h: panel.defaultLayout?.h ?? 6,
            minW: 3,
            minH: 3,
        }));
        setCurrentLayout(initialLayout);
    }, [panels]);

    // Use currentLayout for rendering
    const layout = currentLayout;

    /**
     * Attachment Enforcement - When parent panel moves/resizes, child panels follow
     */
    useEffect(() => {
        if (!layout.length || !Object.keys(attachments).length) return;

        let needsUpdate = false;
        const updatedLayout = layout.map((item) => {
            // Check if any panel is attached to this one
            const attachedChildId = Object.entries(attachments).find(
                ([_, att]) => att.attachedTo === item.i
            )?.[0];

            if (attachedChildId) {
                const childItem = layout.find((l) => l.i === attachedChildId);
                const attachment = attachments[attachedChildId];

                if (childItem && attachment) {
                    let newChildPosition = { ...childItem };

                    // Update child position based on attachment edge
                    switch (attachment.edge) {
                        case 'bottom':
                            // Child should be directly below parent
                            const expectedY = item.y + item.h;
                            const expectedX = item.x;
                            const expectedW = item.w;

                            if (childItem.y !== expectedY || childItem.x !== expectedX || childItem.w !== expectedW) {
                                newChildPosition = {
                                    ...childItem,
                                    x: expectedX,
                                    y: expectedY,
                                    w: expectedW,
                                };
                                needsUpdate = true;
                                console.log(`📌 Enforcing attachment: ${attachedChildId} following ${item.i}`);
                            }
                            break;

                        case 'top':
                            // Child should be directly above parent
                            const expectedYTop = item.y - childItem.h;
                            const expectedXTop = item.x;
                            const expectedWTop = item.w;

                            if (childItem.y !== expectedYTop || childItem.x !== expectedXTop || childItem.w !== expectedWTop) {
                                newChildPosition = {
                                    ...childItem,
                                    x: expectedXTop,
                                    y: expectedYTop,
                                    w: expectedWTop,
                                };
                                needsUpdate = true;
                                console.log(`📌 Enforcing attachment: ${attachedChildId} following ${item.i}`);
                            }
                            break;
                    }

                    return item.i === attachedChildId ? newChildPosition : item;
                }
            }

            return item;
        });

        if (needsUpdate) {
            setCurrentLayout(updatedLayout);
            onLayoutChange?.(updatedLayout);
        }
    }, [layout, attachments, onLayoutChange]);

    /**
     * Detect if a dragged panel is within snap distance of any target panel edges
     */
    const detectSnapZone = useCallback(
        (draggedPanelId: string, draggedLayout: GridLayoutItem): SnapZone | null => {
            const draggedPanel = panels.find((p) => p.id === draggedPanelId);
            if (!draggedPanel?.snapTargets) {
                console.log('❌ No snap targets for panel:', draggedPanelId);
                return null;
            }

            console.log('🔍 Checking snap targets for', draggedPanelId, draggedPanel.snapTargets);

            for (const snapTarget of draggedPanel.snapTargets) {
                const targetLayout = layout.find((l) => l.i === snapTarget.panelId);
                if (!targetLayout) {
                    console.log('❌ Target panel not found in layout:', snapTarget.panelId);
                    continue;
                }

                // Use configured snap distance (in pixels) or default to 20 pixels
                // Convert to grid units by dividing by rowHeight
                const snapDistancePixels = snapTarget.snapDistance ?? 20;
                const SNAP_DISTANCE = snapDistancePixels / GRID_CONFIG.rowHeight;
                console.log('📏 Snap distance:', snapDistancePixels, 'pixels =', SNAP_DISTANCE, 'grid units');

                for (const edge of snapTarget.edges) {
                    let distance = Infinity;
                    let snapPosition = { x: draggedLayout.x, y: draggedLayout.y };

                    switch (edge) {
                        case "bottom":
                            // Check if dragged panel is near bottom edge of target
                            const targetBottom = targetLayout.y + targetLayout.h;
                            distance = Math.abs(draggedLayout.y - targetBottom);
                            console.log(`📐 Bottom edge check: dragged.y=${draggedLayout.y}, targetBottom=${targetBottom}, distance=${distance}, SNAP_DISTANCE=${SNAP_DISTANCE}`);
                            if (distance <= SNAP_DISTANCE) {
                                snapPosition = { x: targetLayout.x, y: targetBottom };
                            }
                            break;

                        case "top":
                            distance = Math.abs(draggedLayout.y + draggedLayout.h - targetLayout.y);
                            if (distance <= SNAP_DISTANCE) {
                                snapPosition = { x: targetLayout.x, y: targetLayout.y - draggedLayout.h };
                            }
                            break;

                        case "right":
                            const targetRight = targetLayout.x + targetLayout.w;
                            distance = Math.abs(draggedLayout.x - targetRight);
                            if (distance <= SNAP_DISTANCE) {
                                snapPosition = { x: targetRight, y: targetLayout.y };
                            }
                            break;

                        case "left":
                            distance = Math.abs(draggedLayout.x + draggedLayout.w - targetLayout.x);
                            if (distance <= SNAP_DISTANCE) {
                                snapPosition = { x: targetLayout.x - draggedLayout.w, y: targetLayout.y };
                            }
                            break;
                    }

                    if (distance <= SNAP_DISTANCE) {
                        return {
                            targetPanelId: snapTarget.panelId,
                            edge,
                            snapPosition,
                            distance,
                        };
                    }
                }
            }

            return null;
        },
        [panels, layout]
    );

    /**
     * Handle drag start - track which panel is being dragged
     */
    const handleDragStart = useCallback((_layout: readonly GridLayoutItem[], _oldItem: GridLayoutItem, newItem: GridLayoutItem, _placeholder: GridLayoutItem, _e: MouseEvent, _element: HTMLElement) => {
        console.log('🎯 Drag started - panel:', newItem.i);
        setDraggingPanelId(newItem.i);
    }, []);

    /**
     * Handle drag - detect snap zones
     */
    const handleDrag = useCallback(
        (newLayout: readonly GridLayoutItem[]) => {
            // Use the draggingPanelId that was set in handleDragStart
            if (draggingPanelId) {
                const draggedLayout = newLayout.find((l) => l.i === draggingPanelId);
                if (draggedLayout) {
                    const snapZone = detectSnapZone(draggingPanelId, draggedLayout);
                    if (snapZone) {
                        console.log('✨ Snap zone detected:', snapZone);
                    }
                    setActiveSnapZone(snapZone);
                }
            }
        },
        [draggingPanelId, detectSnapZone]
    );

    /**
     * Handle drag stop - attach panel if in snap zone
     */
    const handleDragStop = useCallback(
        (newLayout: readonly GridLayoutItem[]) => {
            if (draggingPanelId && activeSnapZone) {
                // Snap to the detected zone
                const attachment: PanelAttachment = {
                    attachedTo: activeSnapZone.targetPanelId,
                    edge: activeSnapZone.edge,
                };
                attachPanel(draggingPanelId, attachment);

                // Update layout to snap position
                const updatedLayout = newLayout.map((item) =>
                    item.i === draggingPanelId
                        ? { ...item, x: activeSnapZone.snapPosition.x, y: activeSnapZone.snapPosition.y }
                        : item
                );

                // Update both local state and parent
                setCurrentLayout([...updatedLayout]);
                onLayoutChange?.([...updatedLayout]);

                console.log(`✅ Snapped ${draggingPanelId} to ${activeSnapZone.targetPanelId} ${activeSnapZone.edge} edge`);
            } else {
                // No snap - just update layout normally
                setCurrentLayout([...newLayout]);
                onLayoutChange?.([...newLayout]);
            }

            // Clear drag state
            setDraggingPanelId(null);
            setActiveSnapZone(null);
        },
        [draggingPanelId, activeSnapZone, attachPanel, onLayoutChange]
    );

    const handleLayoutChange = (newLayout: readonly GridLayoutItem[]) => {
        // Update local state
        setCurrentLayout([...newLayout]);
        // Convert readonly array to mutable array for our callback
        onLayoutChange?.([...newLayout]);
    };

    // If no panels, show empty state
    if (panels.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <p className="text-muted-foreground text-sm">No panels in this tab</p>
            </div>
        );
    }

    // If container not measured yet, don't render grid
    if (containerSize.height === 0) {
        return <div ref={containerRef} className="h-full w-full" />;
    }

    // If a panel is maximized, render it full-screen
    if (maximizedPanel) {
        const maximizedPanelConfig = panels.find((p) => p.id === maximizedPanel);
        if (maximizedPanelConfig) {
            return (
                <div ref={containerRef} className="h-full w-full flex flex-col">
                    <Panel
                        title={maximizedPanelConfig.title}
                        subtitle={maximizedPanelConfig.getSubtitle?.()}
                        draggable={false}
                        closeable={maximizedPanelConfig.closeable ?? true}
                        onClose={() => onPanelClose?.(maximizedPanelConfig.id)}
                        isMaximized={true}
                        onMaximize={minimizePanel}
                        className="flex-1"
                    >
                        {maximizedPanelConfig.component}
                    </Panel>
                </div>
            );
        }
    }

    // Normal grid layout
    return (
        <div ref={containerRef} className="h-full w-full overflow-auto relative">
            <GridLayout
                className="layout"
                layout={layout}
                width={containerSize.width}
                gridConfig={{
                    cols: GRID_CONFIG.cols.lg,
                    rowHeight: GRID_CONFIG.rowHeight,
                    containerPadding: GRID_CONFIG.containerPadding,
                    margin: GRID_CONFIG.margin,
                }}
                dragConfig={{
                    handle: ".drag-handle",
                }}
                compactor={verticalCompactor}
                onLayoutChange={handleLayoutChange}
                onDragStart={handleDragStart as any}
                onDrag={handleDrag}
                onDragStop={handleDragStop}
            >
                {panels.map((panel) => {
                    const attachment = attachments[panel.id];
                    const isSnapTarget = activeSnapZone?.targetPanelId === panel.id;
                    const isDraggingPanel = draggingPanelId === panel.id;

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
                            key={panel.id}
                            className="grid-item-wrapper relative"
                            style={{
                                // Override grid margin to eliminate spacing between attached panels
                                marginTop: attachmentEdge === 'bottom' ? '-8px' : undefined,
                                marginBottom: attachmentEdge === 'top' ? '-8px' : undefined,
                            }}
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
                        </div>
                    );
                })}
            </GridLayout>
        </div>
    );
}
