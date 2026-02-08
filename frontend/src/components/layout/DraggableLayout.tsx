import { useState, useCallback, useRef, useEffect } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import { X, RotateCcw, MoreVertical } from "lucide-react";
import type { TabConfig } from "./TabbedLayout";

interface PanelConfig {
    id: string;
    title: string;
    component: React.ReactNode;
    defaultLayout: Layout;
    closeable?: boolean;
}

interface DraggableLayoutProps {
    panels: PanelConfig[];
    onLayoutChange?: (layout: Layout[]) => void;
    onResetLayout?: () => void;
    tabs?: TabConfig[];
    activeTabId?: string;
    onMovePanelToTab?: (panelId: string, targetTabId: string) => void;
    onPanelDragStart?: (panelId: string) => void;
    onPanelDragEnd?: () => void;
}

export function DraggableLayout({
    panels,
    onLayoutChange,
    onResetLayout,
    tabs,
    activeTabId,
    onMovePanelToTab,
    onPanelDragStart,
    onPanelDragEnd,
}: DraggableLayoutProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(0);
    const hasScaledRef = useRef(false);
    const [closedPanels, setClosedPanels] = useState<Set<string>>(new Set());
    const [openMenuPanelId, setOpenMenuPanelId] = useState<string | null>(null);
    const [layout, setLayout] = useState<Layout[]>(() => {
        // Try to load saved layout from localStorage
        const saved = localStorage.getItem("sonic-claude-layout");
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return panels.map((p) => p.defaultLayout);
            }
        }
        return panels.map((p) => p.defaultLayout);
    });

    // Measure STABLE parent container (wrapper - toolbar)
    useEffect(() => {
        const updateHeight = () => {
            if (wrapperRef.current && toolbarRef.current) {
                const wrapperHeight = wrapperRef.current.clientHeight;
                const toolbarHeight = toolbarRef.current.clientHeight;
                // Available height = wrapper - toolbar - containerPadding (16px)
                const gridHeight = wrapperHeight - toolbarHeight - 16;

                // Calculate max rows that fit (rowHeight + margin = 32px per row)
                const maxRows = Math.floor(gridHeight / 32);

                console.log('📐 Wrapper:', wrapperHeight, 'Toolbar:', toolbarHeight, 'Grid height:', gridHeight, 'Max rows:', maxRows);
                setContainerHeight(gridHeight);

                // Scale layout ONCE on mount if needed
                if (!hasScaledRef.current) {
                    setLayout(prevLayout => {
                        const maxY = Math.max(...prevLayout.map(item => (item.y || 0) + (item.h || 0)));

                        if (maxY > maxRows) {
                            console.log('⚠️ Scaling layout from', maxY, 'rows to', maxRows, 'rows');
                            hasScaledRef.current = true;
                            const scale = maxRows / maxY;
                            return prevLayout.map(item => ({
                                ...item,
                                y: Math.floor((item.y || 0) * scale),
                                h: Math.max(3, Math.floor((item.h || 10) * scale))
                            }));
                        }

                        console.log('✅ Layout fits:', maxY, 'rows,', maxRows, 'available');
                        hasScaledRef.current = true;
                        return prevLayout;
                    });
                }
            }
        };

        // Measure on mount and window resize only
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = () => {
            if (openMenuPanelId) {
                setOpenMenuPanelId(null);
            }
        };

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [openMenuPanelId]);

    const handleLayoutChange = useCallback(
        (newLayout: Layout[]) => {
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
            localStorage.removeItem("sonic-claude-layout");
            console.log("🔄 Layout reset to defaults");
        }
    }, [panels, onResetLayout]);

    const visiblePanels = panels.filter((p) => !closedPanels.has(p.id));
    const hiddenPanels = panels.filter((p) => closedPanels.has(p.id));

    return (
        <div ref={wrapperRef} className="flex h-full flex-col overflow-hidden">
            {/* Panel Toggle Bar */}
            <div
                ref={toolbarRef}
                className="panel-glass border-primary/10 flex flex-shrink-0 gap-2 border-b p-3 backdrop-blur-xl"
            >
                {hiddenPanels.length > 0 && (
                    <>
                        <span className="text-primary/50 mr-2 text-xs font-medium tracking-wider">
                            HIDDEN:
                        </span>
                        {hiddenPanels.map((panel) => (
                            <button
                                key={panel.id}
                                onClick={() => handleOpenPanel(panel.id)}
                                className="bg-primary/5 hover:bg-primary/15 border-primary/20 hover:border-primary/40 text-primary rounded-md border px-3 py-1.5 text-xs font-medium tracking-wide transition-all duration-200"
                            >
                                + {panel.title}
                            </button>
                        ))}
                    </>
                )}
                <div className="flex-1" />
                <button
                    onClick={handleResetLayout}
                    className="flex items-center gap-1.5 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-medium tracking-wide text-orange-400 transition-all duration-200 hover:border-orange-500/50 hover:bg-orange-500/20"
                    title="Reset layout to defaults"
                >
                    <RotateCcw className="h-3 w-3" />
                    RESET LAYOUT
                </button>
            </div>

            {/* Grid Layout */}
            <div className="min-h-0 flex-1 overflow-hidden" style={{ height: containerHeight > 0 ? `${containerHeight}px` : 'auto' }}>
                {containerHeight > 0 && (
                    <GridLayout
                        className="layout"
                        layout={layout}
                        cols={12}
                        rowHeight={20}
                        width={window.innerWidth - 50}
                        height={containerHeight}
                        autoSize={false}
                        onLayoutChange={handleLayoutChange}
                        draggableHandle=".drag-handle"
                        compactType="vertical"
                        preventCollision={false}
                        margin={[12, 12]}
                        containerPadding={[8, 8]}
                    >
                        {visiblePanels.map((panel) => (
                            <div
                                key={panel.id}
                                className="panel-glass hover:shadow-primary/10 flex h-full w-full flex-col overflow-hidden rounded-xl shadow-2xl transition-shadow duration-300"
                                draggable={tabs && tabs.length > 1}
                                onDragStart={(e) => {
                                    if (onPanelDragStart) {
                                        onPanelDragStart(panel.id);
                                        e.dataTransfer.effectAllowed = "move";
                                        e.dataTransfer.setData("text/plain", panel.id);
                                    }
                                }}
                                onDragEnd={() => {
                                    if (onPanelDragEnd) {
                                        onPanelDragEnd();
                                    }
                                }}
                            >
                                {/* Panel Header */}
                                <div className="drag-handle from-primary/5 to-secondary/5 border-primary/10 group flex cursor-move items-center justify-between border-b bg-gradient-to-r px-4 py-3">
                                    <span className="text-primary group-hover:text-glow-cyan text-xs font-bold tracking-[0.15em] transition-all select-none">
                                        {panel.title}
                                    </span>
                                    <div className="relative flex items-center gap-1">
                                        {/* Move to Tab Menu */}
                                        {tabs && tabs.length > 1 && onMovePanelToTab && (
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuPanelId(
                                                            openMenuPanelId === panel.id
                                                                ? null
                                                                : panel.id
                                                        );
                                                    }}
                                                    className="hover:bg-primary/20 group/btn rounded-md p-1.5 transition-all duration-200"
                                                    title="Move to tab"
                                                >
                                                    <MoreVertical className="text-muted-foreground group-hover/btn:text-primary h-3.5 w-3.5 transition-colors" />
                                                </button>

                                                {/* Dropdown Menu */}
                                                {openMenuPanelId === panel.id && (
                                                    <div className="panel-glass border-primary/20 absolute top-full right-0 z-50 mt-1 min-w-[150px] overflow-hidden rounded-lg border shadow-xl">
                                                        <div className="text-primary/60 border-primary/10 border-b px-2 py-1.5 text-xs font-medium">
                                                            Move to:
                                                        </div>
                                                        {tabs
                                                            .filter((tab) => tab.id !== activeTabId)
                                                            .map((tab) => (
                                                                <button
                                                                    key={tab.id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onMovePanelToTab(
                                                                            panel.id,
                                                                            tab.id
                                                                        );
                                                                        setOpenMenuPanelId(null);
                                                                    }}
                                                                    className="text-primary/80 hover:bg-primary/15 hover:text-primary w-full px-3 py-2 text-left text-xs transition-colors"
                                                                >
                                                                    {tab.name}
                                                                </button>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {panel.closeable !== false && (
                                            <button
                                                onClick={() => handleClosePanel(panel.id)}
                                                className="hover:bg-destructive/20 group/btn rounded-md p-1.5 transition-all duration-200"
                                                title="Close panel"
                                            >
                                                <X className="text-muted-foreground group-hover/btn:text-destructive h-3.5 w-3.5 transition-colors" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Panel Content */}
                                <div className="flex-1 overflow-auto">{panel.component}</div>
                            </div>
                        ))}
                    </GridLayout>
                )}
            </div>
        </div>
    );
}
