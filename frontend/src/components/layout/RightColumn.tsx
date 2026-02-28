/**
 * RightColumn - Collapsible pinned-panel column
 *
 * Mirrors the NavSidebar pattern on the right side:
 *
 * Collapsed  (w-14 / 56px): icon rail — one icon per pinned panel + collapse toggle
 * Expanded   (w-[360px]):   full panel stack — header, minimized chip strip, panel cards
 *
 * Layout (top → bottom):
 *   Header area  h-[60px]  — "PINNED" label (expanded) or pin icon (collapsed) + settings gear
 *   Content                — icon rail (collapsed) or minimized chips + panel cards (expanded)
 *   Collapse toggle        — bottom of column, mirrors NavSidebar
 */

import { useState } from "react";
import { Settings, ChevronUp, ChevronDown, PanelRightClose, PanelLeft, PanelRight, Pin } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { IconButton } from "@/components/ui/icon-button";
import { Separator } from "@/components/ui/separator";
import { SettingsModal } from "@/components/settings";
import { useLayoutStore } from "@/stores/layoutStore";
import { cn } from "@/lib/utils";
import type { PanelConfig } from "./PanelGridItem";

interface RightColumnProps {
    panels: PanelConfig[];
}

// ─── Minimized chip strip (expanded view only) ────────────────────────────────

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

// ─── Single pinned panel card (expanded view only) ────────────────────────────

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
                icon={panel.icon}
                subtitle={panel.getSubtitle?.()}
                draggable={false}
                closeable={false}
                isMaximized={false}
                className="h-full"
                headerActions={
                    <>
                        <IconButton
                            icon={ChevronUp}
                            tooltip="Minimize to tab"
                            onClick={onMinimize}
                            variant="ghost"
                            size="icon-xs"
                        />
                        <IconButton
                            icon={PanelRightClose}
                            tooltip="Restore to grid"
                            onClick={onUnpin}
                            variant="ghost"
                            size="icon-xs"
                        />
                    </>
                }
            >
                {panel.component}
            </Panel>
        </div>
    );
}

// ─── Root component ───────────────────────────────────────────────────────────

export function RightColumn({ panels }: RightColumnProps) {
    const [settingsOpen, setSettingsOpen] = useState(false);

    const {
        pinnedPanelIds,
        minimizedPinnedIds,
        unpinPanel,
        minimizePinnedPanel,
        restorePinnedPanel,
        rightColumnCollapsed,
        toggleRightColumn,
    } = useLayoutStore();

    const collapsed = rightColumnCollapsed;
    const expandedIds = pinnedPanelIds.filter((id) => !minimizedPinnedIds.has(id));
    const allMinimized = pinnedPanelIds.length > 0 && expandedIds.length === 0;

    return (
        <aside
            className={cn(
                "relative flex flex-col h-full bg-card border-l border-border flex-shrink-0 overflow-hidden",
                "transition-[width] duration-200 ease-in-out",
                collapsed ? "w-14" : "w-[360px]",
            )}
        >
            {/* ── Header row (aligns with NavSidebar brand / Header height) ── */}
            <div
                className={cn(
                    "flex items-center h-[60px] border-b-2 border-border flex-shrink-0",
                    collapsed ? "justify-center" : "justify-between px-4",
                )}
            >
                {collapsed ? (
                    <Pin className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <>
                        <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                            Pinned
                        </span>
                        <IconButton
                            icon={Settings}
                            tooltip="Settings (⌘,)"
                            onClick={() => setSettingsOpen(true)}
                            variant="ghost"
                            size="icon-xs"
                        />
                    </>
                )}
            </div>

            {/* ── Content ──────────────────────────────────────────────────── */}
            {collapsed ? (
                /* Icon rail — one button per pinned panel */
                <div className="flex flex-col flex-1 min-h-0 overflow-y-auto pt-1.5 pb-1">
                    {pinnedPanelIds.map((id) => {
                        const panel = panels.find((p) => p.id === id);
                        if (!panel) return null;
                        const Icon = panel.icon;
                        const isMinimized = minimizedPinnedIds.has(id);
                        return (
                            <button
                                key={id}
                                onClick={toggleRightColumn}
                                title={panel.title}
                                className={cn(
                                    "h-10 flex items-center justify-center transition-colors duration-150",
                                    "border-l-2",
                                    isMinimized
                                        ? "border-transparent text-muted-foreground/40 hover:bg-muted/30 hover:text-muted-foreground"
                                        : "border-primary bg-primary/10 text-primary",
                                )}
                            >
                                {Icon
                                    ? <Icon className="h-4 w-4" />
                                    : <Pin className="h-4 w-4" />
                                }
                            </button>
                        );
                    })}
                </div>
            ) : (
                /* Full expanded stack */
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
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
                </div>
            )}

            {/* ── Collapse / Expand toggle (mirrors NavSidebar) ─────────────── */}
            <Separator className="mx-2 flex-shrink-0" />
            <button
                className={cn(
                    "w-full flex items-center transition-colors duration-150",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/30 flex-shrink-0",
                    collapsed ? "h-10 justify-center" : "h-10 gap-3 px-3",
                )}
                onClick={toggleRightColumn}
                title={collapsed ? "Expand panel column" : "Collapse panel column"}
            >
                {collapsed
                    ? <PanelRight className="h-4 w-4" />
                    : <PanelLeft className="h-4 w-4" />
                }
                {!collapsed && (
                    <span className="text-[10px] font-medium uppercase tracking-wider">
                        Collapse
                    </span>
                )}
            </button>

            <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
        </aside>
    );
}
