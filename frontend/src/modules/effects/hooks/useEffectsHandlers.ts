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
import { effectsService } from "@/services/effects";
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
        async (trackId: string, effectName: string, slotIndex: number) => {
            try {
                await effectsService.addEffect(trackId, {
                    effect_name: effectName,
                    slot_index: slotIndex,
                });
                toast.success(`Added ${effectName} to slot ${slotIndex + 1}`);
                onEffectChainChanged?.(trackId);
            } catch (error) {
                console.error("Failed to add effect:", error);
                toast.error("Failed to add effect");
            }
        },
        [onEffectChainChanged]
    );

    const handleDeleteEffect = useCallback(
        async (effectId: string, trackId: string) => {
            try {
                await effectsService.deleteEffect(effectId);
                toast.success("Effect removed");
                onEffectChainChanged?.(trackId);
            } catch (error) {
                console.error("Failed to delete effect:", error);
                toast.error("Failed to delete effect");
            }
        },
        [onEffectChainChanged]
    );

    const handleReorderEffect = useCallback(
        async (effectId: string, newSlotIndex: number, trackId: string) => {
            try {
                await effectsService.reorderEffect(effectId, newSlotIndex);
                toast.success(`Moved to slot ${newSlotIndex + 1}`);
                onEffectChainChanged?.(trackId);
            } catch (error) {
                console.error("Failed to reorder effect:", error);
                toast.error("Failed to reorder effect");
            }
        },
        [onEffectChainChanged]
    );

    // ========================================================================
    // PARAMETER HANDLERS
    // ========================================================================

    const handleUpdateParameter = useCallback(
        async (effectId: string, paramName: string, value: number) => {
            try {
                await effectsService.updateParameter(effectId, {
                    parameter_name: paramName,
                    value,
                });
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

    const handleToggleBypass = useCallback(
        async (effectId: string, trackId: string) => {
            try {
                await effectsService.toggleBypass(effectId);
                onEffectChainChanged?.(trackId);
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
        handleReorderEffect,
        handleUpdateParameter,
        handleToggleBypass,
    };
}

