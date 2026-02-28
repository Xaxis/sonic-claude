/**
 * NavSidebar - Collapsible vertical navigation sidebar
 *
 * Industry-standard "icon rail" navigation pattern (VS Code, Linear, Figma).
 *
 * Collapsed  (w-14 / 56px): icon-only, native tooltip on hover
 * Expanded   (w-56 / 224px): icon + label, hover actions visible
 *
 * Sections (top → bottom):
 *   Brand area  — logo icon + "SONIC CLAUDE" text, aligned to Header height
 *   Workspaces  — one item per tab (icon + name + popout/close on hover)
 *   New Tab     — create a new workspace tab
 *   X-Ray       — see-through compositor (toggle + opacity slider + target)
 *   Collapse    — toggle sidebar width
 *
 * State owned here: keyboard shortcut for X-Ray (⌘/Ctrl + X)
 * State from layoutStore: sidebarCollapsed, tabs, xray*, poppedOutTabs
 * State from dawStore: activities (for the activity indicator dot)
 */

import { useEffect } from "react";
import {
    Music,
    LayoutDashboard,
    Zap,
    Radio,
    Layout,
    LibraryBig,
    Plus,
    Scan,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    X,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/stores/layoutStore";
import { useDAWStore } from "@/stores/dawStore";
import { Slider } from "@/components/ui/slider";
import type { TabConfig } from "@/stores/layoutStore";

// ============================================================================
// TAB ICON REGISTRY
// Maps built-in tab IDs to their canonical Lucide icons.
// Custom/user-created tabs fall back to the generic Layout icon.
// ============================================================================

type IconComp = React.ComponentType<LucideProps>;

const TAB_ICON_REGISTRY: Record<string, IconComp> = {
    compose:  LayoutDashboard,   // Sequencer + Mixer + Effects grid
    interact: Zap,               // Input + Visualizer + AI assistant
    browse:   LibraryBig,        // Sound & instrument browser
    perform:  Radio,             // Clip Launcher performance mode
};

function resolveTabIcon(tabId: string): IconComp {
    return TAB_ICON_REGISTRY[tabId] ?? Layout;
}

// ============================================================================
// SECTION DIVIDER
// ============================================================================

function NavDivider() {
    return <div className="mx-2 h-px bg-border/40 flex-shrink-0" />;
}

// ============================================================================
// INDIVIDUAL TAB ITEM
// ============================================================================

interface NavTabItemProps {
    tab: TabConfig;
    isActive: boolean;
    isPoppedOut: boolean;
    isXrayTarget: boolean;
    isXraySource: boolean;
    collapsed: boolean;
    showActivityDot: boolean;
    canDelete: boolean;
    onSelect: () => void;
    onPopout: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
}

function NavTabItem({
    tab,
    isActive,
    isPoppedOut,
    isXrayTarget,
    isXraySource,
    collapsed,
    showActivityDot,
    canDelete,
    onSelect,
    onPopout,
    onDelete,
}: NavTabItemProps) {
    const Icon = isPoppedOut ? ExternalLink : resolveTabIcon(tab.id);

    return (
        <div
            className={cn(
                // Base layout
                "group relative flex items-center cursor-pointer select-none",
                "transition-colors duration-150",
                // Right-edge active indicator
                "border-r-2",
                // Height + padding per state
                collapsed ? "h-10 justify-center" : "h-10 gap-3 px-3",
                // State colours
                isXrayTarget
                    ? "border-cyan-400 bg-cyan-500/10 text-cyan-400"
                    : isXraySource
                        ? "border-purple-400/40 bg-purple-500/5 text-purple-300"
                        : isPoppedOut
                            ? "border-purple-500 bg-purple-500/10 text-purple-400"
                            : isActive
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground",
            )}
            onClick={() => !isPoppedOut && onSelect()}
            title={collapsed ? tab.name : undefined}
        >
            {/* Icon */}
            <div className="relative flex-shrink-0">
                <Icon
                    className={cn(
                        "h-4 w-4",
                        isXrayTarget && "animate-pulse",
                    )}
                />
                {/* Activity dot — shows when AI is active */}
                {showActivityDot && isActive && (
                    <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                )}
            </div>

            {/* Label + hover actions (expanded only) */}
            {!collapsed && (
                <>
                    <span className="flex-1 text-xs font-semibold uppercase tracking-wider truncate min-w-0">
                        {tab.name}
                    </span>

                    {!isPoppedOut && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                                onClick={onPopout}
                                className="p-1 rounded hover:bg-white/10 transition-colors"
                                title="Pop out to window"
                            >
                                <ExternalLink className="h-3 w-3" />
                            </button>
                            {canDelete && (
                                <button
                                    onClick={onDelete}
                                    className="p-1 rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
                                    title="Close tab"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface NavSidebarProps {
    tabs: TabConfig[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    onTabCreate: () => void;
    onTabDelete: (tabId: string) => void;
    onTabPopout: (tabId: string) => void;
}

export function NavSidebar({
    tabs,
    activeTab,
    onTabChange,
    onTabCreate,
    onTabDelete,
    onTabPopout,
}: NavSidebarProps) {
    const {
        sidebarCollapsed,
        toggleSidebar,
        poppedOutTabs,
        xrayEnabled,
        xraySourceTab,
        xrayTargetTab,
        xrayOpacity,
        enableXray,
        disableXray,
        setXrayOpacity,
    } = useLayoutStore();

    const activities = useDAWStore(s => s.activities);
    const hasActivity = activities.length > 0;

    const collapsed = sidebarCollapsed;

    // Tabs available as x-ray target (not active, not popped out)
    const xrayOptions = tabs.filter(t => t.id !== activeTab && !poppedOutTabs.has(t.id));

    // ── Keyboard shortcut ⌘X / Ctrl+X to toggle X-Ray ────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!((e.metaKey || e.ctrlKey) && e.key === "x")) return;
            // Don't trigger while typing in an input
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
            e.preventDefault();
            if (xrayEnabled) {
                disableXray();
            } else {
                const other = xrayOptions[0];
                if (other) enableXray(other.id);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [xrayEnabled, xrayOptions, enableXray, disableXray]);

    return (
        <nav
            className={cn(
                "relative flex flex-col h-full bg-card border-r border-border flex-shrink-0 overflow-hidden",
                "transition-[width] duration-200 ease-in-out",
                collapsed ? "w-14" : "w-56",
            )}
        >
            {/* ── Brand / Logo ─────────────────────────────────────────────── */}
            {/*   Height matches the Header (60px) so the top row stays aligned */}
            <div
                className={cn(
                    "flex items-center h-[60px] border-b border-border/50 flex-shrink-0",
                    collapsed ? "justify-center" : "gap-2.5 px-3",
                )}
            >
                <Music
                    className="h-5 w-5 text-primary flex-shrink-0"
                    style={{ filter: "drop-shadow(0 0 6px hsl(187 85% 55% / 0.6))" }}
                />
                {!collapsed && (
                    <span
                        className="text-sm font-bold tracking-[0.25em] whitespace-nowrap text-primary"
                        style={{ textShadow: "0 0 12px hsl(187 85% 55% / 0.4)" }}
                    >
                        SONIC CLAUDE
                    </span>
                )}
            </div>

            {/* ── Workspace tabs ────────────────────────────────────────────── */}
            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto pt-1.5 pb-1">
                {tabs.map((tab) => (
                    <NavTabItem
                        key={tab.id}
                        tab={tab}
                        isActive={tab.id === activeTab}
                        isPoppedOut={poppedOutTabs.has(tab.id)}
                        isXrayTarget={xrayEnabled && tab.id === xrayTargetTab}
                        isXraySource={xrayEnabled && tab.id === xraySourceTab}
                        collapsed={collapsed}
                        showActivityDot={hasActivity}
                        canDelete={tabs.length > 1}
                        onSelect={() => onTabChange(tab.id)}
                        onPopout={(e) => { e.stopPropagation(); onTabPopout(tab.id); }}
                        onDelete={(e) => { e.stopPropagation(); onTabDelete(tab.id); }}
                    />
                ))}
            </div>

            {/* ── New Tab ───────────────────────────────────────────────────── */}
            <NavDivider />
            <button
                className={cn(
                    "flex items-center transition-colors duration-150",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/30 flex-shrink-0",
                    collapsed ? "h-10 justify-center" : "h-10 gap-3 px-3",
                )}
                onClick={onTabCreate}
                title={collapsed ? "New tab" : undefined}
            >
                <Plus className="h-4 w-4 flex-shrink-0" />
                {!collapsed && (
                    <span className="text-xs font-semibold uppercase tracking-wider">
                        New Tab
                    </span>
                )}
            </button>

            {/* ── X-Ray ─────────────────────────────────────────────────────── */}
            {/*   Hidden when there are no other tabs to see through to          */}
            {xrayOptions.length > 0 && (
                <>
                    <NavDivider />
                    <div className="flex-shrink-0">

                        {/* Toggle row */}
                        <button
                            className={cn(
                                "w-full flex items-center transition-colors duration-150 select-none",
                                collapsed ? "h-10 justify-center" : "h-10 gap-3 px-3",
                                xrayEnabled
                                    ? "text-purple-400 bg-purple-500/10 hover:bg-purple-500/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                            )}
                            onClick={() => {
                                if (xrayEnabled) {
                                    disableXray();
                                } else if (xrayOptions[0]) {
                                    enableXray(xrayOptions[0].id);
                                }
                            }}
                            title={
                                collapsed
                                    ? xrayEnabled ? "X-Ray: ON — click to disable (⌘X)" : "Enable X-Ray (⌘X)"
                                    : undefined
                            }
                        >
                            <Scan
                                className={cn(
                                    "h-4 w-4 flex-shrink-0",
                                    xrayEnabled && "animate-pulse",
                                )}
                            />
                            {!collapsed && (
                                <>
                                    <span className="flex-1 text-left text-xs font-semibold uppercase tracking-wider">
                                        X-Ray
                                    </span>
                                    <span
                                        className={cn(
                                            "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                                            xrayEnabled
                                                ? "bg-purple-500/30 text-purple-300"
                                                : "bg-muted/60 text-muted-foreground/60",
                                        )}
                                    >
                                        {xrayEnabled ? "ON" : "⌘X"}
                                    </span>
                                </>
                            )}
                        </button>

                        {/* Controls — expanded sidebar + x-ray active */}
                        {!collapsed && xrayEnabled && (
                            <div className="px-3 pt-1 pb-2.5 space-y-2">

                                {/* Opacity slider */}
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/50 w-7 text-right tabular-nums">
                                        {Math.round(xrayOpacity * 100)}%
                                    </span>
                                    <Slider
                                        value={[xrayOpacity * 100]}
                                        onValueChange={([v]) => setXrayOpacity(v / 100)}
                                        onValueCommit={([v]) => setXrayOpacity(v / 100)}
                                        min={0}
                                        max={100}
                                        step={5}
                                        className="flex-1"
                                    />
                                </div>

                                {/* Target tab selector (only when >1 options) */}
                                {xrayOptions.length > 1 && (
                                    <select
                                        value={xrayTargetTab || ""}
                                        onChange={(e) => {
                                            if (e.target.value) enableXray(e.target.value);
                                        }}
                                        className="w-full bg-background border border-border/60 rounded px-2 py-1 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                                    >
                                        {xrayOptions.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── Collapse / Expand toggle ──────────────────────────────────── */}
            <NavDivider />
            <button
                className={cn(
                    "w-full flex items-center transition-colors duration-150",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/30 flex-shrink-0",
                    collapsed ? "h-10 justify-center" : "h-10 gap-3 px-3",
                )}
                onClick={toggleSidebar}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {collapsed
                    ? <ChevronRight className="h-4 w-4" />
                    : <ChevronLeft className="h-4 w-4" />
                }
                {!collapsed && (
                    <span className="text-[10px] font-medium uppercase tracking-wider">
                        Collapse
                    </span>
                )}
            </button>
        </nav>
    );
}
