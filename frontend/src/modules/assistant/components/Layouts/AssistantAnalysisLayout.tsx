/**
 * Analysis Layout
 *
 * Real-time musical analysis of the current sequence:
 * - Timeline (what happens when)
 * - Harmonic analysis (chords, progressions)
 * - Rhythmic analysis (patterns, groove)
 * - Arrangement (track layering)
 *
 * Updates continuously to show what the AI sees.
 */

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Music } from "lucide-react";
import type { AIState, AIActions } from "../../hooks/useAIState.ts";

interface AssistantAnalysisLayoutProps {
    state: AIState;
    actions: AIActions;
    dawState: any;
    aiContext: string | null;
}

export function AssistantAnalysisLayout({ state, actions, dawState, aiContext }: AssistantAnalysisLayoutProps) {
    // Determine display content
    const displayContent = (() => {
        if (!dawState) {
            return "Loading DAW state...";
        }
        if (!dawState.sequence) {
            return "No sequence loaded. Create a new sequence or load an existing one from the Sequencer panel.";
        }
        if (!aiContext) {
            return "Loading AI context...";
        }
        return aiContext;
    })();

    if (!dawState) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="text-center space-y-3 max-w-md">
                    <Music size={48} className="mx-auto text-muted-foreground opacity-50" />
                    <p className="text-sm font-medium text-muted-foreground">Loading DAW state...</p>
                    <p className="text-xs text-muted-foreground/70">
                        Connecting to backend to fetch sequence data
                    </p>
                </div>
            </div>
        );
    }

    if (!dawState.sequence) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="text-center space-y-3 max-w-md">
                    <Music size={48} className="mx-auto text-muted-foreground opacity-50" />
                    <p className="text-sm font-medium text-muted-foreground">No Sequence Loaded</p>
                    <p className="text-xs text-muted-foreground/70">
                        Create a new sequence or load an existing one from the Sequencer panel.
                        Once you have tracks and clips, the AI will analyze the musical content here.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                        <Music size={16} className="text-primary" />
                        <span className="text-sm font-semibold">Real-Time Musical Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={actions.toggleAutoRefresh}
                        >
                            <Badge variant={state.autoRefreshEnabled ? "default" : "outline"} className="text-[10px]">
                                Auto-refresh {state.autoRefreshEnabled ? "ON" : "OFF"}
                            </Badge>
                        </Button>
                        <span className="text-[10px] text-muted-foreground">
                            {new Date(dawState.timestamp).toLocaleTimeString()}
                        </span>
                    </div>
                </div>

                {/* Analysis content - EXACT context sent to LLM */}
                <div className="space-y-2">
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
                        ⚡ What the AI Sees (Exact LLM Context)
                    </div>
                    <pre className="text-[11px] font-mono whitespace-pre-wrap text-foreground/90 leading-relaxed">
                        {displayContent}
                    </pre>
                </div>
            </div>
        </div>
    );
}

