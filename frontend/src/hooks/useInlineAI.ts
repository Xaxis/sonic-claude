/**
 * useInlineAI - Universal hook for inline AI editing
 *
 * Provides a consistent pattern for triggering inline AI across all entities.
 * Supports both mouse (right-click, long-press) and touch (long-press).
 *
 * Usage:
 * ```tsx
 * const { handlers, showPrompt, position, closePrompt } = useInlineAI({
 *   entityType: 'track',
 *   entityId: track.id,
 * });
 *
 * <div {...handlers}>
 *   {track.name}
 * </div>
 *
 * {showPrompt && (
 *   <InlineAIPromptPopover
 *     entityType="track"
 *     entityId={track.id}
 *     position={position}
 *     onClose={closePrompt}
 *   />
 * )}
 * ```
 */

import { useState, useCallback, useRef } from "react";
import { useDAWStore } from "@/stores/dawStore";

export interface InlineAIConfig {
    entityType: "track" | "clip" | "effect" | "mixer_channel" | "composition";
    entityId: string;
    longPressDelay?: number; // ms, default 500
    disabled?: boolean;
}

export interface InlineAIPosition {
    x: number;
    y: number;
}

export interface InlineAIResult {
    handlers: {
        onContextMenu: (e: React.MouseEvent) => void;
        onMouseDown: (e: React.MouseEvent) => void;
        onMouseUp: () => void;
        onMouseLeave: () => void;
        onTouchStart: (e: React.TouchEvent) => void;
        onTouchEnd: () => void;
        onTouchCancel: () => void;
    };
    showPrompt: boolean;
    position: InlineAIPosition | null;
    closePrompt: () => void;
}

export function useInlineAI({
    entityType,
    entityId,
    longPressDelay = 500,
    disabled = false,
}: InlineAIConfig): InlineAIResult {
    const [showPrompt, setShowPrompt] = useState(false);
    const [position, setPosition] = useState<InlineAIPosition | null>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const isLongPressing = useRef(false);

    const setActiveInlineAIPrompt = useDAWStore((state) => state.setActiveInlineAIPrompt);

    const openPrompt = useCallback((x: number, y: number) => {
        if (disabled) return;

        setPosition({ x, y });
        setShowPrompt(true);
        setActiveInlineAIPrompt(entityType, entityId);
    }, [disabled, entityType, entityId, setActiveInlineAIPrompt]);

    const closePrompt = useCallback(() => {
        setShowPrompt(false);
        setPosition(null);
        setActiveInlineAIPrompt(null, null);
    }, [setActiveInlineAIPrompt]);

    const clearLongPressTimer = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        isLongPressing.current = false;
    }, []);

    // Right-click handler
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        openPrompt(e.clientX, e.clientY);
    }, [openPrompt]);

    // Long-press handlers (mouse)
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only trigger on left-click
        if (e.button !== 0) return;

        isLongPressing.current = true;
        const x = e.clientX;
        const y = e.clientY;

        longPressTimer.current = setTimeout(() => {
            if (isLongPressing.current) {
                openPrompt(x, y);
            }
        }, longPressDelay);
    }, [openPrompt, longPressDelay]);

    const handleMouseUp = useCallback(() => {
        clearLongPressTimer();
    }, [clearLongPressTimer]);

    const handleMouseLeave = useCallback(() => {
        clearLongPressTimer();
    }, [clearLongPressTimer]);

    // Long-press handlers (touch)
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        isLongPressing.current = true;
        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;

        longPressTimer.current = setTimeout(() => {
            if (isLongPressing.current) {
                openPrompt(x, y);
            }
        }, longPressDelay);
    }, [openPrompt, longPressDelay]);

    const handleTouchEnd = useCallback(() => {
        clearLongPressTimer();
    }, [clearLongPressTimer]);

    const handleTouchCancel = useCallback(() => {
        clearLongPressTimer();
    }, [clearLongPressTimer]);

    return {
        handlers: {
            onContextMenu: handleContextMenu,
            onMouseDown: handleMouseDown,
            onMouseUp: handleMouseUp,
            onMouseLeave: handleMouseLeave,
            onTouchStart: handleTouchStart,
            onTouchEnd: handleTouchEnd,
            onTouchCancel: handleTouchCancel,
        },
        showPrompt,
        position,
        closePrompt,
    };
}

