/**
 * PopoutWindow Component
 *
 * Renders a single tab in a separate window.
 * Syncs state with main window via BroadcastChannel.
 */

import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PanelGrid } from "./PanelGrid";
import { Header } from "./Header";
import { useLayout } from "@/contexts/LayoutContext";
import { useDAWStore } from "@/stores/dawStore";
import { DEFAULT_PANELS } from "@/config/layout.config";
import { BROADCAST_KEYS } from "@/config/layout.config";

export function PopoutWindow() {
    const [searchParams] = useSearchParams();
    const tabId = searchParams.get("tab");
    const panelIdsParam = searchParams.get("panels");

    const { tabs, updateTabLayout, closePopout, popoutTab } = useLayout();

    // Get state from Zustand store
    const analytics = useDAWStore(state => state.analytics);
    const activeSynths = useDAWStore(state => state.activeSynths);

    const isEngineRunning = analytics !== null;
    const cpuUsage = analytics?.cpu_usage || 0;
    const activeSynthsCount = Object.keys(activeSynths).length;

    // Parse panel IDs from URL
    const panelIds = panelIdsParam ? panelIdsParam.split(",") : [];

    // Find the tab configuration
    const tab = tabs.find((t) => t.id === tabId);

    // Get panels for this tab
    const panels = DEFAULT_PANELS.filter((p) => panelIds.includes(p.id));

    // Register this popout on mount
    useEffect(() => {
        if (tabId) {
            console.log(`🪟 Popout window registering tab: ${tabId}`);
            // Mark this tab as popped out in the global state (don't open another window!)
            popoutTab(tabId, false);
        }
    }, [tabId, popoutTab]);

    // Handle window close - unregister popout
    useEffect(() => {
        const channel = new BroadcastChannel("sonic-claude-sync");

        const handleClose = () => {
            if (tabId) {
                console.log(`🪟 Popout window closing, broadcasting close event for tab: ${tabId}`);

                // Send close message directly via BroadcastChannel
                // This is more reliable than relying on state updates
                channel.postMessage({
                    key: BROADCAST_KEYS.POPOUT_CLOSED,
                    value: { tabId },
                    timestamp: Date.now(),
                });

                // Also call closePopout for local cleanup
                closePopout(tabId);
            }
        };

        // Use pagehide (most reliable for window close)
        window.addEventListener("pagehide", handleClose);

        return () => {
            window.removeEventListener("pagehide", handleClose);
            channel.close();
        };
    }, [tabId, closePopout]);

    // Set window title
    useEffect(() => {
        if (tab) {
            document.title = `Sonic Claude - ${tab.name}`;
        }
    }, [tab]);

    if (!tabId || !tab) {
        return (
            <div className="bg-background flex h-screen w-screen items-center justify-center">
                <div className="text-center">
                    <h1 className="text-primary mb-2 text-2xl font-bold">Invalid Popout</h1>
                    <p className="text-muted-foreground">Tab not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background flex h-screen w-screen flex-col overflow-hidden">
            {/* Header - Same as main window */}
            <Header
                isEngineRunning={isEngineRunning}
                cpuUsage={cpuUsage}
                activeSynths={activeSynthsCount}
            />

            {/* Panel Grid */}
            <div className="flex-1 overflow-hidden">
                <PanelGrid
                    panels={panels}
                    onLayoutChange={(layout) => {
                        if (tabId) {
                            updateTabLayout(tabId, layout);
                        }
                    }}
                    onPanelClose={(panelId) => {
                        console.log("Panel closed in popout:", panelId);
                    }}
                />
            </div>
        </div>
    );
}
