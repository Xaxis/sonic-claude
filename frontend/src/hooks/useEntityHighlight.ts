/**
 * useEntityHighlight - Hook for AI-driven entity highlighting
 *
 * This hook provides a simple way to check if an entity is currently
 * highlighted by the AI system and get animation classes.
 *
 * Usage:
 * ```tsx
 * const { isHighlighted, highlightClass } = useEntityHighlight(track.id);
 *
 * <div className={cn("track-header", highlightClass)}>
 *   {track.name}
 * </div>
 * ```
 */

import { useDAWStore } from "@/stores/dawStore";
import { useMemo } from "react";

export interface EntityHighlightResult {
    isHighlighted: boolean;
    highlightClass: string;
    timestamp: number | null;
}

export function useEntityHighlight(entityId: string): EntityHighlightResult {
    const highlights = useDAWStore((state) => state.inlineAIHighlights);

    const result = useMemo(() => {
        const timestamp = highlights.get(entityId);
        const isHighlighted = timestamp !== undefined;

        return {
            isHighlighted,
            highlightClass: isHighlighted
                ? "animate-ai-highlight ring-2 ring-primary/50 shadow-lg shadow-primary/20"
                : "",
            timestamp: timestamp ?? null,
        };
    }, [highlights, entityId]);

    return result;
}

