/**
 * RightColumn - Persistent pinned-panel column
 *
 * Slides in as a flex peer of the workspace when at least one panel is pinned.
 * Stacks pinned panels vertically; minimized panels collapse to a chip strip.
 *
 * Layout (top → bottom):
 *   RightColumnHeader  h-[60px]  — "PINNED" label + settings gear
 *   MinimizedTabStrip            — chips for minimized panels
 *   Scrollable stack             — expanded PinnedPanelCards
 */

import { useState } from "react";
import { Settings, ChevronUp, ChevronDown, PanelRightClose } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { SettingsModal } from "@/components/settings";
import { useLayoutStore } from "@/stores/layoutStore";
import type { PanelConfig } from "./PanelGridItem";

interface RightColumnProps {
    panels: PanelConfig[];
}

// ─── Minimized chip strip ────────────────────────────────────────────────────

function MinimizedTabStrip({
    minimizedIds,
    panels,
    onRestore,
}: {
    minimizedIds: Set<string>;
    panels: PanelConfig[];
    onRestore: (id: string) => void;
}) {
    if (minimizedIds.size === 0) return null;

    return (
        <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-border/20">
            {Array.from(minimizedIds).map((id) => {
                const panel = panels.find((p) => p.id === id);
                if (!panel) return null;
                return (
                    <button
                        key={id}
                        onClick={() => onRestore(id)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-muted/30 border border-border/40 hover:bg-primary/10 hover:border-primary/30 transition-colors"
                        title={`Restore ${panel.title}`}
                    >
                        <ChevronDown className="h-3 w-3" />
                        <span className="tracking-wider uppercase">{panel.title}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ─── Single pinned panel card ────────────────────────────────────────────────

function PinnedPanelCard({
    panel,
    onMinimize,
    onUnpin,
}: {
    panel: PanelConfig;
    onMinimize: () => void;
    onUnpin: () => void;
}) {
    return (
        <div className="flex-shrink-0 border-b border-border/20 last:border-0" style={{ minHeight: 200 }}>
            <Panel
                title={panel.title}
                subtitle={panel.getSubtitle?.()}
                draggable={false}
                closeable={false}
                isMaximized={false}
                className="h-full"
                headerActions={
                    <>
                        <button
                            onClick={onMinimize}
                            title="Minimize to tab"
                            className="hover:bg-primary/20 cursor-pointer touch-manipulation rounded p-2 transition-colors"
                        >
                            <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                            onClick={onUnpin}
                            title="Restore to grid"
                            className="hover:bg-primary/20 cursor-pointer touch-manipulation rounded p-2 transition-colors"
                        >
                            <PanelRightClose className="h-4 w-4" />
                        </button>
                    </>
                }
            >
                {panel.component}
            </Panel>
        </div>
    );
}

// ─── Right column header ─────────────────────────────────────────────────────

function RightColumnHeader() {
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <>
            <div className="bg-card border-border flex h-[60px] flex-shrink-0 items-center justify-between border-b-2 px-4">
                <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                    Pinned
                </span>
                <button
                    onClick={() => setSettingsOpen(true)}
                    title="Settings (⌘,)"
                    className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-muted/30"
                >
                    <Settings className="h-4 w-4" />
                </button>
            </div>
            <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
        </>
    );
}

// ─── Root component ──────────────────────────────────────────────────────────

export function RightColumn({ panels }: RightColumnProps) {
    const {
        pinnedPanelIds,
        minimizedPinnedIds,
        unpinPanel,
        minimizePinnedPanel,
        restorePinnedPanel,
    } = useLayoutStore();

    const expandedIds = pinnedPanelIds.filter((id) => !minimizedPinnedIds.has(id));
    const allMinimized = pinnedPanelIds.length > 0 && expandedIds.length === 0;

    return (
        <aside className="bg-background border-border flex w-[360px] flex-shrink-0 flex-col border-l transition-all duration-200 overflow-hidden">
            <RightColumnHeader />

            <MinimizedTabStrip
                minimizedIds={minimizedPinnedIds}
                panels={panels}
                onRestore={restorePinnedPanel}
            />

            <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
                {allMinimized ? (
                    <div className="flex flex-1 items-center justify-center">
                        <p className="text-xs text-muted-foreground tracking-wider uppercase">
                            All panels minimized
                        </p>
                    </div>
                ) : (
                    expandedIds.map((id) => {
                        const panel = panels.find((p) => p.id === id);
                        if (!panel) return null;
                        return (
                            <PinnedPanelCard
                                key={id}
                                panel={panel}
                                onMinimize={() => minimizePinnedPanel(id)}
                                onUnpin={() => unpinPanel(id)}
                            />
                        );
                    })
                )}
            </div>
        </aside>
    );
}
