/**
 * useInlineAI - Universal hook for inline AI editing
 *
 * Provides a consistent pattern for triggering inline AI across all entities.
 * ONLY uses sustained hold (long-press) for both mouse and touch.
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
    entityType: "track" | "clip" | "effect" | "mixer_channel" | "composition" | "panel";
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
        onMouseDown: (e: React.MouseEvent) => void;
        onMouseMove: (e: React.MouseEvent) => void;
        onMouseUp: () => void;
        onMouseLeave: () => void;
        onTouchStart: (e: React.TouchEvent) => void;
        onTouchMove: (e: React.TouchEvent) => void;
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
    const startPosition = useRef<{ x: number; y: number } | null>(null);
    const movementThreshold = 5; // pixels - if user moves more than this, cancel AI and allow drag

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
        startPosition.current = null;
    }, []);

    // Sustained hold handlers (mouse)
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only trigger on left-click
        if (e.button !== 0) return;

        isLongPressing.current = true;
        const x = e.clientX;
        const y = e.clientY;
        startPosition.current = { x, y };

        longPressTimer.current = setTimeout(() => {
            if (isLongPressing.current) {
                openPrompt(x, y);
            }
        }, longPressDelay);
    }, [openPrompt, longPressDelay]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isLongPressing.current || !startPosition.current) return;

        const deltaX = Math.abs(e.clientX - startPosition.current.x);
        const deltaY = Math.abs(e.clientY - startPosition.current.y);

        // If user moved more than threshold, cancel AI prompt and allow drag
        if (deltaX > movementThreshold || deltaY > movementThreshold) {
            clearLongPressTimer();
        }
    }, [clearLongPressTimer, movementThreshold]);

    const handleMouseUp = useCallback(() => {
        clearLongPressTimer();
    }, [clearLongPressTimer]);

    const handleMouseLeave = useCallback(() => {
        clearLongPressTimer();
    }, [clearLongPressTimer]);

    // Sustained hold handlers (touch)
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        isLongPressing.current = true;
        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        startPosition.current = { x, y };

        longPressTimer.current = setTimeout(() => {
            if (isLongPressing.current) {
                openPrompt(x, y);
            }
        }, longPressDelay);
    }, [openPrompt, longPressDelay]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isLongPressing.current || !startPosition.current) return;

        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - startPosition.current.x);
        const deltaY = Math.abs(touch.clientY - startPosition.current.y);

        // If user moved more than threshold, cancel AI prompt and allow drag
        if (deltaX > movementThreshold || deltaY > movementThreshold) {
            clearLongPressTimer();
        }
    }, [clearLongPressTimer, movementThreshold]);

    const handleTouchEnd = useCallback(() => {
        clearLongPressTimer();
    }, [clearLongPressTimer]);

    const handleTouchCancel = useCallback(() => {
        clearLongPressTimer();
    }, [clearLongPressTimer]);

    return {
        handlers: {
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp,
            onMouseLeave: handleMouseLeave,
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
            onTouchCancel: handleTouchCancel,
        },
        showPrompt,
        position,
        closePrompt,
    };
}

