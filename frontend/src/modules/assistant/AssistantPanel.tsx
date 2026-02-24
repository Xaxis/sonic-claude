/**
 * Assistant Panel
 *
 * AI-powered music composition and performance assistant.
 * Accepts vague, creative commands and autonomously recomposes sequences.
 * Follows the same pattern as MixerPanel and SequencerPanel.
 *
 * NO PROP DRILLING - Components read from Zustand store directly
 */

import { useEffect } from "react";
import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { Button } from "@/components/ui/button.tsx";
import { AssistantChatLayout } from "@/modules/assistant/components/Layouts/AssistantChatLayout.tsx";
import { AssistantAnalysisLayout } from "@/modules/assistant/components/Layouts/AssistantAnalysisLayout.tsx";
import { useDAWStore } from "@/stores/dawStore";

export function AssistantPanel() {
    // Read state from Zustand store
    const activeAssistantTab = useDAWStore(state => state.activeAssistantTab);
    const setActiveAssistantTab = useDAWStore(state => state.setActiveAssistantTab);
    const refreshAssistantState = useDAWStore(state => state.refreshAssistantState);

    // Load initial state on mount
    useEffect(() => {
        refreshAssistantState();
    }, [refreshAssistantState]);

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            <div className="flex-1 min-h-0 flex flex-col">
                <SubPanel title="ASSISTANT" showHeader={false} contentOverflow="hidden">
                    {/* Tab Navigation */}
                    <div className="border-b-2 border-border/70 bg-gradient-to-b from-muted/30 to-muted/10 px-4 py-2.5 flex-shrink-0 shadow-sm">
                        <div className="flex gap-2">
                            <Button
                                variant={activeAssistantTab === "chat" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setActiveAssistantTab("chat")}
                            >
                                CHAT
                            </Button>
                            <Button
                                variant={activeAssistantTab === "analysis" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setActiveAssistantTab("analysis")}
                            >
                                ANALYSIS
                            </Button>
                        </div>
                    </div>

                    {/* Tab Content - NO PROPS, components read from store */}
                    <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-background/95">
                        {activeAssistantTab === "chat" && <AssistantChatLayout />}
                        {activeAssistantTab === "analysis" && <AssistantAnalysisLayout />}
                    </div>
                </SubPanel>
            </div>
        </div>
    );
}



