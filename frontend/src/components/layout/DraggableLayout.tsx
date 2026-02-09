import { useState, useCallback, useRef, useEffect } from "react";
import ReactGridLayout, { Layout } from "react-grid-layout";
import { X, RotateCcw } from "lucide-react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

interface PanelConfig {
    id: string;
    title: string;
    component: React.ReactNode;
    defaultLayout: { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number };
    closeable?: boolean;
}

interface DraggableLayoutProps {
    panels: PanelConfig[];
    onLayoutChange?: (layout: Layout) => void;
    onResetLayout?: () => void;
}

export function DraggableLayout({ panels, onLayoutChange, onResetLayout }: DraggableLayoutProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [closedPanels, setClosedPanels] = useState<Set<string>>(new Set());

    const [layout, setLayout] = useState<Layout>(() => {
        return panels.map((p) => p.defaultLayout);
    });

    // Measure container size with ResizeObserver
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

    const handleLayoutChange = useCallback(
        (newLayout: Layout) => {
            setLayout(newLayout);
            onLayoutChange?.(newLayout);
        },
        [onLayoutChange]
    );

    const handleClosePanel = useCallback((panelId: string) => {
        setClosedPanels((prev) => new Set(prev).add(panelId));
    }, []);

    const handleOpenPanel = useCallback((panelId: string) => {
        setClosedPanels((prev) => {
            const next = new Set(prev);
            next.delete(panelId);
            return next;
        });
    }, []);

    const handleResetLayout = useCallback(() => {
        if (onResetLayout) {
            onResetLayout();
        } else {
            const defaultLayout = panels.map((p) => p.defaultLayout);
            setLayout(defaultLayout);
        }
    }, [panels, onResetLayout]);

    const visiblePanels = panels.filter((p) => !closedPanels.has(p.id));
    const hiddenPanels = panels.filter((p) => closedPanels.has(p.id));

    // Calculate grid dimensions
    const rowHeight = 30;
    const margin = 10;
    const containerPadding = 10;

    // Calculate how many rows fit in the available height
    const availableHeight = containerSize.height - containerPadding * 2;
    const rowHeightWithMargin = rowHeight + margin;
    const maxRowsThatFit = Math.floor(availableHeight / rowHeightWithMargin);

    return (
        <div className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="panel-glass border-primary/10 flex flex-shrink-0 gap-2 border-b p-3">
                {hiddenPanels.length > 0 && (
                    <>
                        <span className="text-primary/50 mr-2 text-xs font-medium">HIDDEN:</span>
                        {hiddenPanels.map((panel) => (
                            <button
                                key={panel.id}
                                onClick={() => handleOpenPanel(panel.id)}
                                className="bg-primary/5 hover:bg-primary/15 border-primary/20 text-primary rounded px-3 py-1 text-xs"
                            >
                                + {panel.title}
                            </button>
                        ))}
                    </>
                )}
                <div className="flex-1" />
                <button
                    onClick={handleResetLayout}
                    className="flex items-center gap-1.5 rounded border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-400"
                >
                    <RotateCcw className="h-3 w-3" />
                    RESET
                </button>
            </div>

            {/* Grid Container */}
            <div ref={containerRef} className="min-h-0 flex-1 overflow-auto">
                {containerSize.width > 0 && containerSize.height > 0 && (
                    <ReactGridLayout
                        className="layout"
                        layout={layout}
                        cols={12}
                        rowHeight={rowHeight}
                        width={containerSize.width}
                        maxRows={maxRowsThatFit}
                        onLayoutChange={handleLayoutChange}
                        draggableHandle=".drag-handle"
                        compactType="vertical"
                        preventCollision={false}
                        margin={[margin, margin]}
                        containerPadding={[containerPadding, containerPadding]}
                        isDraggable={true}
                        isResizable={true}
                        // Touch support configuration
                        useCSSTransforms={true}
                        transformScale={1}
                    >
                        {visiblePanels.map((panel) => (
                            <div
                                key={panel.id}
                                className="panel-glass flex flex-col overflow-hidden rounded-xl shadow-2xl"
                            >
                                {/* Panel Header */}
                                <div className="drag-handle from-primary/5 to-secondary/5 border-primary/10 flex cursor-move items-center justify-between border-b bg-gradient-to-r px-4 py-3">
                                    <span className="text-primary flex-1 text-xs font-bold tracking-widest">
                                        {panel.title}
                                    </span>
                                    {panel.closeable && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleClosePanel(panel.id);
                                            }}
                                            className="hover:bg-destructive/20 cursor-pointer rounded p-2 touch-manipulation"
                                            aria-label="Close panel"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                {/* Panel Content */}
                                <div
                                    className="min-h-0 flex-1 overflow-auto"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    {panel.component}
                                </div>
                            </div>
                        ))}
                    </ReactGridLayout>
                )}
            </div>
        </div>
    );
}
