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

import { useEffect, useRef, useState } from "react";
import { GridLayout } from "react-grid-layout";
import { Panel } from "@/components/ui/panel";
import { GRID_CONFIG } from "@/config/layout.config";
import type { GridLayoutItem } from "@/types/grid-layout";
import { verticalCompactor } from "react-grid-layout";

export interface PanelConfig {
    id: string;
    title: string;
    component: React.ReactNode;
    closeable?: boolean;
    defaultLayout?: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
}

interface PanelGridProps {
    panels: PanelConfig[];
    onLayoutChange?: (layout: GridLayoutItem[]) => void;
    onPanelClose?: (panelId: string) => void;
}

export function PanelGrid({ panels, onLayoutChange, onPanelClose }: PanelGridProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

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

    // Generate layout from panel configs
    const layout: GridLayoutItem[] = panels.map((panel, index) => ({
        i: panel.id,
        x: panel.defaultLayout?.x ?? (index % 2) * 6,
        y: panel.defaultLayout?.y ?? Math.floor(index / 2) * 6,
        w: panel.defaultLayout?.w ?? 6,
        h: panel.defaultLayout?.h ?? 6,
        minW: 3,
        minH: 3,
    }));

    const handleLayoutChange = (newLayout: readonly GridLayoutItem[]) => {
        // Convert readonly array to mutable array for our callback
        onLayoutChange?.([...newLayout]);
    };

    const handlePanelClose = (panelId: string) => {
        onPanelClose?.(panelId);
        // TODO: Broadcast via BroadcastChannel
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

    return (
        <div ref={containerRef} className="h-full w-full overflow-hidden">
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
            >
                {panels.map((panel) => (
                    <div key={panel.id} className="grid-item-wrapper">
                        <Panel
                            title={panel.title}
                            draggable={true}
                            closeable={panel.closeable ?? true}
                            onClose={() => handlePanelClose(panel.id)}
                        >
                            {panel.component}
                        </Panel>
                    </div>
                ))}
            </GridLayout>
        </div>
    );
}

