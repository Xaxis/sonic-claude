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
import { TabHeader, type Tab } from "@/components/ui/tab-header";
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

    // Tab configuration
    const tabs: Tab[] = [
        {
            id: "chat",
            label: "CHAT",
        },
        {
            id: "analysis",
            label: "ANALYSIS",
        },
    ];

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            <div className="flex-1 min-h-0 flex flex-col">
                <SubPanel title="ASSISTANT" showHeader={false} contentOverflow="hidden">
                    {/* Tab Navigation */}
                    <TabHeader
                        tabs={tabs}
                        activeTab={activeAssistantTab}
                        onTabChange={(tabId) => setActiveAssistantTab(tabId as "chat" | "analysis")}
                    />

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



