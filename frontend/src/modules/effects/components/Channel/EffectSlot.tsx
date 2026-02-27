/**
 * EffectSlot - Individual effect instance in an effects chain
 *
 * Renders a SlotCard with:
 *   - Left border + power icon using theme primary (cyan) — same as clip highlights
 *   - Category shown as text subtitle only
 *   - Collapsible parameter section (EffectParameterControl per param)
 *   - Native drag/drop for reordering
 *   - Inline AI support
 */

import { useState } from "react";
import { useDAWStore }        from "@/stores/dawStore";
import { SlotCard }           from "@/components/ui/slot-card.tsx";
import { EffectParameterControl } from "./EffectParameterControl";
import { useInlineAI }        from "@/hooks/useInlineAI";
import { useEntityHighlight } from "@/hooks/useEntityHighlight";
import { InlineAIPromptPopover } from "@/components/ai/InlineAIPromptPopover";


// ─── Props ────────────────────────────────────────────────────────────────────

interface EffectSlotProps {
    effectId:     string;
    isDragging?:  boolean;
    isDragOver?:  boolean;
    onDragStart?: (effectId: string) => void;
    onDragEnd?:   () => void;
    onDragOver?:  (effectId: string) => void;
    onDragLeave?: () => void;
    onDrop?:      (effectId: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EffectSlot({
    effectId,
    isDragging  = false,
    isDragOver  = false,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
}: EffectSlotProps) {
    // ── Store ──────────────────────────────────────────────────────────────
    const effectChains          = useDAWStore(state => state.effectChains);
    const effectDefinitions     = useDAWStore(state => state.effectDefinitions);
    const updateEffectParameter = useDAWStore(state => state.updateEffectParameter);
    const toggleEffectBypass    = useDAWStore(state => state.toggleEffectBypass);
    const deleteEffect          = useDAWStore(state => state.deleteEffect);

    // ── Local state ────────────────────────────────────────────────────────
    const [isExpanded, setIsExpanded] = useState(false);

    // ── Inline AI ──────────────────────────────────────────────────────────
    const { handlers: aiHandlers, showPrompt: showAIPrompt, position: aiPosition, closePrompt: closeAIPrompt } = useInlineAI({
        entityType: "effect",
        entityId:   effectId,
        disabled:   isDragging,
    });
    const { highlightClass } = useEntityHighlight(effectId);

    // ── Derived ────────────────────────────────────────────────────────────
    let effect = null;
    for (const chain of Object.values(effectChains)) {
        const found = chain.effects.find(e => e.id === effectId);
        if (found) { effect = found; break; }
    }
    if (!effect) return null;

    const effectDefinition = effectDefinitions.find(def => def.name === effect.effect_name);

    // ── Drag handlers ──────────────────────────────────────────────────────
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest("button")) { e.preventDefault(); return; }
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", effect.id);
        onDragStart?.(effect.id);
    };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver?.(effect.id);
    };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        onDrop?.(effect.id);
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <>
            <SlotCard
                name={effect.display_name}
                subtitle={effectDefinition?.category}
                active={!effect.is_bypassed}
                onToggleActive={() => toggleEffectBypass(effect.id)}
                onDelete={() => deleteEffect(effect.id)}
                expanded={isExpanded}
                onToggleExpand={() => setIsExpanded(!isExpanded)}
                isDragging={isDragging}
                isDragOver={isDragOver}
                highlightClass={highlightClass}
                aiHandlers={aiHandlers}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={onDragLeave}
                onDrop={handleDrop}
                onDragEnd={onDragEnd}
            >
                {effectDefinition &&
                    effectDefinition.parameters
                        .filter(param => param.name !== "bypass")
                        .map(param => (
                            <EffectParameterControl
                                key={param.name}
                                parameter={param}
                                value={effect.parameters[param.name] ?? param.default}
                                onChange={value => updateEffectParameter(effect.id, param.name, value)}
                                disabled={effect.is_bypassed}
                            />
                        ))
                }
            </SlotCard>

            {showAIPrompt && aiPosition && (
                <InlineAIPromptPopover
                    entityType="effect"
                    entityId={effectId}
                    position={aiPosition}
                    onClose={closeAIPrompt}
                />
            )}
        </>
    );
}
