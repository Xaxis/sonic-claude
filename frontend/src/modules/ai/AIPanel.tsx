/**
 * AI Panel
 *
 * AI-powered music composition and performance assistant.
 * Accepts vague, creative commands and autonomously recomposes sequences.
 * Follows the same pattern as MixerPanel and SequencerPanel.
 */

import { useEffect, useState } from "react";
import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useAIState } from "./hooks/useAIState";
import { useAIHandlers } from "./hooks/useAIHandlers";
import { ChatLayout } from "./layouts/ChatLayout";
import { AnalysisLayout } from "./layouts/AnalysisLayout";
import { api } from "@/services/api";
import { useDAWStore } from "@/stores/dawStore";

export function AIPanel() {
    // UI State
    const { state, actions } = useAIState();

    // Local state for DAW state and AI context (used in Analysis tab)
    const [dawState, setDawState] = useState<any>(null);
    const [aiContext, setAIContext] = useState<string | null>(null);

    // Get state and actions from Zustand store
    const activeComposition = useDAWStore(state => state.activeComposition);
    const addChatMessage = useDAWStore(state => state.addChatMessage);
    const addAnalysisEvent = useDAWStore(state => state.addAnalysisEvent);
    const loadCompositions = useDAWStore(state => state.loadCompositions);
    const loadChannels = useDAWStore(state => state.loadChannels);
    const loadEffectDefinitions = useDAWStore(state => state.loadEffectDefinitions);

    // Event handlers
    const handlers = useAIHandlers({
        addChatMessage,
        addAnalysisEvent,
        setDawState,
        setAIContext,
        setIsSendingMessage: actions.setIsSendingMessage,
        setIsLoadingState: actions.setIsLoadingState,
        // Reload functions to update ALL UI components after AI actions
        activeSequenceId: activeComposition?.id || null,
        loadSequencerTracks: async () => {
            // Tracks are loaded as part of composition - no separate action needed
        },
        loadSequences: loadCompositions,
        loadTracks: async () => {
            if (activeComposition?.id) {
                await loadChannels(activeComposition.id);
            }
        },
        loadEffectDefs: loadEffectDefinitions,
    });

    // Load initial state AND AI context on mount
    useEffect(() => {
        const loadInitialState = async () => {
            try {
                actions.setIsLoadingState(true);
                console.log("AIPanel: Loading initial DAW state and AI context...");

                // Load DAW state
                const response = await api.ai.getState();
                console.log("AIPanel: Received state response:", response);
                // Store in local state for display
                console.log("AIPanel: Set dawState to:", response.full_state || null);

                // Load AI context (what the LLM sees)
                try {
                    await api.ai.getContext();
                    console.log("AIPanel: Loaded AI context");
                } catch (error) {
                    console.error("AIPanel: Failed to load AI context:", error);
                }
            } catch (error) {
                console.error("AIPanel: Failed to load initial state:", error);
            } finally {
                actions.setIsLoadingState(false);
            }
        };

        loadInitialState();
    }, []);

    // Auto-refresh state when enabled (for both analysis and state tabs)
    useEffect(() => {
        if (!state.autoRefreshEnabled) return;
        if (state.activeTab !== "analysis") return;

        const interval = setInterval(() => {
            handlers.handleRefreshState();
        }, state.refreshInterval);

        return () => clearInterval(interval);
    }, [state.autoRefreshEnabled, state.activeTab, state.refreshInterval, handlers]);

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            <div className="flex-1 min-h-0 flex flex-col">
                <SubPanel title="AI ASSISTANT" showHeader={false} contentOverflow="hidden">
                    {/* Tab Navigation */}
                    <div className="border-b-2 border-border/70 bg-gradient-to-b from-muted/30 to-muted/10 px-4 py-2.5 flex-shrink-0 shadow-sm">
                        <div className="flex gap-2">
                            <Button
                                variant={state.activeTab === "chat" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => actions.setActiveTab("chat")}
                            >
                                CHAT
                            </Button>
                            <Button
                                variant={state.activeTab === "analysis" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => actions.setActiveTab("analysis")}
                            >
                                ANALYSIS
                            </Button>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-background/95">
                        {state.activeTab === "chat" && <ChatLayout state={state} handlers={handlers} />}
                        {state.activeTab === "analysis" && <AnalysisLayout state={state} actions={actions} dawState={dawState} aiContext={aiContext} />}
                    </div>
                </SubPanel>
            </div>
        </div>
    );
}



