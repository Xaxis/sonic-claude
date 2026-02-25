/**
 * InlineAIPromptPopover - Floating AI prompt that appears at cursor position
 *
 * This is the universal UI for inline AI editing across all entities.
 * Appears at the exact position where the user right-clicked or long-pressed.
 *
 * Features:
 * - Positioned absolutely at cursor/touch location
 * - Auto-adjusts to stay within viewport bounds
 * - Backdrop click to close
 * - Escape key to close
 * - Auto-focus input
 *
 * Usage:
 * ```tsx
 * {showPrompt && (
 *   <InlineAIPromptPopover
 *     entityType="track"
 *     entityId={track.id}
 *     position={{ x: 100, y: 200 }}
 *     onClose={() => setShowPrompt(false)}
 *   />
 * )}
 * ```
 */

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Sparkles, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDAWStore } from "@/stores/dawStore";
import { createPortal } from "react-dom";

interface InlineAIPromptPopoverProps {
    entityType: "track" | "clip" | "effect" | "mixer_channel" | "composition";
    entityId: string;
    position: { x: number; y: number };
    onClose: () => void;
}

export function InlineAIPromptPopover({
    entityType,
    entityId,
    position,
    onClose,
}: InlineAIPromptPopoverProps) {
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [adjustedPosition, setAdjustedPosition] = useState(position);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const activeComposition = useDAWStore((state) => state.activeComposition);
    const sendContextualMessage = useDAWStore((state) => state.sendContextualMessage);

    // Auto-focus on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Adjust position to stay within viewport
    useEffect(() => {
        if (!popoverRef.current) return;

        const rect = popoverRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let x = position.x;
        let y = position.y;

        // Adjust horizontal position
        if (x + rect.width > viewportWidth) {
            x = viewportWidth - rect.width - 10;
        }
        if (x < 10) {
            x = 10;
        }

        // Adjust vertical position
        if (y + rect.height > viewportHeight) {
            y = viewportHeight - rect.height - 10;
        }
        if (y < 10) {
            y = 10;
        }

        setAdjustedPosition({ x, y });
    }, [position]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const handleSend = async () => {
        if (!input.trim() || isLoading || !activeComposition) return;

        setIsLoading(true);
        setStatus("idle");
        setErrorMessage(null);

        try {
            await sendContextualMessage({
                message: input.trim(),
                entity_type: entityType,
                entity_id: entityId,
                composition_id: activeComposition.id,
            });

            setStatus("success");
            setInput("");

            // Close after brief success display
            setTimeout(() => {
                onClose();
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
        }
    };

    const entityLabel = entityType.replace("_", " ");

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[9998]"
                onClick={onClose}
            />

            {/* Popover */}
            <div
                ref={popoverRef}
                className="fixed z-[9999] w-80"
                style={{
                    left: `${adjustedPosition.x}px`,
                    top: `${adjustedPosition.y}px`,
                }}
            >
                <div className="flex flex-col gap-2 p-3 bg-background/98 backdrop-blur-md rounded-lg border-2 border-primary/30 shadow-2xl shadow-primary/10">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-primary animate-pulse" />
                            <span className="text-sm font-semibold">
                                AI Edit <span className="text-primary">{entityLabel}</span>
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={onClose}
                        >
                            <X size={14} />
                        </Button>
                    </div>

                    {/* Input */}
                    <div className="flex items-center gap-2">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={`Describe changes to this ${entityLabel}...`}
                            disabled={isLoading}
                            className="flex-1 h-9 text-sm"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            size="sm"
                            className="h-9 px-3"
                        >
                            {isLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Send size={16} />
                            )}
                        </Button>
                    </div>

                    {/* Status */}
                    {status === "success" && (
                        <div className="flex items-center gap-2 text-sm text-green-400">
                            <CheckCircle2 size={14} />
                            <span>Changes applied!</span>
                        </div>
                    )}
                    {status === "error" && (
                        <div className="flex items-center gap-2 text-sm text-red-400">
                            <AlertCircle size={14} />
                            <span>{errorMessage || "Failed to process request"}</span>
                        </div>
                    )}
                </div>
            </div>
        </>,
        document.body
    );
}

