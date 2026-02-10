/**
 * TabbedWrapper Component
 *
 * Core tab management system.
 *
 * Responsibilities:
 * - Render tab bar with tab switching
 * - Manage which panels belong to which tabs
 * - Handle tab creation/deletion
 * - Handle pop-out to separate window
 * - Sync state across all windows via BroadcastChannel
 */

import { useState } from "react";
import { Plus, X, ExternalLink } from "lucide-react";
import { PanelGrid, type PanelConfig } from "./PanelGrid";
import { useLayout } from "@/contexts/LayoutContext";

export interface TabConfig {
    id: string;
    name: string;
    panelIds: string[];
}

interface TabbedWrapperProps {
    panels: PanelConfig[];
    tabs: TabConfig[];
    activeTab?: string;
    onTabChange?: (tabId: string) => void;
    onTabCreate?: () => void;
    onTabDelete?: (tabId: string) => void;
    onTabPopout?: (tabId: string) => void;
}

export function TabbedWrapper({
    panels,
    tabs = [],
    activeTab: controlledActiveTab,
    onTabChange,
    onTabCreate,
    onTabDelete,
    onTabPopout,
}: TabbedWrapperProps) {
    const [localActiveTab, setLocalActiveTab] = useState(tabs[0]?.id || "");
    const { updateTabLayout, poppedOutTabs } = useLayout();

    // Use controlled or local state
    const activeTab = controlledActiveTab ?? localActiveTab;

    const handleTabClick = (tabId: string) => {
        setLocalActiveTab(tabId);
        onTabChange?.(tabId);
    };

    const handleTabDelete = (tabId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onTabDelete?.(tabId);
    };

    const handleTabPopout = (tabId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onTabPopout?.(tabId);
    };

    // Handle empty tabs case
    if (tabs.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4 text-sm">No tabs available</p>
                    <button
                        onClick={() => onTabCreate?.()}
                        className="bg-primary/10 hover:bg-primary/20 text-primary rounded px-4 py-2 transition-colors"
                    >
                        Create First Tab
                    </button>
                </div>
            </div>
        );
    }

    // Get panels for active tab
    const activeTabConfig = tabs.find((t) => t.id === activeTab);
    const activePanels = activeTabConfig
        ? panels.filter((p) => activeTabConfig.panelIds.includes(p.id))
        : [];

    // Check if active tab is popped out
    const isActiveTabPoppedOut = poppedOutTabs.has(activeTab);

    return (
        <div className="flex h-full w-full flex-col overflow-hidden">
            {/* Tab Bar */}
            <div className="border-primary/10 bg-card/20 flex items-center gap-1 border-b px-2">
                {tabs.map((tab) => {
                    const isPoppedOut = poppedOutTabs.has(tab.id);

                    return (
                        <div
                            key={tab.id}
                            className={`group relative flex cursor-pointer items-center gap-2 px-4 py-2.5 transition-colors ${
                                isPoppedOut
                                    ? "border-b-2 border-purple-500 bg-purple-500/20 text-purple-400"
                                    : tab.id === activeTab
                                      ? "bg-primary/10 text-primary border-primary border-b-2"
                                      : "text-muted-foreground hover:bg-card/30 hover:text-foreground"
                            }`}
                            onClick={() => !isPoppedOut && handleTabClick(tab.id)}
                            title={isPoppedOut ? "Tab is popped out to separate window" : undefined}
                        >
                            {isPoppedOut && (
                                <ExternalLink className="h-3.5 w-3.5 text-purple-400" />
                            )}
                            <span className="text-sm font-medium">{tab.name}</span>

                            {/* Tab Actions (show on hover) */}
                            {!isPoppedOut && (
                                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button
                                        onClick={(e) => handleTabPopout(tab.id, e)}
                                        className="hover:bg-primary/20 rounded p-1 transition-colors"
                                        title="Pop out to window"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                    </button>
                                    {tabs.length > 1 && (
                                        <button
                                            onClick={(e) => handleTabDelete(tab.id, e)}
                                            className="hover:bg-destructive/20 rounded p-1 transition-colors"
                                            title="Close tab"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* New Tab Button */}
                <button
                    onClick={onTabCreate}
                    className="hover:bg-card/30 rounded p-2 transition-colors"
                    title="New tab"
                >
                    <Plus className="text-muted-foreground h-4 w-4" />
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {isActiveTabPoppedOut ? (
                    <div className="flex h-full w-full items-center justify-center">
                        <div className="text-center">
                            <ExternalLink className="text-secondary mx-auto mb-4 h-12 w-12" />
                            <h2 className="text-secondary mb-2 text-xl font-bold">
                                Tab Popped Out
                            </h2>
                            <p className="text-muted-foreground">
                                This tab is currently open in a separate window
                            </p>
                        </div>
                    </div>
                ) : (
                    <PanelGrid
                        panels={activePanels}
                        onLayoutChange={(layout) => {
                            // Persist layout via LayoutContext
                            updateTabLayout(activeTab, layout);
                        }}
                        onPanelClose={(panelId) => {
                            // TODO: Handle panel close - remove from tab's panelIds
                            console.log("Panel closed:", panelId);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
