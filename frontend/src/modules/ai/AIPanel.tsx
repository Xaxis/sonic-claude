/**
 * AI Panel
 *
 * AI-powered music composition and performance assistant.
 * Accepts vague, creative commands and autonomously recomposes sequences.
 * Follows the same pattern as MixerPanel and SequencerPanel.
 */

import { useEffect } from "react";
import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useAIState } from "./hooks/useAIState";
import { useAIHandlers } from "./hooks/useAIHandlers";
import { ChatLayout } from "./layouts/ChatLayout";
import { AnalysisLayout } from "./layouts/AnalysisLayout";
import { api } from "@/services/api";
import { useAI } from "@/contexts/AIContext";
import { useSequencer } from "@/contexts/SequencerContext";
import { useMixer } from "@/contexts/MixerContext";
import { useEffects } from "@/contexts/EffectsContext";

export function AIPanel() {
    // UI State
    const { state, actions } = useAIState();

    // Global AI Engine Context - only get actions, layouts access data directly
    const {
        addChatMessage,
        addAnalysisEvent,
        setDawState,
        setAIContext,
    } = useAI();

    // Domain contexts (for reloading ALL UI after AI actions)
    const { activeSequenceId, loadTracks: loadSequencerTracks, loadSequences } = useSequencer();
    const { loadChannels } = useMixer();
    const { loadEffectDefinitions: loadEffectDefs } = useEffects();

    // Event handlers
    const handlers = useAIHandlers({
        addChatMessage,
        addAnalysisEvent,
        setDawState,
        setAIContext,
        setIsSendingMessage: actions.setIsSendingMessage,
        setIsLoadingState: actions.setIsLoadingState,
        // Reload functions to update ALL UI components after AI actions
        activeSequenceId,
        loadSequencerTracks,
        loadSequences,
        loadTracks: async () => {
            if (activeSequenceId) {
                await loadChannels(activeSequenceId);
            }
        },
        loadEffectDefs,
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
                setDawState(response.full_state || null);
                console.log("AIPanel: Set dawState to:", response.full_state || null);

                // Load AI context (what the LLM sees)
                try {
                    const contextResponse = await api.ai.getContext();
                    setAIContext(contextResponse.context);
                    console.log("AIPanel: Loaded AI context");
                } catch (error) {
                    console.error("AIPanel: Failed to load AI context:", error);
                    setAIContext("Error loading AI context: " + (error as Error).message);
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
                        {state.activeTab === "analysis" && <AnalysisLayout state={state} actions={actions} />}
                    </div>
                </SubPanel>
            </div>
        </div>
    );
}



