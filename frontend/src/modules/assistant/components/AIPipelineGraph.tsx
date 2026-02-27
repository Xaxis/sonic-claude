/**
 * AIPipelineGraph
 *
 * Always-visible horizontal flow graph in the Assistant chat panel.
 * Receives real-time stage events from the backend via WebSocket and
 * renders each pipeline stage with animated status + hover-detail tooltips.
 *
 * Stages (in order):
 *   context → routing → execution → tools → summary → response
 */

import { useState, useCallback, useRef } from "react";
import { useWebSocketWithHandler } from "@/hooks/useWebSocket";
import type { AIPipelineMessage } from "@/services/api/ws/types";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type StageStatus = "idle" | "active" | "complete" | "error" | "skipped";

interface StageState {
    status:   StageStatus;
    detail:   Record<string, any>;
    startTs?: number;   // ms
    endTs?:   number;   // ms
}

type StageKey = "context" | "routing" | "execution" | "tools" | "summary" | "response";

// ── Stage definitions ────────────────────────────────────────────────────────

const STAGES: Array<{ key: StageKey; label: string; description: string }> = [
    { key: "context",   label: "Context",   description: "Snapshot of DAW state & analysis" },
    { key: "routing",   label: "Routing",   description: "Intent classification (Haiku)" },
    { key: "execution", label: "Execute",   description: "Primary reasoning call (Sonnet)" },
    { key: "tools",     label: "Tools",     description: "DAW action execution" },
    { key: "summary",   label: "Summary",   description: "Result summarisation (Haiku)" },
    { key: "response",  label: "Response",  description: "Final answer assembled" },
];

const makeDefaultStages = (): Record<StageKey, StageState> =>
    Object.fromEntries(STAGES.map(s => [s.key, { status: "idle", detail: {} }])) as Record<StageKey, StageState>;

// ── Detail formatters ────────────────────────────────────────────────────────

function formatDetail(key: StageKey, detail: Record<string, any>): string[] {
    const lines: string[] = [];
    switch (key) {
        case "context":
            if (detail.track_count !== undefined)
                lines.push(`${detail.track_count} tracks · ${detail.clip_count ?? 0} clips`);
            if (detail.tempo)   lines.push(`${detail.tempo} BPM`);
            if (detail.key)     lines.push(`Key: ${detail.key}`);
            break;
        case "routing":
            if (detail.intent)  lines.push(`Intent: ${detail.intent.replace(/_/g, " ").toLowerCase()}`);
            if (detail.tools_loaded !== undefined) lines.push(`${detail.tools_loaded} tools loaded`);
            if (detail.model)   lines.push(`via ${detail.model}`);
            break;
        case "execution": {
            const short = detail.model
                ? detail.model.replace("claude-", "").split("-").slice(0, 2).join("-")
                : null;
            if (short)          lines.push(short);
            if (detail.tool_count !== undefined) lines.push(`${detail.tool_count} tools available`);
            if (detail.tool_calls !== undefined) lines.push(`${detail.tool_calls} tool call${detail.tool_calls !== 1 ? "s" : ""}`);
            break;
        }
        case "tools":
            if (detail.succeeded !== undefined)
                lines.push(`${detail.succeeded}/${detail.total} succeeded`);
            if (Array.isArray(detail.actions)) {
                detail.actions.slice(0, 4).forEach((a: any) => {
                    lines.push(`${a.success ? "✓" : "✗"} ${a.name.replace(/_/g, " ")}`);
                });
                if (detail.actions.length > 4)
                    lines.push(`+${detail.actions.length - 4} more`);
            }
            break;
        case "summary":
            if (detail.tool_results !== undefined)
                lines.push(`${detail.tool_results} result${detail.tool_results !== 1 ? "s" : ""} summarised`);
            if (detail.model)   lines.push(`via ${detail.model}`);
            break;
        case "response":
            if (detail.actions !== undefined)
                lines.push(`${detail.actions} action${detail.actions !== 1 ? "s" : ""} executed`);
            if (detail.has_tools === false) lines.push("No tools invoked");
            break;
    }
    return lines;
}

// ── Stage node ───────────────────────────────────────────────────────────────

