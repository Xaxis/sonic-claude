/**
 * AI Panel
 *
 * AI assistant interface with chat and DAW state viewer.
 * Shows the exact state representation the AI uses for context.
 * Follows the same pattern as MixerPanel and SequencerPanel.
 */

import { useEffect, useState } from "react";
import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { aiService } from "@/services/ai/ai.service";
import { toast } from "sonner";
import type { ChatMessage, DAWStateSnapshot, AutonomousStatus } from "./types";

export function AIPanel() {
    // Chat state
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isSending, setIsSending] = useState(false);

    // DAW state viewer
    const [currentState, setCurrentState] = useState<DAWStateSnapshot | null>(null);
    const [stateHash, setStateHash] = useState<string | null>(null);

    // Load initial state on mount
    useEffect(() => {
        const loadState = async () => {
            try {
                const response = await aiService.getState(stateHash || undefined);
                if (response.full_state) {
                    setCurrentState(response.full_state);
                    setStateHash(response.full_state.state_hash || null);
                }
            } catch (error) {
                console.error("Failed to load state:", error);
            }
        };
        loadState();
    }, []);

    // Auto-refresh state every 2 seconds
    useEffect(() => {
        const loadState = async () => {
            try {
                const response = await aiService.getState(stateHash || undefined);
                if (response.full_state) {
                    setCurrentState(response.full_state);
                    setStateHash(response.full_state.state_hash || null);
                }
            } catch (error) {
                console.error("Failed to load state:", error);
            }
        };

        const interval = setInterval(() => {
            loadState();
        }, 2000);
        return () => clearInterval(interval);
    }, [stateHash]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isSending) return;

        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: inputValue,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsSending(true);

        try {
            const response = await aiService.sendMessage(inputValue);

            const assistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: response.response,
                timestamp: new Date(),
                actions_executed: response.actions_executed,
            };

            setMessages((prev) => [...prev, assistantMessage]);

            if (response.actions_executed > 0) {
                toast.success(`Executed ${response.actions_executed} action(s)`);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            toast.error("Failed to send message");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            {/* AI Content - Split view: Chat + State Viewer */}
            <div className="flex-1 min-h-0 flex gap-2">
                {/* Chat Section - Left side */}
                <div className="flex-1 flex flex-col min-w-0">
                    <SubPanel title="CHAT" showHeader={true} contentOverflow="hidden">
                        {/* Chat messages */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                    Ask AI to help with your music...
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg.id} className={`p-2 rounded ${msg.role === "user" ? "bg-primary/10 ml-8" : "bg-muted/30 mr-8"}`}>
                                        <div className="text-xs font-semibold mb-1">{msg.role === "user" ? "YOU" : "AI"}</div>
                                        <div className="text-sm">{msg.content}</div>
                                        {msg.actions_executed && msg.actions_executed > 0 && (
                                            <div className="text-xs text-primary/70 mt-1">✓ {msg.actions_executed} action(s)</div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Input */}
                        <div className="border-t border-border/50 p-3 flex gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                placeholder="Ask AI..."
                                disabled={isSending}
                                className="flex-1 px-3 py-2 bg-background/50 border border-border/50 rounded text-sm"
                            />
                            <button onClick={handleSendMessage} disabled={!inputValue.trim() || isSending} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50">
                                Send
                            </button>
                        </div>
                    </SubPanel>
                </div>

                {/* State Viewer - Right side */}
                <div className="w-80 flex flex-col min-w-0">
                    <SubPanel title="AI STATE VIEW" showHeader={true} contentOverflow="auto">
                        {currentState ? (
                            <div className="p-3 space-y-3 text-xs">
                                <div><strong>Tempo:</strong> {currentState.tempo} BPM</div>
                                <div><strong>Playing:</strong> {currentState.is_playing ? "Yes" : "No"}</div>
                                <div><strong>Tracks:</strong> {currentState.track_count}</div>
                                <div><strong>Clips:</strong> {currentState.clip_count}</div>
                                {currentState.audio && (
                                    <div className="border-t border-border/30 pt-2">
                                        <div className="font-semibold mb-1">AUDIO</div>
                                        <div>Energy: {currentState.audio.energy.toFixed(2)}</div>
                                        <div>Brightness: {currentState.audio.brightness.toFixed(2)}</div>
                                        <div>Loudness: {currentState.audio.loudness_db.toFixed(1)} dB</div>
                                    </div>
                                )}
                                {currentState.musical && (
                                    <div className="border-t border-border/30 pt-2">
                                        <div className="font-semibold mb-1">MUSICAL</div>
                                        <div>Key: {currentState.musical.key || "Unknown"}</div>
                                        <div>Scale: {currentState.musical.scale || "Unknown"}</div>
                                        <div>Density: {currentState.musical.note_density.toFixed(2)}</div>
                                        <div>Complexity: {currentState.musical.complexity.toFixed(2)}</div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                Loading state...
                            </div>
                        )}
                    </SubPanel>
                </div>
            </div>
        </div>
    );
}

