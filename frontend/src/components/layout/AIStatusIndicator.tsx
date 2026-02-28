/**
 * AIStatusIndicator — Notification centre for AI activity
 *
 * Trigger: single Sparkles icon button (no text) with a badge count
 * when tasks are pending. Visually cohesive with the adjacent Settings gear.
 *
 * Dropdown sections:
 *   ACTIVE   — all currently pending tasks (spinner)
 *   RECENT   — last 5 completed (success / error) tasks
 *
 * Empty state: Sparkles icon + "No recent AI activity"
 */

import { useState, useRef, useEffect } from "react";
import {
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Loader2,
    MessageSquare,
    Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDAWStore, type AIRequestHistoryEntry } from "@/stores/dawStore";
import { HeaderIconButton } from "@/components/ui/header-icon-button";
import { formatDistanceToNow } from "date-fns";

// ─── Main component ───────────────────────────────────────────────────────────

export function AIStatusIndicator() {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const isSendingMessage = useDAWStore((s) => s.isSendingMessage);
    const aiRequestHistory = useDAWStore((s) => s.aiRequestHistory);

    const activeTasks = aiRequestHistory.filter((e) => e.status === "pending");
    const recentTasks = aiRequestHistory
        .filter((e) => e.status === "success" || e.status === "error")
        .slice(0, 5);

    const isActive = isSendingMessage || activeTasks.length > 0;
    const pendingCount = activeTasks.length + (isSendingMessage && activeTasks.length === 0 ? 1 : 0);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handle = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [isOpen]);

    return (
        <div className="relative" ref={ref}>
            <HeaderIconButton
                icon={Sparkles}
                label="AI activity"
                badge={pendingCount}
                badgeVariant="warning"
                active={isOpen}
                glowing={isActive}
                onClick={() => setIsOpen((o) => !o)}
            />

            {/* ── Notification panel ────────────────────────────────────────── */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-[360px] bg-card border-2 border-border rounded-lg shadow-2xl z-50 overflow-hidden">

                    {/* Panel header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                            <span className="text-xs font-bold tracking-widest uppercase">
                                AI Activity
                            </span>
                        </div>
                        {isActive && (
                            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-cyan-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                {pendingCount} active
                            </span>
                        )}
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto max-h-[440px]">

                        {/* Active tasks */}
                        {activeTasks.length > 0 && (
                            <section>
                                <SectionHeader label="ACTIVE" />
                                {activeTasks.map((e) => (
                                    <TaskRow key={e.id} entry={e} />
                                ))}
                            </section>
                        )}

                        {/* Recent tasks */}
                        {recentTasks.length > 0 && (
                            <section>
                                <SectionHeader label="RECENT" />
                                {recentTasks.map((e) => (
                                    <TaskRow key={e.id} entry={e} />
                                ))}
                            </section>
                        )}

                        {/* Empty state */}
                        {activeTasks.length === 0 && recentTasks.length === 0 && (
                            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                                <Sparkles className="h-7 w-7 opacity-15" />
                                <span className="text-xs tracking-wide">No recent AI activity</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
    return (
        <div className="px-4 py-1.5 bg-muted/10 border-b border-border/20">
            <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground/50">
                {label}
            </span>
        </div>
    );
}

// ─── Individual task row ──────────────────────────────────────────────────────

function TaskRow({ entry }: { entry: AIRequestHistoryEntry }) {
    const statusIcon = {
        pending: <Loader2    className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0 animate-spin" />,
        success: <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />,
        error:   <AlertCircle  className="h-3.5 w-3.5 text-red-500  flex-shrink-0" />,
    }[entry.status];

    const sourceIcon = entry.source === "chat"
        ? <MessageSquare className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
        : <Zap           className="h-3 w-3 text-cyan-400/50      flex-shrink-0" />;

    return (
        <div className="px-4 py-2.5 hover:bg-muted/20 transition-colors border-b border-border/20 last:border-0">

            {/* Top row */}
            <div className="flex items-center gap-2 min-w-0">
                {statusIcon}
                <span className="text-xs font-medium text-foreground flex-1 truncate min-w-0">
                    {entry.entityLabel || "AI Request"}
                </span>
                {sourceIcon}
                <span className="text-[10px] text-muted-foreground/50 whitespace-nowrap flex-shrink-0 tabular-nums">
                    {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                </span>
            </div>

            {/* Message */}
            <p className="text-[11px] text-muted-foreground/70 mt-1 pl-[22px] line-clamp-1">
                {entry.userMessage}
            </p>

            {/* Result */}
            {entry.status === "success" && entry.actionsExecuted && entry.actionsExecuted.length > 0 && (
                <p className="text-[10px] text-green-500/70 mt-0.5 pl-[22px] font-medium">
                    {entry.actionsExecuted.length} action{entry.actionsExecuted.length !== 1 ? "s" : ""} executed
                </p>
            )}
            {entry.status === "error" && entry.error && (
                <p className="text-[10px] text-red-500/70 mt-0.5 pl-[22px] font-medium truncate">
                    {entry.error}
                </p>
            )}
        </div>
    );
}
