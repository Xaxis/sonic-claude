/**
 * useEffectsState - Custom hook for effects-specific UI state management
 *
 * Encapsulates all effects UI state (view settings, selection, etc.)
 * Follows the same pattern as useMixerState
 *
 * This hook manages:
 * - View settings (show effects, expanded effects)
 * - Selection state (selected effect)
 * - Effect chain visibility
 */

import { useState, useCallback } from "react";

export interface EffectsState {
    // View settings
    showEffects: boolean;
    expandedEffects: Set<string>; // Effect IDs that are expanded to show parameters

    // Selection
    selectedEffectId: string | null;
    selectedTrackId: string | null;

    // Effect chain sections visibility (for future expansion)
    showParameterSection: boolean;
    showPresetSection: boolean;
}

export interface EffectsActions {
    // View settings
    setShowEffects: (show: boolean) => void;
    setExpandedEffects: (effects: Set<string>) => void;

    // Selection
    setSelectedEffectId: (effectId: string | null) => void;
    setSelectedTrackId: (trackId: string | null) => void;

    // Sections
    setShowParameterSection: (show: boolean) => void;
    setShowPresetSection: (show: boolean) => void;

    // Convenience methods
    toggleEffects: () => void;
    toggleEffectExpanded: (effectId: string) => void;
    selectEffect: (effectId: string) => void;
    deselectEffect: () => void;
}

export function useEffectsState() {
    // View settings
    const [showEffects, setShowEffects] = useState(true);
    const [expandedEffects, setExpandedEffects] = useState<Set<string>>(new Set());

    // Selection
    const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
    const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

    // Sections (for future expansion)
    const [showParameterSection, setShowParameterSection] = useState(true);
    const [showPresetSection, setShowPresetSection] = useState(false);

    // Convenience methods
    const toggleEffects = useCallback(() => {
        setShowEffects((prev) => !prev);
    }, []);

    const toggleEffectExpanded = useCallback((effectId: string) => {
        setExpandedEffects((prev) => {
            const next = new Set(prev);
            if (next.has(effectId)) {
                next.delete(effectId);
            } else {
                next.add(effectId);
            }
            return next;
        });
    }, []);

    const selectEffect = useCallback((effectId: string) => {
        setSelectedEffectId(effectId);
    }, []);

    const deselectEffect = useCallback(() => {
        setSelectedEffectId(null);
    }, []);

    const state: EffectsState = {
        showEffects,
        expandedEffects,
        selectedEffectId,
        selectedTrackId,
        showParameterSection,
        showPresetSection,
    };

    const actions: EffectsActions = {
        setShowEffects,
        setExpandedEffects,
        setSelectedEffectId,
        setSelectedTrackId,
        setShowParameterSection,
        setShowPresetSection,
        toggleEffects,
        toggleEffectExpanded,
        selectEffect,
        deselectEffect,
    };

    return { state, actions };
}

