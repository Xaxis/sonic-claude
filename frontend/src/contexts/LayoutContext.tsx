/**
 * LayoutContext - Global state management for tabs, panels, and windows
 *
 * Responsibilities:
 * - Manage all tabs and their panel assignments
 * - Track which tabs are popped out to separate windows
 * - Sync state across all windows via WindowManager
 * - Persist layout to localStorage
 * - Handle tab creation, deletion, and panel movement
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { windowManager } from "@/services/window-manager";
import { DEFAULT_LAYOUT_STATE, STORAGE_KEYS, BROADCAST_KEYS } from "@/config/layout.config";
import type { GridLayoutItem, PanelAttachment } from "@/types/grid-layout";

export interface TabConfig {
    id: string;
    name: string;
    panelIds: string[];
}

// Layout item for a single panel
export interface LayoutItem {
    x: number;
    y: number;
    w: number;
    h: number;
}

// Map of panel IDs to their layout items
export interface PanelLayout {
    [panelId: string]: LayoutItem;
}

// Map of tab IDs to their panel layouts
export interface TabLayouts {
    [tabId: string]: PanelLayout;
}

interface LayoutState {
    tabs: TabConfig[];
    activeTab: string;
    poppedOutTabs: Set<string>;
    layouts: TabLayouts;
    maximizedPanel: string | null; // Panel ID that is currently maximized
    attachments: Record<string, PanelAttachment>; // Panel ID -> attachment state
}

interface LayoutContextValue extends LayoutState {
    // Tab management
    setActiveTab: (tabId: string) => void;
    createTab: (name: string, panelIds: string[]) => void;
    deleteTab: (tabId: string) => void;
    renameTab: (tabId: string, newName: string) => void;

    // Panel management
    movePanelToTab: (panelId: string, fromTabId: string, toTabId: string) => void;
    updatePanelLayout: (tabId: string, panelId: string, layout: LayoutItem) => void;
    updateTabLayout: (tabId: string, layouts: GridLayoutItem[]) => void;

    // Panel maximize/minimize
    maximizePanel: (panelId: string) => void;
    minimizePanel: () => void;

    // Panel attachment system
    attachPanel: (panelId: string, attachment: PanelAttachment) => void;
    detachPanel: (panelId: string) => void;

    // Window management
    popoutTab: (tabId: string, openWindow?: boolean) => void;
    closePopout: (tabId: string) => void;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<LayoutState>(() => {
        // Load from localStorage
        const stored = localStorage.getItem(STORAGE_KEYS.LAYOUT);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Validate that we have tabs
                if (parsed.tabs && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
                    // IMPORTANT: Clear poppedOutTabs on page load since windows are closed
                    // Popout windows will re-register themselves if they're still open
                    return {
                        ...parsed,
                        poppedOutTabs: new Set(), // Always start with no popouts
                    };
                } else {
                    console.warn("Stored layout has no tabs, using defaults");
                }
            } catch (e) {
                console.error("Failed to parse stored layout:", e);
            }
        }

        // Use default state from config
        console.log("Using DEFAULT_LAYOUT_STATE:", DEFAULT_LAYOUT_STATE);
        return {
            ...DEFAULT_LAYOUT_STATE,
            poppedOutTabs: new Set(), // Always start with no popouts
            maximizedPanel: null, // No panel maximized by default
            attachments: {}, // No attachments by default
        };
    });

    // Persist to localStorage whenever state changes
    useEffect(() => {
        const toStore = {
            ...state,
            poppedOutTabs: Array.from(state.poppedOutTabs),
        };
        localStorage.setItem(STORAGE_KEYS.LAYOUT, JSON.stringify(toStore));
    }, [state]);

    // Sync state across windows via WindowManager
    useEffect(() => {
        const unsubscribeLayout = windowManager.subscribeToState(
            BROADCAST_KEYS.LAYOUT,
            (newState: LayoutState) => {
                setState({
                    ...newState,
                    poppedOutTabs: new Set(newState.poppedOutTabs),
                });
            }
        );

        // Listen for popout close events
        const unsubscribePopoutClosed = windowManager.subscribeToState(
            BROADCAST_KEYS.POPOUT_CLOSED,
            (data: { tabId: string }) => {
                console.log(`📡 Received popout close event for tab: ${data.tabId}`);
                setState((prev) => {
                    const newPoppedOut = new Set(prev.poppedOutTabs);
                    newPoppedOut.delete(data.tabId);
                    return { ...prev, poppedOutTabs: newPoppedOut };
                });
            }
        );

        return () => {
            unsubscribeLayout();
            unsubscribePopoutClosed();
        };
    }, []);

    const broadcastState = useCallback((newState: LayoutState) => {
        windowManager.broadcastState(BROADCAST_KEYS.LAYOUT, {
            ...newState,
            poppedOutTabs: Array.from(newState.poppedOutTabs),
        });
    }, []);

    const setActiveTab = useCallback(
        (tabId: string) => {
            setState((prev) => {
                const newState = { ...prev, activeTab: tabId };
                broadcastState(newState);
                return newState;
            });
        },
        [broadcastState]
    );

    const createTab = useCallback(
        (name: string, panelIds: string[]) => {
            setState((prev) => {
                const newTab: TabConfig = {
                    id: `tab-${Date.now()}`,
                    name,
                    panelIds,
                };
                const newState = {
                    ...prev,
                    tabs: [...prev.tabs, newTab],
                    activeTab: newTab.id,
                };
                broadcastState(newState);
                return newState;
            });
        },
        [broadcastState]
    );

    const deleteTab = useCallback(
        (tabId: string) => {
            setState((prev) => {
                const newTabs = prev.tabs.filter((t) => t.id !== tabId);
                const newState = {
                    ...prev,
                    tabs: newTabs,
                    activeTab: prev.activeTab === tabId ? newTabs[0]?.id || "" : prev.activeTab,
                };
                broadcastState(newState);
                return newState;
            });
        },
        [broadcastState]
    );

    const renameTab = useCallback(
        (tabId: string, newName: string) => {
            setState((prev) => {
                const newState = {
                    ...prev,
                    tabs: prev.tabs.map((t) => (t.id === tabId ? { ...t, name: newName } : t)),
                };
                broadcastState(newState);
                return newState;
            });
        },
        [broadcastState]
    );

    const movePanelToTab = useCallback(
        (panelId: string, fromTabId: string, toTabId: string) => {
            setState((prev) => {
                const newTabs = prev.tabs.map((tab) => {
                    if (tab.id === fromTabId) {
                        return { ...tab, panelIds: tab.panelIds.filter((id) => id !== panelId) };
                    }
                    if (tab.id === toTabId) {
                        return { ...tab, panelIds: [...tab.panelIds, panelId] };
                    }
                    return tab;
                });
                const newState = { ...prev, tabs: newTabs };
                broadcastState(newState);
                return newState;
            });
        },
        [broadcastState]
    );

    const updatePanelLayout = useCallback(
        (tabId: string, panelId: string, layout: LayoutItem) => {
            setState((prev) => {
                const newState = {
                    ...prev,
                    layouts: {
                        ...prev.layouts,
                        [tabId]: {
                            ...prev.layouts[tabId],
                            [panelId]: layout,
                        },
                    },
                };
                broadcastState(newState);
                return newState;
            });
        },
        [broadcastState]
    );

    const updateTabLayout = useCallback(
        (tabId: string, layouts: GridLayoutItem[]) => {
            setState((prev) => {
                const panelLayout: PanelLayout = {};
                layouts.forEach((layout) => {
                    const { i, ...layoutItem } = layout;
                    panelLayout[i] = layoutItem;
                });
                const newState = {
                    ...prev,
                    layouts: {
                        ...prev.layouts,
                        [tabId]: panelLayout,
                    },
                };
                broadcastState(newState);
                return newState;
            });
        },
        [broadcastState]
    );

    const popoutTab = useCallback(
        (tabId: string, openWindow: boolean = true) => {
            const tab = state.tabs.find((t) => t.id === tabId);
            if (!tab) return;

            // Open popout window (only if called from main window)
            if (openWindow) {
                windowManager.openPopout(tabId, tab.panelIds);
            }

            // Mark as popped out
            setState((prev) => {
                const newPoppedOut = new Set(prev.poppedOutTabs);
                newPoppedOut.add(tabId);
                const newState = { ...prev, poppedOutTabs: newPoppedOut };
                broadcastState(newState);
                return newState;
            });
        },
        [state.tabs, broadcastState]
    );

    const closePopout = useCallback(
        (tabId: string) => {
            setState((prev) => {
                const newPoppedOut = new Set(prev.poppedOutTabs);
                newPoppedOut.delete(tabId);
                const newState = { ...prev, poppedOutTabs: newPoppedOut };
                broadcastState(newState);
                return newState;
            });
        },
        [broadcastState]
    );

    const maximizePanel = useCallback(
        (panelId: string) => {
            setState((prev) => {
                const newState = { ...prev, maximizedPanel: panelId };
                broadcastState(newState);
                return newState;
            });
        },
        [broadcastState]
    );

    const minimizePanel = useCallback(() => {
        setState((prev) => {
            const newState = { ...prev, maximizedPanel: null };
            broadcastState(newState);
            return newState;
        });
    }, [broadcastState]);

    const attachPanel = useCallback(
        (panelId: string, attachment: PanelAttachment) => {
            setState((prev) => {
                const newState = {
                    ...prev,
                    attachments: {
                        ...prev.attachments,
                        [panelId]: attachment,
                    },
                };
                broadcastState(newState);
                return newState;
            });
        },
        [broadcastState]
    );

    const detachPanel = useCallback(
        (panelId: string) => {
            setState((prev) => {
                const { [panelId]: removed, ...remainingAttachments } = prev.attachments;
                const newState = {
                    ...prev,
                    attachments: remainingAttachments,
                };
                broadcastState(newState);
                return newState;
            });
        },
        [broadcastState]
    );

    const value: LayoutContextValue = {
        ...state,
        setActiveTab,
        createTab,
        deleteTab,
        renameTab,
        movePanelToTab,
        updatePanelLayout,
        updateTabLayout,
        maximizePanel,
        minimizePanel,
        attachPanel,
        detachPanel,
        popoutTab,
        closePopout,
    };

    return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout() {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error("useLayout must be used within LayoutProvider");
    }
    return context;
}
