/**
 * EffectsChannelStrip - Individual effects column component
 *
 * REFACTORED: Pure component that reads everything from Zustand
 * - Reads ALL state from Zustand (tracks, effectChains, effectDefinitions)
 * - Calls actions directly from store
 * - Only receives trackId prop (identifier)
 *
 * Displays a sequencer track's effects chain as a vertical column.
 * Follows professional DAW layout: track header, 8 effect slots, add button.
 * Matches MixerChannelStrip width (w-56) for 1:1 alignment.
 * Supports native drag-and-drop reordering of effects
 */

import { useState } from "react";
import { useDAWStore }        from "@/stores/dawStore";
import { ChannelStrip }       from "@/components/ui/channel-strip.tsx";
import { ChannelStripHeader } from "@/components/ui/channel-strip-header.tsx";
import { EffectSlot }    from "./EffectSlot";
import { EffectSelector } from "./EffectSelector";

interface EffectsChannelStripProps {
    trackId: string; // ✅ Identifier - acceptable
}

export function EffectsChannelStrip({ trackId }: EffectsChannelStripProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);
    const effectChains = useDAWStore(state => state.effectChains);
    const effectDefinitions = useDAWStore(state => state.effectDefinitions);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const addEffect = useDAWStore(state => state.addEffect);
    const moveEffect = useDAWStore(state => state.moveEffect);

    // ========================================================================
    // DERIVED STATE: Get track and effect chain data
    // ========================================================================
    const track = tracks.find(t => t.id === trackId);
    const effectChain = effectChains[trackId] || null;

    // Validation: track must exist
    if (!track) {
        return null;
    }

    // Get effects sorted by slot index
    const effects = effectChain?.effects || [];
    const sortedEffects = [...effects].sort((a, b) => a.slot_index - b.slot_index);

    // Check if we can add more effects (max 8)
    const canAddMore = effects.length < 8;

    // ========================================================================
    // LOCAL STATE: Drag state for reordering effects
    // ========================================================================
    const [draggingEffectId, setDraggingEffectId] = useState<string | null>(null);
    const [dragOverEffectId, setDragOverEffectId] = useState<string | null>(null);

    return (
        <ChannelStrip>
            {/* Track Header */}
            <ChannelStripHeader
                name={track.name}
                color={track.color}
                label="FX Chain"
            />

            {/* Effects Chain - Scrollable with Drag and Drop */}
            <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                {sortedEffects.length === 0 ? (
                    // Empty state
                    <div className="flex flex-1 items-center justify-center">
                        <div className="text-center space-y-2">
                            <div className="text-2xl opacity-20">⚡</div>
                            <p className="text-[9px] text-muted-foreground">
                                No Effects
                            </p>
                        </div>
                    </div>
                ) : (
                    // Effect slots with native drag and drop
                    sortedEffects.map((effect) => {
                        return (
                            <EffectSlot
                                key={effect.id}
                                effectId={effect.id}
                                isDragging={draggingEffectId === effect.id}
                                isDragOver={dragOverEffectId === effect.id}
                                onDragStart={() => setDraggingEffectId(effect.id)}
                                onDragEnd={() => {
                                    setDraggingEffectId(null);
                                    setDragOverEffectId(null);
                                }}
                                onDragOver={() => setDragOverEffectId(effect.id)}
                                onDragLeave={() => setDragOverEffectId(null)}
                                onDrop={(targetEffectId) => {
                                    if (draggingEffectId && draggingEffectId !== targetEffectId) {
                                        // Find the target effect's slot index
                                        const targetEffect = sortedEffects.find(e => e.id === targetEffectId);
                                        if (targetEffect) {
                                            moveEffect(draggingEffectId, targetEffect.slot_index);
                                        }
                                    }
                                    setDraggingEffectId(null);
                                    setDragOverEffectId(null);
                                }}
                            />
                        );
                    })
                )}
            </div>

            {/* Add Effect Selector */}
            {canAddMore && (
                <EffectSelector
                    effectDefinitions={effectDefinitions}
                    onEffectSelected={(effectName) => addEffect(track.id, effectName)}
                    disabled={!canAddMore}
                />
            )}
        </ChannelStrip>
    );
}

