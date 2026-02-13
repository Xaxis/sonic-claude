/**
 * AI Chat Panel
 *
 * Chat interface for interacting with the AI agent.
 * Provides musical suggestions and insights.
 */

import { useState } from "react";
import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { Send, Sparkles } from "lucide-react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

const MOCK_MESSAGES: Message[] = [
    {
        id: "1",
        role: "assistant",
        content:
            "Hello! I'm your AI music assistant. I can help you with composition, mixing, sound design, and more. What would you like to work on?",
        timestamp: new Date(Date.now() - 300000),
    },
    {
        id: "2",
        role: "user",
        content: "Can you suggest a chord progression for a chill lo-fi beat?",
        timestamp: new Date(Date.now() - 240000),
    },
    {
        id: "3",
        role: "assistant",
        content:
            "Great choice! For a chill lo-fi vibe, try this progression:\n\nCmaj7 → Am7 → Fmaj7 → G7\n\nThis gives you that warm, jazzy feel. You can also add some voice leading by moving individual notes smoothly between chords. Want me to create this in the sequencer?",
        timestamp: new Date(Date.now() - 180000),
    },
];

const QUICK_ACTIONS = [
    "Suggest chord progression",
    "Improve mix balance",
    "Add variation to drums",
    "Create melody",
];

export function AIChatPanel() {
    const [messages] = useState<Message[]>(MOCK_MESSAGES);
    const [input, setInput] = useState("");

    const handleSend = () => {
        console.log("Send message:", input);
        setInput("");
    };

    const handleQuickAction = (action: string) => {
        console.log("Quick action:", action);
    };

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            {/* Chat Messages */}
            <SubPanel title="Conversation" className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-lg p-3 ${
                                    message.role === "user"
                                        ? "bg-cyan-500/20 text-cyan-100"
                                        : "bg-gray-800/50 text-gray-200"
                                }`}
                            >
                                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                                <div className="text-muted-foreground mt-1 text-xs">
                                    {message.timestamp.toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="border-border border-t p-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Ask the AI for help..."
                            className="border-border flex-1 rounded border bg-gray-800/50 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        />
                        <button
                            onClick={handleSend}
                            className="flex items-center gap-2 rounded bg-cyan-500 px-4 py-2 text-black transition-colors hover:bg-cyan-400"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </SubPanel>

            {/* Quick Actions */}
            <SubPanel title="Quick Actions">
                <div className="grid grid-cols-2 gap-2 p-3">
                    {QUICK_ACTIONS.map((action) => (
                        <button
                            key={action}
                            onClick={() => handleQuickAction(action)}
                            className="border-border flex items-center gap-2 rounded border bg-gray-800/50 px-3 py-2 text-xs transition-colors hover:bg-gray-700/50"
                        >
                            <Sparkles className="h-3 w-3 text-cyan-400" />
                            {action}
                        </button>
                    ))}
                </div>
            </SubPanel>
        </div>
    );
}
