/**
 * EffectsChain Component
 * 
 * Container for all effect slots on a track.
 * Shows up to 8 effect slots with add button.
 * 
 * Architecture:
 * - Displays all effects in order (slot 0-7)
 * - Shows EffectSelector to add new effects
 * - Manages effect chain state
 * - Integrates with track header expanded mode
 */

import { useEffect, useState } from "react";
import { EffectSlot } from "./EffectSlot.tsx";
import { EffectSelector } from "./EffectSelector.tsx";
import { api } from "@/services/api";
import type { EffectInstance, EffectDefinition, TrackEffectChain } from "@/services/api/providers";

interface EffectsChainProps {
    trackId: string;
    onEffectAdded?: () => void;
    onEffectRemoved?: () => void;
    onEffectUpdated?: () => void;
}

export function EffectsChain({
    trackId,
    onEffectAdded,
    onEffectRemoved,
    onEffectUpdated,
}: EffectsChainProps) {
    const [effectChain, setEffectChain] = useState<TrackEffectChain | null>(null);
    const [effectDefinitions, setEffectDefinitions] = useState<EffectDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load effect chain and definitions
    useEffect(() => {
        loadEffectChain();
        loadEffectDefinitions();
    }, [trackId]);

    const loadEffectChain = async () => {
        try {
            setIsLoading(true);
            const chain = await api.effects.getTrackEffectChain(trackId);
            setEffectChain(chain);
        } catch (error) {
            console.error("Failed to load effect chain:", error);
            // Initialize empty chain on error
            setEffectChain({
                track_id: trackId,
                effects: [],
                max_slots: 8,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const loadEffectDefinitions = async () => {
        try {
            const defs = await api.effects.getDefinitions();
            setEffectDefinitions(defs);
        } catch (error) {
            console.error("Failed to load effect definitions:", error);
        }
    };

    const handleEffectAdded = async (trackId: string, effectName: string) => {
        try {
            // Find next available slot
            const usedSlots = effectChain?.effects.map(e => e.slot_index) || [];
            const nextSlot = Array.from({ length: 8 }, (_, i) => i).find(
                slot => !usedSlots.includes(slot)
            );

            if (nextSlot === undefined) {
                console.error("No available effect slots");
                return;
            }

            await api.effects.addEffect({
                track_id: trackId,
                effect_name: effectName,
                slot_index: nextSlot,
            });

            // Reload effect chain
            await loadEffectChain();
            onEffectAdded?.();
        } catch (error) {
            console.error("Failed to add effect:", error);
        }
    };

    const handleParameterChange = async (
        effectId: string,
        parameterName: string,
        value: number
    ) => {
        try {
            await api.effects.updateEffect(effectId, { parameters: { [parameterName]: value } });
            // Update local state optimistically
            if (effectChain) {
                setEffectChain({
                    ...effectChain,
                    effects: effectChain.effects.map(e =>
                        e.id === effectId
                            ? { ...e, parameters: { ...e.parameters, [parameterName]: value } }
                            : e
                    ),
                });
            }
            onEffectUpdated?.();
        } catch (error) {
            console.error("Failed to update effect parameter:", error);
        }
    };

    const handleToggleBypass = async (effectId: string, bypassed: boolean) => {
        try {
            await api.effects.updateEffect(effectId, { bypassed });
            // Update local state optimistically
            if (effectChain) {
                setEffectChain({
                    ...effectChain,
                    effects: effectChain.effects.map(e =>
                        e.id === effectId ? { ...e, is_bypassed: bypassed } : e
                    ),
                });
            }
            onEffectUpdated?.();
        } catch (error) {
            console.error("Failed to toggle effect bypass:", error);
        }
    };

    const handleDelete = async (effectId: string) => {
        try {
            await api.effects.deleteEffect(effectId);
            await loadEffectChain();
            onEffectRemoved?.();
        } catch (error) {
            console.error("Failed to delete effect:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="text-xs text-muted-foreground px-2 py-1">
                Loading effects...
            </div>
        );
    }

    const effects = effectChain?.effects || [];
    const canAddMore = effects.length < (effectChain?.max_slots || 8);

    return (
        <div className="flex flex-col gap-1.5">
            {/* Effect Slots */}
            {effects.length > 0 && (
                <div className="flex flex-col gap-1">
                    {effects
                        .sort((a, b) => a.slot_index - b.slot_index)
                        .map((effect) => {
                            const effectDef = effectDefinitions.find(
                                (def) => def.name === effect.effect_name
                            );
                            return (
                                <EffectSlot
                                    key={effect.id}
                                    effect={effect}
                                    effectDefinition={effectDef}
                                    onParameterChange={handleParameterChange}
                                    onToggleBypass={handleToggleBypass}
                                    onDelete={handleDelete}
                                />
                            );
                        })}
                </div>
            )}

            {/* Add Effect Button */}
            {canAddMore && (
                <EffectSelector
                    trackId={trackId}
                    onEffectAdded={handleEffectAdded}
                />
            )}

            {/* Empty State */}
            {effects.length === 0 && (
                <div className="text-xs text-muted-foreground px-2 py-1 text-center">
                    No effects. Click "Add FX" to add one.
                </div>
            )}
        </div>
    );
}

