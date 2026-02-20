/**
 * useEffectsHandlers Hook
 *
 * Centralizes all event handler logic for the effects panel.
 * Separates business logic from UI rendering.
 *
 * Handler Categories:
 * - Effect CRUD: add, delete, reorder effects
 * - Parameters: update effect parameters
 * - Bypass: toggle effect bypass
 */

import { useCallback } from "react";
import { api } from "@/services/api";
import type { SequencerTrack } from "@/modules/sequencer/types";
import { toast } from "sonner";

interface UseEffectsHandlersProps {
    // Data
    tracks: SequencerTrack[];

    // Callbacks for refreshing data
    onEffectChainChanged?: (trackId: string) => void;
}

export function useEffectsHandlers(props: UseEffectsHandlersProps) {
    const { tracks, onEffectChainChanged } = props;

    // ========================================================================
    // EFFECT CRUD HANDLERS
    // ========================================================================

    const handleAddEffect = useCallback(
        async (trackId: string, effectName: string) => {
            try {
                // Find next available slot
                const chain = await api.effects.getTrackEffectChain(trackId);
                const usedSlots = chain.effects.map(e => e.slot_index);
                const nextSlot = Array.from({ length: 8 }, (_, i) => i).find(
                    slot => !usedSlots.includes(slot)
                );

                if (nextSlot === undefined) {
                    toast.error("No available effect slots");
                    return;
                }

                await api.effects.addEffect({
                    track_id: trackId,
                    effect_name: effectName,
                    slot_index: nextSlot,
                });
                toast.success(`Added ${effectName}`);
                onEffectChainChanged?.(trackId);
            } catch (error) {
                console.error("Failed to add effect:", error);
                toast.error("Failed to add effect");
            }
        },
        [onEffectChainChanged]
    );

    const handleDeleteEffect = useCallback(
        async (effectId: string) => {
            try {
                await api.effects.deleteEffect(effectId);
                toast.success("Effect removed");
                // Trigger refresh - we don't have trackId here, so refresh all
                onEffectChainChanged?.("");
            } catch (error) {
                console.error("Failed to delete effect:", error);
                toast.error("Failed to delete effect");
            }
        },
        [onEffectChainChanged]
    );

    const handleMoveEffect = useCallback(
        async (effectId: string, newSlotIndex: number) => {
            try {
                await api.effects.moveEffect(effectId, { new_slot_index: newSlotIndex });
                toast.success(`Moved to slot ${newSlotIndex + 1}`);
                onEffectChainChanged?.("");
            } catch (error) {
                console.error("Failed to move effect:", error);
                toast.error("Failed to move effect");
            }
        },
        [onEffectChainChanged]
    );

    // ========================================================================
    // PARAMETER HANDLERS
    // ========================================================================

    const handleUpdateEffectParameter = useCallback(
        async (effectId: string, paramName: string, value: number) => {
            try {
                await api.effects.updateEffect(effectId, { parameters: { [paramName]: value } });
                // No toast for parameter changes (too noisy)
            } catch (error) {
                console.error("Failed to update parameter:", error);
                toast.error("Failed to update parameter");
            }
        },
        []
    );

    // ========================================================================
    // BYPASS HANDLERS
    // ========================================================================

    const handleToggleEffectBypass = useCallback(
        async (effectId: string) => {
            try {
                // Get current effect to toggle bypass state
                const effect = await api.effects.getEffect(effectId);
                await api.effects.updateEffect(effectId, { bypassed: !effect.is_bypassed });
                onEffectChainChanged?.("");
            } catch (error) {
                console.error("Failed to toggle bypass:", error);
                toast.error("Failed to toggle bypass");
            }
        },
        [onEffectChainChanged]
    );

    return {
        handleAddEffect,
        handleDeleteEffect,
        handleMoveEffect,
        handleUpdateEffectParameter,
        handleToggleEffectBypass,
    };
}

