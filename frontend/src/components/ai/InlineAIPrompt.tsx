/**
 * InlineAIPrompt - Reusable inline AI editing component
 *
 * This component provides a compact, context-aware AI prompt that can be
 * embedded in context menus, popovers, or dialogs throughout the app.
 *
 * Features:
 * - Compact input field with send button
 * - Loading state with spinner
 * - Success/error feedback
 * - Auto-focus on mount
 * - Keyboard shortcuts (Enter to send, Escape to cancel)
 *
 * Usage:
 * ```tsx
 * <InlineAIPrompt
 *   entityType="track"
 *   entityId={track.id}
 *   compositionId={composition.id}
 *   placeholder="Ask AI to modify this track..."
 *   onSuccess={() => console.log('AI action completed')}
 *   onCancel={() => setShowPrompt(false)}
 * />
 * ```
 */

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDAWStore } from "@/stores/dawStore";

interface InlineAIPromptProps {
    entityType: "track" | "clip" | "effect" | "mixer_channel" | "composition";
    entityId: string;
    compositionId: string;
    placeholder?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
    className?: string;
}

export function InlineAIPrompt({
    entityType,
    entityId,
    compositionId,
    placeholder = "Ask AI...",
    onSuccess,
    onCancel,
    className,
}: InlineAIPromptProps) {
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const sendContextualMessage = useDAWStore((state) => state.sendContextualMessage);

    // Auto-focus on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        setIsLoading(true);
        setStatus("idle");
        setErrorMessage(null);

        try {
            await sendContextualMessage({
                message: input.trim(),
                entity_type: entityType,
                entity_id: entityId,
                composition_id: compositionId,
            });

            setStatus("success");
            setInput("");

            // Call success callback after a brief delay
            setTimeout(() => {
                onSuccess?.();
            }, 1000);
        } catch (error) {
            setStatus("error");
            setErrorMessage(error instanceof Error ? error.message : "Failed to process AI request");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel?.();
        }
    };

    return (
        <div className={cn("flex flex-col gap-2 p-3 bg-background/95 backdrop-blur-sm rounded-lg border border-border shadow-lg", className)}>
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">
                        AI Edit {entityType.replace("_", " ")}
                    </span>
                </div>
                {onCancel && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={onCancel}
                    >
                        <X size={12} />
                    </Button>
                )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2">
                <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={isLoading}
                    className="flex-1 h-8 text-xs"
                />
                <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    size="sm"
                    className="h-8 px-3"
                >
                    {isLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <Send size={14} />
                    )}
                </Button>
            </div>

            {/* Status */}
            {status === "success" && (
                <div className="flex items-center gap-2 text-xs text-green-500">
                    <CheckCircle2 size={12} />
                    <span>AI modifications applied!</span>
                </div>
            )}
            {status === "error" && (
                <div className="flex items-center gap-2 text-xs text-red-500">
                    <AlertCircle size={12} />
                    <span>{errorMessage || "Failed to process request"}</span>
                </div>
            )}
        </div>
    );
}

