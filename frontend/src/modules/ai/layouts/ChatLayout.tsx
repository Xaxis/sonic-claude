/**
 * Chat Layout
 *
 * User interaction with AI assistant.
 * Accepts vague, creative commands for autonomous composition.
 */

import { useState, useRef, useEffect } from "react";
import { useAIContext } from "../contexts/AIContext";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Send, Sparkles, Music, Zap, Info } from "lucide-react";

export function ChatLayout() {
    const { chatHistory, handlers, state } = useAIContext();
    const [inputValue, setInputValue] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    const handleSend = async () => {
        if (!inputValue.trim() || state.isSendingMessage) return;
        await handlers.handleSendMessage(inputValue);
        setInputValue("");
    };

    const handleQuickCommand = (command: string) => {
        setInputValue(command);
    };

    return (
        <div className="flex h-full flex-col">
            {/* Quick Commands */}
            <div className="border-b border-border/50 bg-muted/20 p-3 flex-shrink-0">
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickCommand("Recompose this sequence to be more ambient and atmospheric")}
                    >
                        <Sparkles size={14} className="mr-1" />
                        Make Ambient
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickCommand("Add rhythmic variation and tension to the drums")}
                    >
                        <Zap size={14} className="mr-1" />
                        Add Tension
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickCommand("Create a melodic variation on the current theme")}
                    >
                        <Music size={14} className="mr-1" />
                        Add Variation
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickCommand("Explain the current musical state and suggest improvements")}
                    >
                        <Info size={14} className="mr-1" />
                        Analyze & Suggest
                    </Button>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.length === 0 && !state.isSendingMessage ? (
                    <div className="flex h-full items-center justify-center text-center">
                        <div className="space-y-2 text-muted-foreground">
                            <Sparkles size={32} className="mx-auto opacity-50" />
                            <p className="text-sm font-medium">AI Music Composition Assistant</p>
                            <p className="text-xs max-w-md">
                                Give me vague, creative commands like "make this more ambient" or "add tension".
                                I'll autonomously recompose your sequence with reversible iterations.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {chatHistory.map((message, idx) => (
                            <div
                                key={idx}
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg p-3 ${
                                        message.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted"
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        <div className="flex-1">
                                            <div className="text-xs opacity-70 mb-1">
                                                {message.role === "user" ? "You" : "AI Assistant"}
                                            </div>
                                            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                                            {message.actions_executed && message.actions_executed.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {message.actions_executed.map((action, actionIdx) => (
                                                        <Badge
                                                            key={actionIdx}
                                                            variant={action.success ? "default" : "destructive"}
                                                            className="text-[10px]"
                                                        >
                                                            {action.action}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Typing Indicator */}
                        {state.isSendingMessage && (
                            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <span className="text-xs text-muted-foreground">AI is analyzing your sequence and composing...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border/50 bg-muted/20 p-3 flex-shrink-0">
                <div className="flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Give me a vague, creative command..."
                        disabled={state.isSendingMessage}
                        className="flex-1"
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || state.isSendingMessage}
                        size="icon"
                    >
                        <Send size={16} />
                    </Button>
                </div>
            </div>
        </div>
    );
}

