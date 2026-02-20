/**
 * EffectsChannelStrip - Individual effects column component
 *
 * Displays a sequencer track's effects chain as a vertical column.
 * Follows professional DAW layout: track header, 8 effect slots, add button.
 * Matches MixerChannelStrip width (w-56) for 1:1 alignment.
 *
 * Architecture:
 * - Uses EffectSlot for each effect instance
 * - Uses EffectSelector for adding new effects
 * - Manages effect chain state via context
 * - Follows established UI/UX patterns
 * - Supports native drag-and-drop reordering of effects
 */

import { useState } from "react";
import { useEffectsContext } from '@/contexts/EffectsContext';
import { EffectSlot } from "./EffectSlot";
import { EffectSelector } from "./EffectSelector";
import type { SequencerTrack } from "@/modules/sequencer/types";
import type { TrackEffectChain, EffectInstance } from "@/services/api/providers";

interface EffectsChannelStripProps {
    track: SequencerTrack;
    effectChain: TrackEffectChain | null;
}

export function EffectsChannelStrip({ track, effectChain }: EffectsChannelStripProps) {
    const { handlers, effectDefinitions } = useEffectsContext();
    const {
        handleAddEffect,
        handleUpdateEffectParameter,
        handleToggleEffectBypass,
        handleDeleteEffect,
        handleMoveEffect,
    } = handlers;

    // Get effects sorted by slot index
    const effects = effectChain?.effects || [];
    const sortedEffects = [...effects].sort((a, b) => a.slot_index - b.slot_index);

    // Check if we can add more effects (max 8)
    const canAddMore = effects.length < 8;

    // Drag state for reordering effects
    const [draggingEffectId, setDraggingEffectId] = useState<string | null>(null);
    const [dragOverEffectId, setDragOverEffectId] = useState<string | null>(null);

    return (
        <div className="flex w-56 flex-shrink-0 flex-col gap-3 rounded-lg border border-border/70 bg-gradient-to-b from-card to-card/60 p-3 shadow-lg hover:border-border transition-all">
            {/* Track Header - Matches MixerChannelStrip */}
            <div className="flex flex-col gap-1.5 border-b border-border/30 pb-2.5">
                {/* Track Name */}
                <div
                    className="truncate text-center text-xs font-bold uppercase tracking-wider drop-shadow-sm"
                    style={{ color: track.color }}
                    title={track.name}
                >
                    {track.name}
                </div>

                {/* Track Type Badge */}
                <div className="flex justify-center">
                    <span
                        className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm"
                        style={{
                            backgroundColor: `${track.color}20`,
                            color: track.color,
                            border: `1px solid ${track.color}40`,
                        }}
                    >
                        FX CHAIN
                    </span>
                </div>
            </div>

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
                        const effectDef = effectDefinitions.find(
                            (def) => def.name === effect.effect_name
                        );
                        return (
                            <EffectSlot
                                key={effect.id}
                                effect={effect}
                                effectDefinition={effectDef}
                                onParameterChange={handleUpdateEffectParameter}
                                onToggleBypass={handleToggleEffectBypass}
                                onDelete={handleDeleteEffect}
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
                                            handleMoveEffect(draggingEffectId, targetEffect.slot_index);
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
                    onEffectSelected={(effectName) => handleAddEffect(track.id, effectName)}
                    disabled={!canAddMore}
                />
            )}
        </div>
    );
}

