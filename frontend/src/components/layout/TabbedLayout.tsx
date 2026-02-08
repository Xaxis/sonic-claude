import { useState, useCallback, useEffect, useRef } from "react";
import { Plus, X, Edit2, Check } from "lucide-react";
import { DraggableLayout } from "./DraggableLayout";
import type { Layout, LayoutItem } from "react-grid-layout";

export interface PanelConfig {
    id: string;
    title: string;
    component: React.ReactNode;
    defaultLayout: LayoutItem;
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
}

interface TabLayouts {
    [tabId: string]: {
        [panelId: string]: LayoutItem;
    };
}

const STORAGE_KEY = "sonic-claude-tabs";

export function TabbedLayout({ panels, defaultTabs }: TabbedLayoutProps) {
    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editingTabName, setEditingTabName] = useState("");
    const editInputRef = useRef<HTMLInputElement>(null);
    const [draggedPanelId, setDraggedPanelId] = useState<string | null>(null);
    const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

    // Load saved configuration or use defaults
    const [tabs, setTabs] = useState<TabConfig[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed.tabs || defaultTabs;
            } catch {
                return defaultTabs;
            }
        }
        return defaultTabs;
    });

    const [activeTabId, setActiveTabId] = useState<string>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed.activeTabId || defaultTabs[0]?.id;
            } catch {
                return defaultTabs[0]?.id;
            }
        }
        return defaultTabs[0]?.id;
    });

    const [tabLayouts, setTabLayouts] = useState<TabLayouts>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed.layouts || {};
            } catch {
                return {};
            }
        }
        return {};
    });

    // Save to localStorage whenever tabs, activeTabId, or layouts change
    useEffect(() => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                tabs,
                activeTabId,
                layouts: tabLayouts,
            })
        );
    }, [tabs, activeTabId, tabLayouts]);

    const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

    // Get panels for active tab
    const activePanels = panels.filter((p) => activeTab?.panelIds.includes(p.id));

    // Apply saved layouts to panels
    const panelsWithLayouts = activePanels.map((panel) => {
        const savedLayout = tabLayouts[activeTabId]?.[panel.id];
        if (savedLayout) {
            return {
                ...panel,
                defaultLayout: savedLayout,
            };
        }
        return panel;
    });

    const handleLayoutChange = useCallback(
        (layout: Layout[]) => {
            setTabLayouts((prev) => ({
                ...prev,
                [activeTabId]: layout.reduce(
                    (acc, l) => {
                        acc[l.i] = l;
                        return acc;
                    },
                    {} as { [panelId: string]: Layout }
                ),
            }));
        },
        [activeTabId]
    );

    const handleCloseTab = useCallback(
        (tabId: string) => {
            if (tabs.length <= 1) return; // Don't close last tab

            const newTabs = tabs.filter((t) => t.id !== tabId);
            setTabs(newTabs);

            if (activeTabId === tabId) {
                setActiveTabId(newTabs[0].id);
            }
        },
        [tabs, activeTabId]
    );

    const handleResetLayout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setTabs(defaultTabs);
        setActiveTabId(defaultTabs[0]?.id);
        setTabLayouts({});
        console.log("🔄 Tabs and layouts reset to defaults");
    }, [defaultTabs]);

    const handleMovePanelToTab = useCallback((panelId: string, targetTabId: string) => {
        setTabs((prevTabs) => {
            const newTabs = prevTabs.map((tab) => {
                // Remove panel from all tabs
                const filteredPanelIds = tab.panelIds.filter((id) => id !== panelId);

                // Add panel to target tab
                if (tab.id === targetTabId) {
                    return {
                        ...tab,
                        panelIds: [...filteredPanelIds, panelId],
                    };
                }

                return {
                    ...tab,
                    panelIds: filteredPanelIds,
                };
            });
            return newTabs;
        });
    }, []);

    const handleCreateTab = useCallback(() => {
        const newTabId = `tab-${Date.now()}`;
        const newTab: TabConfig = {
            id: newTabId,
            name: `Tab ${tabs.length + 1}`,
            panelIds: [],
        };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTabId);
    }, [tabs.length]);

    const handleDeleteTab = useCallback(
        (tabId: string) => {
            if (tabs.length <= 1) return; // Don't delete last tab

            const tabToDelete = tabs.find((t) => t.id === tabId);
            if (!tabToDelete) return;

            // Move panels from deleted tab to first remaining tab
            const remainingTabs = tabs.filter((t) => t.id !== tabId);
            const firstTab = remainingTabs[0];

            setTabs(
                remainingTabs.map((tab) => {
                    if (tab.id === firstTab.id) {
                        return {
                            ...tab,
                            panelIds: [...tab.panelIds, ...tabToDelete.panelIds],
                        };
                    }
                    return tab;
                })
            );

            if (activeTabId === tabId) {
                setActiveTabId(firstTab.id);
            }
        },
        [tabs, activeTabId]
    );

    const handleStartRename = useCallback((tabId: string, currentName: string) => {
        setEditingTabId(tabId);
        setEditingTabName(currentName);
        setTimeout(() => editInputRef.current?.focus(), 0);
    }, []);

    const handleFinishRename = useCallback(() => {
        if (editingTabId && editingTabName.trim()) {
            setTabs((prev) =>
                prev.map((tab) =>
                    tab.id === editingTabId ? { ...tab, name: editingTabName.trim() } : tab
                )
            );
        }
        setEditingTabId(null);
        setEditingTabName("");
    }, [editingTabId, editingTabName]);

    const handlePanelDragStart = useCallback((panelId: string) => {
        setDraggedPanelId(panelId);
    }, []);

    const handlePanelDragEnd = useCallback(() => {
        if (draggedPanelId && dragOverTabId && dragOverTabId !== activeTabId) {
            handleMovePanelToTab(draggedPanelId, dragOverTabId);
        }
        setDraggedPanelId(null);
        setDragOverTabId(null);
    }, [draggedPanelId, dragOverTabId, activeTabId, handleMovePanelToTab]);

    return (
        <div className="flex h-full flex-col overflow-hidden">
            {/* Tab Bar */}
            <div className="panel-glass border-primary/10 flex flex-shrink-0 items-center gap-2 border-b px-3 py-2 backdrop-blur-xl">
                {/* Drag Indicator */}
                {draggedPanelId && (
                    <div className="from-primary/0 via-primary/50 to-primary/0 absolute top-0 right-0 left-0 h-1 animate-pulse bg-gradient-to-r" />
                )}

                {/* Tabs */}
                <div className="flex flex-1 gap-1 overflow-x-auto">
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            className={`group relative flex items-center gap-2 rounded-t-lg px-4 py-2 transition-all duration-200 ${
                                activeTabId === tab.id
                                    ? "bg-primary/15 text-primary border-primary border-b-2"
                                    : "bg-primary/5 text-primary/60 hover:bg-primary/10 hover:text-primary/80"
                            } ${dragOverTabId === tab.id && draggedPanelId ? "ring-primary/50 ring-2" : ""} `}
                            onDragOver={(e) => {
                                if (draggedPanelId) {
                                    e.preventDefault();
                                    setDragOverTabId(tab.id);
                                }
                            }}
                            onDragLeave={() => {
                                if (draggedPanelId) {
                                    setDragOverTabId(null);
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                handlePanelDragEnd();
                            }}
                        >
                            {editingTabId === tab.id ? (
                                <input
                                    ref={editInputRef}
                                    type="text"
                                    value={editingTabName}
                                    onChange={(e) => setEditingTabName(e.target.value)}
                                    onBlur={handleFinishRename}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleFinishRename();
                                        if (e.key === "Escape") {
                                            setEditingTabId(null);
                                            setEditingTabName("");
                                        }
                                    }}
                                    className="bg-background/50 border-primary/30 focus:border-primary w-32 rounded border px-2 py-0.5 text-sm font-medium tracking-wide outline-none"
                                />
                            ) : (
                                <button
                                    onClick={() => setActiveTabId(tab.id)}
                                    className="flex items-center gap-2 text-sm font-medium tracking-wide"
                                >
                                    {tab.name}
                                    <span className="text-xs opacity-60">
                                        ({tab.panelIds.length})
                                    </span>
                                </button>
                            )}

                            {/* Tab Actions */}
                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                {editingTabId !== tab.id && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleStartRename(tab.id, tab.name);
                                        }}
                                        className="hover:bg-primary/20 rounded p-1 transition-colors"
                                        title="Rename tab"
                                    >
                                        <Edit2 className="h-3 w-3" />
                                    </button>
                                )}

                                {tabs.length > 1 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTab(tab.id);
                                        }}
                                        className="hover:bg-destructive/20 rounded p-1 transition-colors"
                                        title="Delete tab"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* New Tab Button */}
                    <button
                        onClick={handleCreateTab}
                        className="bg-primary/5 hover:bg-primary/10 text-primary/60 hover:text-primary flex items-center gap-1.5 rounded-t-lg px-3 py-2 transition-all duration-200"
                        title="Create new tab"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm font-medium">New Tab</span>
                    </button>
                </div>
            </div>

            {/* Active Tab Content */}
            <div className="min-h-0 flex-1 overflow-hidden">
                <DraggableLayout
                    key={activeTabId}
                    panels={panelsWithLayouts}
                    onLayoutChange={handleLayoutChange}
                    onResetLayout={handleResetLayout}
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onMovePanelToTab={handleMovePanelToTab}
                    onPanelDragStart={handlePanelDragStart}
                    onPanelDragEnd={handlePanelDragEnd}
                />
            </div>
        </div>
    );
}
