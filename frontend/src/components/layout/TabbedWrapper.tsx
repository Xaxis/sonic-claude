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

import { useState, useEffect } from "react";
import { Plus, X, ExternalLink, Scan, Layers } from "lucide-react";
import { PanelGrid, type PanelConfig } from "./PanelGrid";
import { ActivityBadge } from "@/components/activity";
import { useLayout } from "@/contexts/LayoutContext";
import { useActivity } from "@/contexts/ActivityContext";
import { IconButton } from "@/components/ui/icon-button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

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
    const {
        updateTabLayout,
        poppedOutTabs,
        xrayEnabled,
        xraySourceTab,
        xrayTargetTab,
        xrayOpacity,
        enableXray,
        disableXray,
        setXrayOpacity,
    } = useLayout();

    const { getActivitiesForTab } = useActivity();

    // Use controlled or local state
    const activeTab = controlledActiveTab ?? localActiveTab;

    const handleTabClick = (tabId: string) => {
        setLocalActiveTab(tabId);
        onTabChange?.(tabId);
    };

    // Keyboard shortcut for x-ray mode (Cmd/Ctrl + X)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + X to toggle x-ray mode
            if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
                e.preventDefault();

                if (xrayEnabled) {
                    disableXray();
                } else {
                    // Find the first non-active, non-popped-out tab
                    const otherTab = tabs.find(t => t.id !== activeTab && !poppedOutTabs.has(t.id));
                    if (otherTab) {
                        enableXray(otherTab.id);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [xrayEnabled, activeTab, tabs, poppedOutTabs, enableXray, disableXray]);

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

    // Get panels for x-ray target tab (if enabled)
    const xrayTabConfig = xrayEnabled && xrayTargetTab
        ? tabs.find((t) => t.id === xrayTargetTab)
        : null;
    const xrayPanels = xrayTabConfig
        ? panels.filter((p) => xrayTabConfig.panelIds.includes(p.id))
        : [];

    // Check if active tab is popped out
    const isActiveTabPoppedOut = poppedOutTabs.has(activeTab);

    return (
        <div className="flex h-full w-full flex-col overflow-hidden">
            {/* Tab Bar */}
            <div className="border-primary/10 bg-card/20 flex items-center gap-1 border-b px-2">
                {tabs.map((tab) => {
                    const isPoppedOut = poppedOutTabs.has(tab.id);
                    const isXrayTarget = xrayEnabled && tab.id === xrayTargetTab;
                    const isXraySource = xrayEnabled && tab.id === xraySourceTab;
                    const tabActivities = getActivitiesForTab(tab.id);

                    return (
                        <div
                            key={tab.id}
                            className={`group relative flex cursor-pointer items-center gap-2 px-4 py-2.5 transition-all duration-300 ${
                                isPoppedOut
                                    ? "border-b-2 border-purple-500 bg-purple-500/20 text-purple-400"
                                    : isXrayTarget
                                      ? "border-b-2 border-cyan-500 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 shadow-lg shadow-cyan-500/20"
                                      : isXraySource
                                        ? "border-b-2 border-purple-500/50 bg-purple-500/10 text-purple-300"
                                        : tab.id === activeTab
                                          ? "bg-primary/10 text-primary border-primary border-b-2"
                                          : "text-muted-foreground hover:bg-card/30 hover:text-foreground"
                            }`}
                            onClick={() => !isPoppedOut && handleTabClick(tab.id)}
                            title={
                                isPoppedOut
                                    ? "Tab is popped out to separate window"
                                    : isXrayTarget
                                      ? "X-Ray Target - Viewing this tab"
                                      : isXraySource
                                        ? "X-Ray Source - Currently active"
                                        : undefined
                            }
                        >
                            {isPoppedOut && (
                                <ExternalLink className="h-3.5 w-3.5 text-purple-400" />
                            )}
                            {isXrayTarget && (
                                <Scan className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                            )}
                            <span className="text-sm font-medium">{tab.name}</span>

                            {/* AI Activity Badge */}
                            <ActivityBadge count={tabActivities.length} />

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

                {/* Spacer */}
                <div className="flex-1" />

                {/* X-Ray Mode Controls */}
                {tabs.length > 1 && !isActiveTabPoppedOut && (
                    <div className="flex items-center gap-2 border-l border-border/50 pl-3 ml-2">
                        {/* X-Ray Toggle Button */}
                        <IconButton
                            icon={Scan}
                            tooltip={xrayEnabled ? "Disable X-Ray Mode (⌘X)" : "Enable X-Ray Mode (⌘X)"}
                            onClick={() => {
                                if (xrayEnabled) {
                                    disableXray();
                                } else {
                                    // Find the previously active tab or first non-active tab
                                    const otherTab = tabs.find(t => t.id !== activeTab && !poppedOutTabs.has(t.id));
                                    if (otherTab) {
                                        enableXray(otherTab.id);
                                    }
                                }
                            }}
                            variant={xrayEnabled ? "default" : "ghost"}
                            size="icon-sm"
                            className={xrayEnabled ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" : ""}
                        />

                        {/* X-Ray Slider (shown when x-ray is enabled) */}
                        {xrayEnabled && (
                            <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">
                                    X-RAY
                                </Label>
                                <Slider
                                    value={[xrayOpacity * 100]}
                                    onValueChange={(values) => setXrayOpacity(values[0] / 100)}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="w-24"
                                />
                                <span className="text-xs text-muted-foreground w-8 text-right">
                                    {Math.round(xrayOpacity * 100)}%
                                </span>
                            </div>
                        )}

                        {/* Target Tab Selector (shown when x-ray is enabled) */}
                        {xrayEnabled && tabs.length > 2 && (
                            <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">
                                    View
                                </Label>
                                <select
                                    value={xrayTargetTab || ""}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            enableXray(e.target.value);
                                        }
                                    }}
                                    className="bg-card border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    {tabs
                                        .filter(t => t.id !== activeTab && !poppedOutTabs.has(t.id))
                                        .map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.name}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                        )}
                    </div>
                )}

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
            <div className="flex-1 overflow-hidden relative">
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
                    <>
                        {/* X-Ray Background Layer (target tab) - Skews INTO view */}
                        {xrayEnabled && xrayPanels.length > 0 && (
                            <div
                                className="absolute inset-0 transition-all duration-300"
                                style={{
                                    opacity: xrayOpacity,
                                    zIndex: xrayOpacity > 0 ? 1 : 0, // Bring to front when opacity > 0
                                    pointerEvents: xrayOpacity > 0 ? 'auto' : 'none', // Enable interactions when opacity > 0
                                    transform: `
                                        perspective(1200px)
                                        rotateX(${(1 - xrayOpacity) * -12}deg)
                                        rotateY(${(1 - xrayOpacity) * 5}deg)
                                        scale(${0.92 + (xrayOpacity * 0.08)})
                                        translateZ(${(xrayOpacity - 1) * 80}px)
                                    `,
                                    transformOrigin: 'center center',
                                    transformStyle: 'preserve-3d',
                                }}
                            >
                                <PanelGrid
                                    panels={xrayPanels}
                                    onLayoutChange={(layout) => {
                                        // Persist layout for x-ray tab
                                        if (xrayTargetTab) {
                                            updateTabLayout(xrayTargetTab, layout);
                                        }
                                    }}
                                    onPanelClose={(panelId) => {
                                        console.log("Panel closed:", panelId);
                                    }}
                                />
                            </div>
                        )}

                        {/* Active Tab Layer (foreground) - Skews OUT of view */}
                        <div
                            className="absolute inset-0 transition-all duration-300"
                            style={{
                                opacity: xrayEnabled ? 1 - xrayOpacity : 1, // Fully transparent at 100% x-ray opacity
                                zIndex: xrayEnabled && xrayOpacity > 0 ? 0 : 1, // Send to back when x-ray opacity > 0
                                pointerEvents: xrayEnabled && xrayOpacity > 0 ? 'none' : 'auto', // Disable interactions when x-ray opacity > 0
                                transform: xrayEnabled ? `
                                    perspective(1200px)
                                    rotateX(${xrayOpacity * 8}deg)
                                    rotateY(${xrayOpacity * -3}deg)
                                    scale(${1 - (xrayOpacity * 0.05)})
                                    translateZ(${xrayOpacity * 40}px)
                                ` : 'none',
                                transformOrigin: 'center center',
                                transformStyle: 'preserve-3d',
                            }}
                        >
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
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
