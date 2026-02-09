import { useState, useCallback, useEffect } from "react";
import { Plus, X, ExternalLink } from "lucide-react";
import { DraggableLayout } from "./DraggableLayout";
import { windowManager } from "@/services/WindowManager";
import type { Layout } from "react-grid-layout";

export interface PanelConfig {
    id: string;
    title: string;
    component: React.ReactNode;
    defaultLayout: { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number };
    closeable?: boolean;
}

export interface TabConfig {
    id: string;
    name: string;
    panelIds: string[];
}

interface TabbedLayoutProps {
    panels: PanelConfig[];
    defaultTabs: TabConfig[];
    activeTab?: string;  // Controlled active tab ID
    onTabChange?: (tabId: string) => void;
}

interface TabLayouts {
    [tabId: string]: Layout;
}

export function TabbedLayout({ panels, defaultTabs, activeTab: controlledActiveTab, onTabChange }: TabbedLayoutProps) {
    const [tabs, setTabs] = useState<TabConfig[]>(defaultTabs);
    const [internalActiveTabId, setInternalActiveTabId] = useState(tabs[0]?.id || "");
    const [tabLayouts, setTabLayouts] = useState<TabLayouts>({});
    const [poppedOutTabs, setPoppedOutTabs] = useState<Set<string>>(new Set());

    // Use controlled or uncontrolled activeTab
    const activeTabId = controlledActiveTab || internalActiveTabId;
    const handleTabChange = (tabId: string) => {
        if (onTabChange) {
            onTabChange(tabId);
        } else {
            setInternalActiveTabId(tabId);
        }
    };

    // Listen for popout state changes
    useEffect(() => {
        const unsubscribeOpen = windowManager.subscribeToState("popout-opened", (data: any) => {
            setPoppedOutTabs((prev) => new Set(prev).add(data.tabId));
        });

        const unsubscribeClose = windowManager.subscribeToState("popout-closed", (data: any) => {
            setPoppedOutTabs((prev) => {
                const next = new Set(prev);
                next.delete(data.tabId);
                return next;
            });
        });

        // Initialize with current popouts
        const currentPopouts = windowManager.getPopouts();
        setPoppedOutTabs(new Set(currentPopouts.map((p) => p.tabId)));

        return () => {
            unsubscribeOpen();
            unsubscribeClose();
        };
    }, []);

    const handleLayoutChange = useCallback((tabId: string, layout: Layout) => {
        setTabLayouts((prev) => ({
            ...prev,
            [tabId]: layout,
        }));
    }, []);

    const handleResetLayout = useCallback((tabId: string) => {
        setTabLayouts((prev) => {
            const next = { ...prev };
            delete next[tabId];
            return next;
        });
    }, []);

    const handleDeleteTab = useCallback(
        (tabId: string) => {
            if (tabs.length <= 1) return;
            setTabs((prev) => prev.filter((t) => t.id !== tabId));
            if (activeTabId === tabId) {
                handleTabChange(tabs[0].id === tabId ? tabs[1].id : tabs[0].id);
            }
        },
        [tabs, activeTabId, handleTabChange]
    );

    const handleCreateTab = useCallback(() => {
        const newTab: TabConfig = {
            id: `tab-${Date.now()}`,
            name: "New Tab",
            panelIds: [],
        };
        setTabs((prev) => [...prev, newTab]);
        handleTabChange(newTab.id);
    }, [handleTabChange]);

    const handlePopoutTab = useCallback((tab: TabConfig) => {
        windowManager.openPopout(tab.id, tab.panelIds);
    }, []);

    const activeTab = tabs.find((t) => t.id === activeTabId);
    const activePanels = panels.filter((p) => activeTab?.panelIds.includes(p.id));

    // Get saved layout for this tab or use defaults
    const savedLayout = tabLayouts[activeTabId];
    const panelsWithLayouts = activePanels.map((panel) => {
        if (savedLayout) {
            const savedItem = savedLayout.find((item) => item.i === panel.id);
            if (savedItem) {
                return { ...panel, defaultLayout: savedItem };
            }
        }
        return panel;
    });

    return (
        <div className="flex h-full flex-col">
            {/* Tab Bar */}
            <div className="panel-glass border-primary/10 flex flex-shrink-0 items-center gap-2 border-b px-3 py-2">
                <div className="flex flex-1 gap-1 overflow-x-auto">
                    {tabs.map((tab) => {
                        const isPoppedOut = poppedOutTabs.has(tab.id);
                        return (
                            <div
                                key={tab.id}
                                className={`relative flex cursor-pointer items-center gap-2 rounded-t-lg px-4 py-2 transition-all ${
                                    isPoppedOut
                                        ? "bg-accent/15 text-accent border-accent/50 border-b-2 opacity-60"
                                        : activeTabId === tab.id
                                          ? "bg-primary/15 text-primary border-primary border-b-2"
                                          : "bg-primary/5 text-primary/60 hover:bg-primary/10 hover:text-primary/80"
                                } `}
                                onClick={() => !isPoppedOut && handleTabChange(tab.id)}
                            >
                                <span className="text-sm font-medium">{tab.name}</span>
                                {isPoppedOut && (
                                    <span className="text-accent/80 flex items-center gap-1 text-xs">
                                        <ExternalLink className="h-2.5 w-2.5" />
                                        <span>Popped Out</span>
                                    </span>
                                )}
                                <div className="flex items-center gap-1">
                                    {!isPoppedOut && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePopoutTab(tab);
                                            }}
                                            className="hover:bg-primary/20 rounded p-1.5 touch-manipulation transition-colors"
                                            title="Pop out to new window"
                                            aria-label="Pop out to new window"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    {tabs.length > 1 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTab(tab.id);
                                            }}
                                            className="hover:bg-destructive/20 rounded p-1.5 touch-manipulation transition-colors"
                                            aria-label="Close tab"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button
                    onClick={handleCreateTab}
                    className="bg-primary/5 hover:bg-primary/10 text-primary/60 hover:text-primary flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 touch-manipulation transition-all"
                    aria-label="Create new tab"
                >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">New Tab</span>
                </button>
            </div>

            {/* Active Tab Content */}
            <div className="min-h-0 flex-1">
                <DraggableLayout
                    key={activeTabId}
                    panels={panelsWithLayouts}
                    onLayoutChange={(layout) => handleLayoutChange(activeTabId, layout)}
                    onResetLayout={() => handleResetLayout(activeTabId)}
                />
            </div>
        </div>
    );
}
