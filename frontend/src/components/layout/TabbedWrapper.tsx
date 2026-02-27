/**
 * TabbedWrapper - Workspace panel renderer
 *
 * Renders the active workspace's panels plus the optional X-Ray
 * see-through layer. Navigation (tab switching, tab creation, etc.) has moved
 * to NavSidebar — this component is purely a panel content host.
 *
 * Layers (z-stacked inside a single relative container):
 *   X-Ray layer   — target tab's PanelGrid, transformed in 3-D with opacity
 *   Active layer  — current tab's PanelGrid, counter-transformed when x-ray is on
 *   Popped-out    — placeholder shown when the active tab is in a separate window
 */

import { ExternalLink } from "lucide-react";
import { PanelGrid, type PanelConfig } from "./PanelGrid";
import { useLayoutStore } from "@/stores/layoutStore";

export interface TabConfig {
    id: string;
    name: string;
    panelIds: string[];
}

interface TabbedWrapperProps {
    panels: PanelConfig[];
    tabs: TabConfig[];
    activeTab?: string;
    // The remaining props are accepted for API compatibility but are handled by NavSidebar.
    onTabChange?: (tabId: string) => void;
    onTabCreate?: () => void;
    onTabDelete?: (tabId: string) => void;
    onTabPopout?: (tabId: string) => void;
}

export function TabbedWrapper({
    panels,
    tabs = [],
    activeTab: controlledActiveTab,
}: TabbedWrapperProps) {
    const {
        updateTabLayout,
        poppedOutTabs,
        xrayEnabled,
        xrayTargetTab,
        xrayOpacity,
    } = useLayoutStore();

    const activeTab = controlledActiveTab ?? tabs[0]?.id ?? "";

    // Derive panel sets -------------------------------------------------------
    const activeTabConfig = tabs.find((t) => t.id === activeTab);
    const activePanels    = activeTabConfig
        ? panels.filter((p) => activeTabConfig.panelIds.includes(p.id))
        : [];

    const xrayTabConfig = xrayEnabled && xrayTargetTab
        ? tabs.find((t) => t.id === xrayTargetTab)
        : null;
    const xrayPanels = xrayTabConfig
        ? panels.filter((p) => xrayTabConfig.panelIds.includes(p.id))
        : [];

    const isActiveTabPoppedOut = poppedOutTabs.has(activeTab);

    // Empty state -------------------------------------------------------------
    if (tabs.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <p className="text-muted-foreground text-sm">
                    No workspaces — create one using the sidebar.
                </p>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full overflow-hidden">

            {isActiveTabPoppedOut ? (
                /* ── Popped-out placeholder ──────────────────────────────── */
                <div className="flex h-full w-full items-center justify-center">
                    <div className="text-center">
                        <ExternalLink className="text-secondary mx-auto mb-4 h-12 w-12" />
                        <h2 className="text-secondary mb-2 text-xl font-bold">Tab Popped Out</h2>
                        <p className="text-muted-foreground">
                            This workspace is open in a separate window
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* ── X-Ray layer (target tab, skews into view) ──────── */}
                    {xrayEnabled && xrayPanels.length > 0 && (
                        <div
                            className="absolute inset-0 transition-all duration-300"
                            style={{
                                opacity: xrayOpacity,
                                zIndex: xrayOpacity > 0 ? 1 : 0,
                                pointerEvents: xrayOpacity > 0 ? "auto" : "none",
                                transform: `
                                    perspective(1200px)
                                    rotateX(${(1 - xrayOpacity) * -12}deg)
                                    rotateY(${(1 - xrayOpacity) * 5}deg)
                                    scale(${0.92 + xrayOpacity * 0.08})
                                    translateZ(${(xrayOpacity - 1) * 80}px)
                                `,
                                transformOrigin: "center center",
                                transformStyle: "preserve-3d",
                            }}
                        >
                            <PanelGrid
                                panels={xrayPanels}
                                onLayoutChange={(layout) => {
                                    if (xrayTargetTab) updateTabLayout(xrayTargetTab, layout);
                                }}
                                onPanelClose={(panelId) => console.log("Panel closed:", panelId)}
                            />
                        </div>
                    )}

                    {/* ── Active layer (foreground, skews away when x-ray on) */}
                    <div
                        className="absolute inset-0 transition-all duration-300"
                        style={{
                            opacity: xrayEnabled ? 1 - xrayOpacity : 1,
                            zIndex: xrayEnabled && xrayOpacity > 0 ? 0 : 1,
                            pointerEvents: xrayEnabled && xrayOpacity > 0 ? "none" : "auto",
                            transform: xrayEnabled
                                ? `
                                    perspective(1200px)
                                    rotateX(${xrayOpacity * 8}deg)
                                    rotateY(${xrayOpacity * -3}deg)
                                    scale(${1 - xrayOpacity * 0.05})
                                    translateZ(${xrayOpacity * 40}px)
                                `
                                : "none",
                            transformOrigin: "center center",
                            transformStyle: "preserve-3d",
                        }}
                    >
                        <PanelGrid
                            panels={activePanels}
                            onLayoutChange={(layout) => updateTabLayout(activeTab, layout)}
                            onPanelClose={(panelId) => console.log("Panel closed:", panelId)}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
