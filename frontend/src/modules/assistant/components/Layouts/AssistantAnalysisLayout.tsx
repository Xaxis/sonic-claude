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
 *
 * NO PROPS - Reads from Zustand store directly
 */

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Music, RefreshCw } from "lucide-react";
import { useDAWStore } from "@/stores/dawStore.ts";

export function AssistantAnalysisLayout() {
    // Read state from Zustand store
    const dawStateSnapshot = useDAWStore(state => state.dawStateSnapshot);
    const aiContext = useDAWStore(state => state.aiContext);
    const isLoadingAssistantState = useDAWStore(state => state.isLoadingAssistantState);
    const refreshAssistantState = useDAWStore(state => state.refreshAssistantState);
    const analysisEvents = useDAWStore(state => state.analysisEvents);

    // Determine display content
    const displayContent = (() => {
        if (!dawStateSnapshot) {
            return "Loading DAW state...";
        }
        if (!dawStateSnapshot.sequence) {
            return "No composition loaded. Create a new composition or load an existing one.";
        }
        if (!aiContext) {
            return "Loading AI context...";
        }
        return aiContext;
    })();

    if (!dawStateSnapshot) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="text-center space-y-3 max-w-md">
                    <Music size={48} className="mx-auto text-muted-foreground opacity-50" />
                    <p className="text-sm font-medium text-muted-foreground">Loading DAW state...</p>
                    <p className="text-xs text-muted-foreground/70">
                        Connecting to backend to fetch composition data
                    </p>
                </div>
            </div>
        );
    }

    if (!dawStateSnapshot.sequence) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="text-center space-y-3 max-w-md">
                    <Music size={48} className="mx-auto text-muted-foreground opacity-50" />
                    <p className="text-sm font-medium text-muted-foreground">No Composition Loaded</p>
                    <p className="text-xs text-muted-foreground/70">
                        Create a new composition or load an existing one.
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
                            onClick={() => refreshAssistantState()}
                            disabled={isLoadingAssistantState}
                        >
                            <RefreshCw size={14} className={isLoadingAssistantState ? "animate-spin" : ""} />
                        </Button>
                        <span className="text-[10px] text-muted-foreground">
                            {new Date(dawStateSnapshot.timestamp).toLocaleTimeString()}
                        </span>
                    </div>
                </div>

                {/* Analysis Events */}
                {analysisEvents.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
                            Recent Events
                        </div>
                        <div className="space-y-1">
                            {analysisEvents.slice(-5).reverse().map((event) => (
                                <div key={event.id} className="text-[11px] p-2 bg-muted/30 rounded">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[9px]">{event.type}</Badge>
                                        <span className="text-muted-foreground">
                                            {event.message || event.content}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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

