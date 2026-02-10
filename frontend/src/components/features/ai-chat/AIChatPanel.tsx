/**
 * AI Chat Panel
 *
 * Chat interface for interacting with the AI agent.
 * Provides musical suggestions and insights.
 */

import { useState } from "react";
import { SubPanel } from "@/components/ui/sub-panel";
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
        content: "Hello! I'm your AI music assistant. I can help you with composition, mixing, sound design, and more. What would you like to work on?",
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
        content: "Great choice! For a chill lo-fi vibe, try this progression:\n\nCmaj7 → Am7 → Fmaj7 → G7\n\nThis gives you that warm, jazzy feel. You can also add some voice leading by moving individual notes smoothly between chords. Want me to create this in the sequencer?",
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
        <div className="flex-1 flex flex-col gap-2 overflow-hidden h-full p-2">
            {/* Chat Messages */}
            <SubPanel title="Conversation" className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
                                <div className="text-xs text-muted-foreground mt-1">
                                    {message.timestamp.toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="border-t border-border p-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Ask the AI for help..."
                            className="flex-1 bg-gray-800/50 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        <button
                            onClick={handleSend}
                            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded transition-colors flex items-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </SubPanel>

            {/* Quick Actions */}
            <SubPanel title="Quick Actions">
                <div className="p-3 grid grid-cols-2 gap-2">
                    {QUICK_ACTIONS.map((action) => (
                        <button
                            key={action}
                            onClick={() => handleQuickAction(action)}
                            className="px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-border rounded text-xs transition-colors flex items-center gap-2"
                        >
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            {action}
                        </button>
                    ))}
                </div>
            </SubPanel>
        </div>
    );
}

