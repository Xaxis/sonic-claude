/**
 * Chat Layout
 *
 * User interaction with AI assistant.
 * Accepts vague, creative commands for autonomous composition.
 *
 * NO PROPS - Reads from Zustand store directly
 *
 * Respects settings:
 *  - aiQuickCommands        → custom one-click prompt buttons
 *  - aiShowRoutingIntent    → badge showing detected intent on AI messages
 *  - aiShowMusicalContext   → expandable context panel on AI messages
 */

import { useState, useRef, useEffect } from "react";
import { useDAWStore } from "@/stores/dawStore.ts";
import { useSettingsStore } from "@/stores/settingsStore";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Send, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "../../types.ts";

// ── Routing-intent display label map ──────────────────────────────────────────
const INTENT_LABELS: Record<string, string> = {
    create_content:    "Create",
    modify_content:    "Modify",
    delete_content:    "Delete",
    add_effects:       "Effects",
    playback_control:  "Playback",
    query_state:       "Query",
    general_chat:      "Chat",
};

// ── MusicalContext collapsible ────────────────────────────────────────────────
function MusicalContextPanel({ context }: { context: string }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="mt-2 rounded border border-border/30 overflow-hidden">
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            >
                {expanded
                    ? <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    : <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                }
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Musical Context
                </span>
            </button>
            {expanded && (
                <pre className="text-[10px] text-muted-foreground/70 font-mono px-3 py-2 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto bg-muted/10">
                    {context}
                </pre>
            )}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export function AssistantChatLayout() {
    // Store state
    const chatHistory       = useDAWStore(state => state.chatHistory);
    const isSendingMessage  = useDAWStore(state => state.isSendingMessage);
    const sendMessage       = useDAWStore(state => state.sendMessage);

    // AI settings
    const aiQuickCommands      = useSettingsStore(s => s.aiQuickCommands);
    const aiShowRoutingIntent  = useSettingsStore(s => s.aiShowRoutingIntent);
    const aiShowMusicalContext = useSettingsStore(s => s.aiShowMusicalContext);

    // Local UI state
    const [inputValue, setInputValue] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    const handleSend = async () => {
        if (!inputValue.trim() || isSendingMessage) return;
        await sendMessage(inputValue);
        setInputValue("");
    };

    return (
        <div className="flex h-full flex-col">
            {/* Quick Commands */}
            {aiQuickCommands.length > 0 && (
                <div className="border-b border-border/50 bg-muted/20 p-3 flex-shrink-0">
                    <div className="flex flex-wrap gap-2">
                        {aiQuickCommands.map((cmd) => (
                            <Button
                                key={cmd.label}
                                variant="outline"
                                size="sm"
                                onClick={() => setInputValue(cmd.prompt)}
                                className="text-xs"
                            >
                                <Sparkles size={12} className="mr-1.5 opacity-60" />
                                {cmd.label}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.length === 0 && !isSendingMessage ? (
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
                        {chatHistory.map((message: ChatMessage, idx: number) => (
                            <div
                                key={idx}
                                className={cn(
                                    "flex animate-in fade-in slide-in-from-bottom-2 duration-300",
                                    message.role === "user" ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "max-w-[80%] rounded-lg p-3",
                                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                                    )}
                                >
                                    <div className="flex items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            {/* Role + routing intent badge */}
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs opacity-70">
                                                    {message.role === "user" ? "You" : "AI Assistant"}
                                                </span>
                                                {message.role === "assistant" && aiShowRoutingIntent && message.routing_intent && (
                                                    <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary/70">
                                                        {INTENT_LABELS[message.routing_intent] ?? message.routing_intent}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Message content */}
                                            <div className="text-sm whitespace-pre-wrap">{message.content}</div>

                                            {/* Action badges */}
                                            {message.actions_executed && message.actions_executed.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {message.actions_executed.map((action: any, actionIdx: number) => (
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

                                            {/* Musical context (collapsible) */}
                                            {message.role === "assistant" && aiShowMusicalContext && message.musical_context && (
                                                <MusicalContextPanel context={message.musical_context} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Typing Indicator */}
                        {isSendingMessage && (
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
                        disabled={isSendingMessage}
                        className="flex-1"
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isSendingMessage}
                        size="icon"
                    >
                        <Send size={16} />
                    </Button>
                </div>
            </div>
        </div>
    );
}