function StageNode({
    stage,
    state,
    isLast,
}: {
    stage:  typeof STAGES[number];
    state:  StageState;
    isLast: boolean;
}) {
    const [hovered, setHovered] = useState(false);
    const { status, detail, startTs, endTs } = state;
    const duration = startTs && endTs ? Math.round(endTs - startTs) : null;
    const detailLines = formatDetail(stage.key, detail);

    const ringCls = {
        idle:     "border-muted-foreground/20 text-muted-foreground/35 bg-transparent",
        active:   "border-cyan-500/60 text-cyan-400 bg-cyan-400/8",
        complete: "border-emerald-500/50 text-emerald-400 bg-emerald-400/8",
        error:    "border-red-500/50 text-red-400 bg-red-400/8",
        skipped:  "border-muted-foreground/15 text-muted-foreground/25 bg-transparent",
    }[status];

    const dotCls = {
        idle:     "bg-muted-foreground/20",
        active:   "bg-cyan-400 animate-pulse",
        complete: "bg-emerald-400",
        error:    "bg-red-400",
        skipped:  "bg-muted-foreground/15",
    }[status];

    return (
        <div className="relative flex items-center">
            {/* Stage pill */}
            <div
                className="relative"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-medium tracking-wide",
                    "transition-all duration-300 cursor-default select-none",
                    ringCls,
                    status === "active" && "shadow-sm shadow-cyan-400/20",
                )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300", dotCls)} />
                    <span className={cn(status === "skipped" && "line-through opacity-40")}>
                        {stage.label}
                    </span>
                    {duration !== null && status === "complete" && (
                        <span className="opacity-40 text-[9px] tabular-nums">{duration}ms</span>
                    )}
                </div>

                {/* Hover tooltip */}
                {hovered && (
                    <div className={cn(
                        "absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50",
                        "bg-popover/95 backdrop-blur-sm border border-border/60 rounded-lg shadow-xl",
                        "px-3 py-2.5 min-w-[150px] max-w-[230px] pointer-events-none",
                    )}>
                        {/* Header */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotCls)} />
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-foreground/80">
                                {stage.label}
                            </span>
                            {status !== "idle" && (
                                <span className={cn(
                                    "ml-auto text-[9px] font-medium capitalize",
                                    status === "active"   && "text-cyan-400",
                                    status === "complete" && "text-emerald-400",
                                    status === "error"    && "text-red-400",
                                    status === "skipped"  && "text-muted-foreground/40",
                                )}>
                                    {status === "active" ? "running" : status}
                                    {duration !== null && ` · ${duration}ms`}
                                </span>
                            )}
                        </div>

                        {/* Description */}
                        <div className="text-[10px] text-muted-foreground/60 mb-1.5 leading-relaxed">
                            {stage.description}
                        </div>

                        {/* Detail lines */}
                        {detailLines.length > 0 && (
                            <div className="border-t border-border/30 pt-1.5 space-y-0.5">
                                {detailLines.map((line, i) => (
                                    <div key={i} className="text-[10px] text-muted-foreground/70 font-mono leading-snug">
                                        {line}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0
                            border-l-[5px] border-l-transparent
                            border-r-[5px] border-r-transparent
                            border-t-[5px] border-t-border/60" />
                    </div>
                )}
            </div>

            {/* Connector */}
            {!isLast && (
                <div className="flex items-center mx-1 text-muted-foreground/20 flex-shrink-0">
                    <div className="w-3 h-px bg-current" />
                    <div className="w-0 h-0
                        border-y-[3px] border-y-transparent
                        border-l-[4px] border-l-current" />
                </div>
            )}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AIPipelineGraph() {
    const [stages, setStages] = useState<Record<StageKey, StageState>>(makeDefaultStages);
    const currentIdRef = useRef<string | null>(null);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMessage = useCallback((msg: AIPipelineMessage) => {
        const { request_id, stage, status, ts, detail } = msg;
        const stageKey = stage as StageKey;
        const nowMs = ts * 1000;

        // New request — reset all stages immediately
        if (request_id !== currentIdRef.current) {
            currentIdRef.current = request_id;
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            setStages(makeDefaultStages());
        }

        // Map backend status to local status
        const newStatus: StageStatus =
            status === "start"    ? "active"   :
            status === "complete" ? "complete" :
            status === "error"    ? "error"    :
            status === "skipped"  ? "skipped"  : "idle";

        setStages(prev => {
            if (!(stageKey in prev)) return prev;
            const cur = prev[stageKey];
            return {
                ...prev,
                [stageKey]: {
                    status:  newStatus,
                    detail:  detail ?? cur.detail,
                    startTs: status === "start"                            ? nowMs : cur.startTs,
                    endTs:   (status === "complete" || status === "error") ? nowMs : cur.endTs,
                },
            };
        });

        // After response completes, dim the graph after a delay
        if (stage === "response" && status === "complete") {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            idleTimerRef.current = setTimeout(() => {
                setStages(makeDefaultStages());
                currentIdRef.current = null;
            }, 7000);
        }
    }, []);

    useWebSocketWithHandler<AIPipelineMessage>("/api/ws/ai_pipeline", handleMessage);

    const hasActivity = Object.values(stages).some(s => s.status !== "idle");

    return (
        <div className={cn(
            "border-b border-border/30 bg-black/10 px-4 py-2 flex-shrink-0",
            "transition-opacity duration-700",
            !hasActivity && "opacity-40",
        )}>
            <div className="flex items-center gap-2">
                {/* Label */}
                <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40 flex-shrink-0 w-12">
                    Pipeline
                </span>
                {/* Stage nodes */}
                <div className="flex items-center flex-wrap gap-y-1">
                    {STAGES.map((stage, idx) => (
                        <StageNode
                            key={stage.key}
                            stage={stage}
                            state={stages[stage.key]}
                            isLast={idx === STAGES.length - 1}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
