/**
 * Layout Zustand Store
 *
 * Complete state management for application layout using Zustand with automatic persistence.
 *
 * Responsibilities:
 * - Manage all tabs and their panel assignments
 * - Track which tabs are popped out to separate windows
 * - Sync state across all windows via WindowManager
 * - Persist layout to localStorage
 * - Handle tab creation, deletion, and panel movement
 * - Panel maximize/minimize and attachment system
 * - X-Ray mode (see through to another tab)
 */

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { windowManager } from "@/services/window-manager";
import { DEFAULT_LAYOUT_STATE, BROADCAST_KEYS } from "@/config/layout.config";
import type { GridLayoutItem, PanelAttachment } from "@/types/grid-layout";

const LAYOUT_STORAGE_KEY = 'sonic-claude-layout';

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

interface LayoutStore {
    // ========================================================================
    // STATE
    // ========================================================================
    tabs: TabConfig[];
    activeTab: string;
    poppedOutTabs: Set<string>; // Ephemeral - not persisted
    layouts: TabLayouts;
    maximizedPanel: string | null;
    attachments: Record<string, PanelAttachment>;
    
    // X-Ray Mode - See through to another tab
    xrayEnabled: boolean;
    xraySourceTab: string | null;
    xrayTargetTab: string | null;
    xrayOpacity: number;

    // ========================================================================
    // ACTIONS - Tab Management
    // ========================================================================
    setActiveTab: (tabId: string) => void;
    createTab: (name: string, panelIds: string[]) => void;
    deleteTab: (tabId: string) => void;
    renameTab: (tabId: string, newName: string) => void;

    // ========================================================================
    // ACTIONS - Panel Management
    // ========================================================================
    movePanelToTab: (panelId: string, fromTabId: string, toTabId: string) => void;
    updatePanelLayout: (tabId: string, panelId: string, layout: LayoutItem) => void;
    updateTabLayout: (tabId: string, layouts: GridLayoutItem[]) => void;

    // ========================================================================
    // ACTIONS - Panel Maximize/Minimize
    // ========================================================================
    maximizePanel: (panelId: string) => void;
    minimizePanel: () => void;

    // ========================================================================
    // ACTIONS - Panel Attachment System
    // ========================================================================
    attachPanel: (panelId: string, attachment: PanelAttachment) => void;
    detachPanel: (panelId: string) => void;

    // ========================================================================
    // ACTIONS - Window Management
    // ========================================================================
    popoutTab: (tabId: string, openWindow?: boolean) => void;
    closePopout: (tabId: string) => void;

    // ========================================================================
    // ACTIONS - X-Ray Mode
    // ========================================================================
    enableXray: (targetTabId: string) => void;
    disableXray: () => void;
    setXrayOpacity: (opacity: number) => void;

    // ========================================================================
    // INTERNAL - BroadcastChannel Sync
    // ========================================================================
    _broadcastState: () => void;
    _initializeWindowSync: () => void;
}

