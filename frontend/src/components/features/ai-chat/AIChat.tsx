import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useSpectralData } from "@/contexts/SpectralDataContext";
import type { ChatMessage } from "@/types";

export function AIChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { attachedData, detachSpectralData, isAttached } = useSpectralData();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isThinking) return;

        const userMessage: ChatMessage = {
            role: "user",
            content: input,
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsThinking(true);

        try {
            // Include spectral data if attached
            const spectralData =
                isAttached && attachedData
                    ? {
                          sample_name: attachedData.sampleName,
                          sample_id: attachedData.sampleId,
                          features: attachedData.features,
                          selected_features: attachedData.selectedFeatures,
                      }
                    : undefined;

            const response = await api.sendChat(input, spectralData);

            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: response.response,
                timestamp: Date.now(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Chat error:", error);
            const errorMessage: ChatMessage = {
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again.",
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
            {/* Attached Spectral Data Indicator */}
            {isAttached && attachedData && (
                <div className="space-y-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-400">
                            <Paperclip className="h-4 w-4" />
                            <span>Spectral Data Attached</span>
                        </div>
                        <Button
                            onClick={detachSpectralData}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-green-400 hover:text-green-300"
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <div className="text-xs text-green-300/80">
                        <div className="font-medium">{attachedData.sampleName}</div>
                        <div className="mt-1 text-green-400/60">
                            {Object.entries(attachedData.selectedFeatures)
                                .filter(([_, enabled]) => enabled)
                                .map(([key]) => key)
                                .join(", ")}
                        </div>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                {messages.length === 0 && (
                    <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                        Start a conversation with the AI DJ...
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in`}
                    >
                        <div
                            className={`max-w-[85%] rounded-lg px-4 py-2.5 shadow-lg ${
                                msg.role === "user"
                                    ? "bg-primary/15 border-primary/30 text-foreground border"
                                    : "bg-secondary/15 border-secondary/30 text-foreground border"
                            }`}
                        >
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.content}
                            </div>
                            <div className="mt-1.5 font-mono text-xs opacity-40">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                ))}

                {isThinking && (
                    <div className="animate-in flex justify-start">
                        <div className="bg-secondary/15 border-secondary/30 flex items-center gap-2 rounded-lg border px-4 py-2.5 shadow-lg">
                            <Loader2 className="text-secondary h-4 w-4 animate-spin" />
                            <span className="text-foreground text-sm">AI is thinking...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Tell the AI what you want..."
                    disabled={isThinking}
                    className="bg-input border-primary/20 text-foreground placeholder:text-muted-foreground focus:border-primary/50 flex-1 transition-colors"
                />
                <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isThinking}
                    variant="primary"
                    size="icon"
                    className="shadow-primary/20 shadow-lg"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
