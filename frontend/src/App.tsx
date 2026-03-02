/**
 * App.tsx
 *
 * Main application component.
 *
 * Layout:
 * ┌──────────┬──────────────────────────────────────────┐
 * │ Brand    │  Header (CompositionSwitcher + status)   │
 * │ Logo     ├──────────────────────────────────────────┤
 * │──────────│                                          │
 * │ COMPOSE  │  Workspace (TabbedWrapper — PanelGrid)  │
 * │ INTERACT │                                          │
 * │ PERFORM  │                                          │
 * │──────────│                                          │
 * │ + NewTab │                                          │
 * │──────────│                                          │
 * │ X-Ray    │                                          │
 * │──────────│                                          │
 * │ Collapse │                                          │
 * └──────────┴──────────────────────────────────────────┘
 *
 * NavSidebar spans the full viewport height. Its brand area aligns with the
 * Header height (60px) so the two form a cohesive top row visually.
 */

import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { NavSidebar } from "@/components/layout/NavSidebar";
import { TabbedWrapper } from "@/components/layout/TabbedWrapper";
import { RightColumn } from "@/components/layout/RightColumn";
import { ActivityContainer } from "@/components/activity";
import { CompositionLoader } from "@/components/composition/CompositionLoader";
import { useLayoutStore } from "@/stores/layoutStore";
import { useDAWStore } from "@/stores/dawStore";
import { useCollectionsStore } from "@/stores/collectionsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAutosave } from "@/hooks/useAutosave";
import { DEFAULT_PANELS } from "@/config/layout.config";

export default function App() {
    const { tabs, activeTab, setActiveTab, createTab, deleteTab, popoutTab, pinnedPanelIds, rightColumnCollapsed } = useLayoutStore();
    const hasRightColumn = pinnedPanelIds.length > 0;

    // ── App startup: initialize DAW store exactly once ────────────────────────
    const initialize    = useDAWStore(state => state.initialize);
    const loadAll       = useCollectionsStore(state => state.loadAll);

    useEffect(() => {
        initialize();
        loadAll();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── UI Density — sync persisted setting to CSS custom property ────────────
    const uiDensity = useSettingsStore(s => s.uiDensity);
    useEffect(() => {
        document.documentElement.style.setProperty('--ui-density', String(uiDensity));
    }, [uiDensity]);

    // ── Autosave ──────────────────────────────────────────────────────────────
    useAutosave();

    // ── Global undo / redo keyboard shortcuts ─────────────────────────────────
    const undo    = useDAWStore(state => state.undo);
    const redo    = useDAWStore(state => state.redo);
    const canUndo = useDAWStore(state => state.canUndo);
    const canRedo = useDAWStore(state => state.canRedo);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
            if (isInput) return;

            if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
                if (canUndo) { e.preventDefault(); undo(); }
            } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") {
                if (canRedo) { e.preventDefault(); redo(); }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [undo, redo, canUndo, canRedo]);

    // ── Engine status ─────────────────────────────────────────────────────────
    const analytics     = useDAWStore(state => state.analytics);
    const activeSynths  = useDAWStore(state => state.activeSynths);
    const isEngineRunning = analytics !== null;
    const cpuUsage        = analytics?.cpu_usage ?? 0;
    const activeSynthsCount = Object.keys(activeSynths).length;

    return (
        <div className="bg-background flex h-screen w-screen overflow-hidden">
            {/* Global: composition loader dialog */}
            <CompositionLoader />

            {/* Left: Full-height navigation sidebar */}
            <NavSidebar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onTabCreate={() => createTab("NEW TAB", [])}
                onTabDelete={deleteTab}
                onTabPopout={popoutTab}
            />

            {/* Center: Status bar + workspace */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <Header
                    isEngineRunning={isEngineRunning}
                    cpuUsage={cpuUsage}
                    activeSynths={activeSynthsCount}
                    showSettings={!hasRightColumn || rightColumnCollapsed}
                />

                <div className="flex-1 min-h-0 overflow-hidden">
                    <TabbedWrapper
                        panels={DEFAULT_PANELS}
                        tabs={tabs}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />
                </div>
            </div>

            {/* Right: Pinned panel column (appears when panels are pinned) */}
            {hasRightColumn && <RightColumn panels={DEFAULT_PANELS} />}

            {/* Global: AI activity animations overlay */}
            <ActivityContainer />
        </div>
    );
}