export const useLayoutStore = create<LayoutStore>()(
    subscribeWithSelector(
        persist(
            (set, get) => ({
                // ====================================================================
                // INITIAL STATE
                // ====================================================================
                tabs: DEFAULT_LAYOUT_STATE.tabs || [],
                activeTab: DEFAULT_LAYOUT_STATE.activeTab || "",
                poppedOutTabs: new Set(), // Always start with no popouts (ephemeral)
                layouts: DEFAULT_LAYOUT_STATE.layouts || {},
                maximizedPanel: null,
                attachments: {},
                xrayEnabled: false,
                xraySourceTab: null,
                xrayTargetTab: null,
                xrayOpacity: 0.5,

                // ====================================================================
                // TAB MANAGEMENT ACTIONS
                // ====================================================================
                setActiveTab: (tabId) => {
                    set({ activeTab: tabId });
                    get()._broadcastState();
                },

                createTab: (name, panelIds) => {
                    const newTab: TabConfig = {
                        id: `tab-${Date.now()}`,
                        name,
                        panelIds,
                    };
                    set((state) => ({
                        tabs: [...state.tabs, newTab],
                        activeTab: newTab.id,
                    }));
                    get()._broadcastState();
                },

                deleteTab: (tabId) => {
                    set((state) => {
                        const newTabs = state.tabs.filter((t) => t.id !== tabId);
                        return {
                            tabs: newTabs,
                            activeTab: state.activeTab === tabId ? newTabs[0]?.id || "" : state.activeTab,
                        };
                    });
                    get()._broadcastState();
                },

                renameTab: (tabId, newName) => {
                    set((state) => ({
                        tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, name: newName } : t)),
                    }));
                    get()._broadcastState();
                },

                // ====================================================================
                // PANEL MANAGEMENT ACTIONS
                // ====================================================================
                movePanelToTab: (panelId, fromTabId, toTabId) => {
                    set((state) => ({
                        tabs: state.tabs.map((tab) => {
                            if (tab.id === fromTabId) {
                                return { ...tab, panelIds: tab.panelIds.filter((id) => id !== panelId) };
                            }
                            if (tab.id === toTabId) {
                                return { ...tab, panelIds: [...tab.panelIds, panelId] };
                            }
                            return tab;
                        }),
                    }));
                    get()._broadcastState();
                },

                updatePanelLayout: (tabId, panelId, layout) => {
                    set((state) => ({
                        layouts: {
                            ...state.layouts,
                            [tabId]: {
                                ...state.layouts[tabId],
                                [panelId]: layout,
                            },
                        },
                    }));
                    get()._broadcastState();
                },

                updateTabLayout: (tabId, layouts) => {
                    const panelLayout: PanelLayout = {};
                    layouts.forEach((layout) => {
                        const { i, ...layoutItem } = layout;
                        panelLayout[i] = layoutItem;
                    });
                    set((state) => ({
                        layouts: {
                            ...state.layouts,
                            [tabId]: panelLayout,
                        },
                    }));
                    get()._broadcastState();
                },

                // ====================================================================
                // PANEL MAXIMIZE/MINIMIZE ACTIONS
                // ====================================================================
                maximizePanel: (panelId) => {
                    set({ maximizedPanel: panelId });
                    get()._broadcastState();
                },

                minimizePanel: () => {
                    set({ maximizedPanel: null });
                    get()._broadcastState();
                },

                // ====================================================================
                // PANEL ATTACHMENT ACTIONS
                // ====================================================================
                attachPanel: (panelId, attachment) => {
                    set((state) => ({
                        attachments: {
                            ...state.attachments,
                            [panelId]: attachment,
                        },
                    }));
                    get()._broadcastState();
                },

                detachPanel: (panelId) => {
                    set((state) => {
                        const { [panelId]: removed, ...remainingAttachments } = state.attachments;
                        return { attachments: remainingAttachments };
                    });
                    get()._broadcastState();
                },

                // ====================================================================
                // WINDOW MANAGEMENT ACTIONS
                // ====================================================================
                popoutTab: (tabId, openWindow = true) => {
                    const { tabs } = get();
                    const tab = tabs.find((t) => t.id === tabId);
                    if (!tab) return;

                    // Open popout window (only if called from main window)
                    if (openWindow) {
                        windowManager.openPopout(tabId, tab.panelIds);
                    }

                    // Mark as popped out
                    set((state) => {
                        const newPoppedOut = new Set(state.poppedOutTabs);
                        newPoppedOut.add(tabId);
                        return { poppedOutTabs: newPoppedOut };
                    });
                    get()._broadcastState();
                },

                closePopout: (tabId) => {
                    set((state) => {
                        const newPoppedOut = new Set(state.poppedOutTabs);
                        newPoppedOut.delete(tabId);
                        return { poppedOutTabs: newPoppedOut };
                    });
                    get()._broadcastState();
                },

                // ====================================================================
                // X-RAY MODE ACTIONS
                // ====================================================================
                enableXray: (targetTabId) => {
                    set((state) => {
                        // Don't enable x-ray if target is the same as active tab
                        if (targetTabId === state.activeTab) {
                            console.warn("Cannot x-ray the active tab");
                            return state;
                        }

                        return {
                            xrayEnabled: true,
                            xraySourceTab: state.activeTab,
                            xrayTargetTab: targetTabId,
                            // Reset to 50% only if x-ray was previously disabled
                            xrayOpacity: state.xrayEnabled ? state.xrayOpacity : 0.5,
                        };
                    });
                    get()._broadcastState();
                },

                disableXray: () => {
                    set({
                        xrayEnabled: false,
                        xraySourceTab: null,
                        xrayTargetTab: null,
                    });
                    get()._broadcastState();
                },

                setXrayOpacity: (opacity) => {
                    set({ xrayOpacity: Math.max(0, Math.min(1, opacity)) }); // Clamp to 0-1
                    get()._broadcastState();
                },

                // ====================================================================
                // INTERNAL - BROADCASTCHANNEL SYNC
                // ====================================================================
                _broadcastState: () => {
                    const state = get();
                    // IMPORTANT: Only broadcast serializable state (no functions!)
                    windowManager.broadcastState(BROADCAST_KEYS.LAYOUT, {
                        tabs: state.tabs,
                        activeTab: state.activeTab,
                        poppedOutTabs: Array.from(state.poppedOutTabs),
                        layouts: state.layouts,
                        maximizedPanel: state.maximizedPanel,
                        attachments: state.attachments,
                        xrayEnabled: state.xrayEnabled,
                        xraySourceTab: state.xraySourceTab,
                        xrayTargetTab: state.xrayTargetTab,
                        xrayOpacity: state.xrayOpacity,
                    });
                },

                _initializeWindowSync: () => {
                    // Subscribe to layout updates from other windows
                    windowManager.subscribeToState(
                        BROADCAST_KEYS.LAYOUT,
                        (newState: any) => {
                            // IMPORTANT: Only set serializable state (no functions!)
                            set({
                                tabs: newState.tabs,
                                activeTab: newState.activeTab,
                                poppedOutTabs: new Set(newState.poppedOutTabs),
                                layouts: newState.layouts,
                                maximizedPanel: newState.maximizedPanel,
                                attachments: newState.attachments,
                                xrayEnabled: newState.xrayEnabled,
                                xraySourceTab: newState.xraySourceTab,
                                xrayTargetTab: newState.xrayTargetTab,
                                xrayOpacity: newState.xrayOpacity,
                            });
                        }
                    );

                    // Listen for popout close events
                    windowManager.subscribeToState(
                        BROADCAST_KEYS.POPOUT_CLOSED,
                        (data: { tabId: string }) => {
                            console.log(`📡 Received popout close event for tab: ${data.tabId}`);
                            set((state) => {
                                const newPoppedOut = new Set(state.poppedOutTabs);
                                newPoppedOut.delete(data.tabId);
                                return { poppedOutTabs: newPoppedOut };
                            });
                        }
                    );
                },
            }),
            {
                name: LAYOUT_STORAGE_KEY,

                // Partialize: ONLY persist layout data, NOT ephemeral window state
                partialize: (state) => ({
                    tabs: state.tabs,
                    activeTab: state.activeTab,
                    layouts: state.layouts,
                    maximizedPanel: state.maximizedPanel,
                    attachments: state.attachments,
                    xrayEnabled: state.xrayEnabled,
                    xraySourceTab: state.xraySourceTab,
                    xrayTargetTab: state.xrayTargetTab,
                    xrayOpacity: state.xrayOpacity,
                    // NOTE: poppedOutTabs is NOT persisted (ephemeral window state)
                }),

                // Merge: Restore persisted state on hydration
                merge: (persistedState: any, currentState) => {
                    // Merge tabs: Add any new tabs from DEFAULT_LAYOUT_STATE that aren't in persisted state
                    const persistedTabIds = new Set((persistedState.tabs || []).map((t: TabConfig) => t.id));
                    const newTabs = DEFAULT_LAYOUT_STATE.tabs.filter(t => !persistedTabIds.has(t.id));
                    const mergedTabs = [...(persistedState.tabs || []), ...newTabs];

                    return {
                        ...currentState,
                        ...persistedState,
                        tabs: mergedTabs,
                        // IMPORTANT: Always start with no popouts (windows are closed on page load)
                        poppedOutTabs: new Set(),
                    };
                },

                // onRehydrateStorage: Called after hydration completes
                onRehydrateStorage: () => {
                    console.log('🔄 Zustand persist (layout): Starting hydration...');
                    return (state, error) => {
                        if (error) {
                            console.error('❌ Zustand persist (layout): Hydration failed:', error);
                        } else {
                            console.log('✅ Zustand persist (layout): Hydration complete', state);
                            // Initialize window sync after hydration
                            state?._initializeWindowSync();
                        }
                    };
                },
            }
        )
    )
);


