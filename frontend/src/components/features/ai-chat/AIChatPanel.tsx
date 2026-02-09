/**
 * AI Chat Panel
 * 
 * Chat interface for interacting with the AI agent.
 * Provides musical context and decision-making insights.
 */

import { Panel } from "@/components/ui/panel";

export function AIChatPanel() {
    return (
        <Panel title="AI CHAT" className="flex flex-col">
            <div className="flex-1 p-4">
                <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-primary mb-2">
                            AI Chat Panel
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Chat Interface • Quick Actions • AI Insights
                        </p>
                    </div>
                </div>
            </div>
        </Panel>
    );
}

