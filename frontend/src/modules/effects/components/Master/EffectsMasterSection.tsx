/**
 * EffectsMasterSection - Master effects column component
 *
 * Displays master bus effects chain.
 * Matches MixerMasterSection width (w-56) for 1:1 alignment.
 * Uses same EffectSlot and EffectSelector components as track effects.
 */

import { useState } from "react";
import { useEffectsContext } from "../../contexts/EffectsContext";
import { EffectSlot } from "../Channel/EffectSlot";
import { EffectSelector } from "../Channel/EffectSelector";

export function EffectsMasterSection() {
    const { handlers, effectDefinitions, masterEffectChain } = useEffectsContext();
    const {
        handleAddMasterEffect,
        handleUpdateMasterEffectParameter,
        handleToggleMasterEffectBypass,
        handleDeleteMasterEffect,
        handleMoveMasterEffect,
    } = handlers;

    // Get master effects sorted by slot index
    const effects = masterEffectChain?.effects || [];
    const sortedEffects = [...effects].sort((a, b) => a.slot_index - b.slot_index);

    // Check if we can add more effects (max 8)
    const canAddMore = effects.length < 8;

    // Drag state for reordering effects
    const [draggingEffectId, setDraggingEffectId] = useState<string | null>(null);
    const [dragOverEffectId, setDragOverEffectId] = useState<string | null>(null);

    return (
        <div className="flex w-56 flex-shrink-0 flex-col gap-3 rounded-lg border-2 border-primary/50 bg-gradient-to-b from-primary/10 to-primary/5 p-3 shadow-lg">
            {/* Master Header */}
            <div className="flex flex-col gap-1.5 border-b border-primary/30 pb-2.5">
                {/* Master Label */}
                <div className="truncate text-center text-xs font-bold uppercase tracking-wider text-primary drop-shadow-sm">
                    Master
                </div>

                {/* Master Badge */}
                <div className="flex justify-center">
                    <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary shadow-sm border border-primary/40">
                        FX CHAIN
                    </span>
                </div>
            </div>

            {/* Master Effects Chain - Scrollable with Drag and Drop */}
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
                                onParameterChange={handleUpdateMasterEffectParameter}
                                onToggleBypass={handleToggleMasterEffectBypass}
                                onDelete={handleDeleteMasterEffect}
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
                                            handleMoveMasterEffect(draggingEffectId, targetEffect.slot_index);
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
                    onEffectSelected={(effectName) => handleAddMasterEffect(effectName)}
                    disabled={!canAddMore}
                />
            )}
        </div>
    );
}

