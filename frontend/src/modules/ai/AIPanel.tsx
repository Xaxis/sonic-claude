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
import { AIProvider } from "./contexts/AIContext";
import { ChatLayout } from "./layouts/ChatLayout";
import { AnalysisLayout } from "./layouts/AnalysisLayout";
import { StateLayout } from "./layouts/StateLayout";
import { aiService } from "@/services/ai/ai.service";
import { useAIEngine } from "@/contexts/AIEngineContext";

export function AIPanel() {
    // UI State
    const { state, actions } = useAIState();

    // Global AI Engine Context (persists across tab switches)
    const {
        chatHistory,
        addChatMessage,
        analysisEvents,
        addAnalysisEvent,
        dawState,
        setDawState,
        aiContext,
        setAIContext,
    } = useAIEngine();

    // Event handlers
    const handlers = useAIHandlers({
        addChatMessage,
        addAnalysisEvent,
        setDawState,
        setAIContext,
        setIsSendingMessage: actions.setIsSendingMessage,
        setIsLoadingState: actions.setIsLoadingState,
    });

    // Load initial state on mount (only if not already loaded)
    useEffect(() => {
        const loadInitialState = async () => {
            try {
                actions.setIsLoadingState(true);
                console.log("AIPanel: Loading initial DAW state...");
                const response = await aiService.getState();
                console.log("AIPanel: Received state response:", response);
                setDawState(response.full_state || null);
                console.log("AIPanel: Set dawState to:", response.full_state || null);
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
        if (state.activeTab !== "state" && state.activeTab !== "analysis") return;

        const interval = setInterval(() => {
            handlers.handleRefreshState();
        }, state.refreshInterval);

        return () => clearInterval(interval);
    }, [state.autoRefreshEnabled, state.activeTab, state.refreshInterval, handlers]);

    return (
        <AIProvider
            state={state}
            actions={actions}
            dawState={dawState}
            aiContext={aiContext}
            chatHistory={chatHistory}
            analysisEvents={analysisEvents}
            handlers={handlers}
        >
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
                                <Button
                                    variant={state.activeTab === "state" ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => actions.setActiveTab("state")}
                                >
                                    DAW STATE
                                </Button>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-background/95">
                            {state.activeTab === "chat" && <ChatLayout />}
                            {state.activeTab === "analysis" && <AnalysisLayout />}
                            {state.activeTab === "state" && <StateLayout />}
                        </div>
                    </SubPanel>
                </div>
            </div>
        </AIProvider>
    );
}



