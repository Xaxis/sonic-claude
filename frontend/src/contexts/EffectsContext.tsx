/**
 * EffectsContext - Global context for effects state (SOURCE OF TRUTH)
 *
 * This is the GLOBAL effects context that manages:
 * - Effect definitions (available effects)
 * - Effect chains per track
 * - Effect parameters
 * - Cross-window synchronization via BroadcastChannel
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import { windowManager } from "@/services/window-manager";
import { api } from "@/services/api";
import { toast } from "sonner";

// ============================================================================
// TYPES (from effects provider)
// ============================================================================

export interface EffectParameter {
    name: string;
    value: number;
    min: number;
    max: number;
    default: number;
    unit?: string;
}

export interface EffectDefinition {
    name: string;
    display_name: string;
    category: string;
    description: string;
    parameters: EffectParameter[];
}

export interface TrackEffect {
    id: string;
    track_id: string;
    effect_name: string;
    slot_index: number;
    bypassed: boolean;
    parameters: Record<string, number>;
}

export interface TrackEffectChain {
    track_id: string;
    effects: TrackEffect[];
}

// ============================================================================
// STATE TYPES
// ============================================================================

interface EffectsState {
    // Effect Definitions (available effects)
    effectDefinitions: EffectDefinition[];

    // Effect Chains (per track)
    effectChains: Record<string, TrackEffectChain>; // trackId -> chain

    // UI State
    selectedEffectId: string | null;
    showEffectBrowser: boolean;
}

// ============================================================================
// CONTEXT VALUE TYPE
// ============================================================================

interface EffectsContextValue extends EffectsState {
    // Effect Definitions
    loadEffectDefinitions: () => Promise<void>;

    // Effect Chain Management
    loadEffectChain: (trackId: string) => Promise<void>;
    addEffect: (trackId: string, effectName: string, slotIndex: number) => Promise<void>;
    deleteEffect: (effectId: string) => Promise<void>;
    moveEffect: (effectId: string, newSlotIndex: number) => Promise<void>;
    toggleEffectBypass: (effectId: string) => Promise<void>;
    updateEffectParameter: (effectId: string, paramName: string, value: number) => Promise<void>;

    // UI Actions
    setSelectedEffectId: (id: string | null) => void;
    setShowEffectBrowser: (show: boolean) => void;
}

const EffectsContext = createContext<EffectsContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function EffectsProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<EffectsState>({
        effectDefinitions: [],
        effectChains: {},
        selectedEffectId: null,
        showEffectBrowser: false,
    });

    // Broadcast state changes to other windows
    const broadcastUpdate = useCallback((key: string, value: any) => {
        windowManager.broadcastState(`effects.${key}`, value);
    }, []);

    // Listen for state updates from other windows
    useEffect(() => {
        const unsubscribers: (() => void)[] = [];

        const keys = ['effectDefinitions', 'effectChains'];
        keys.forEach(key => {
            const unsub = windowManager.subscribeToState(`effects.${key}`, (value: any) => {
                setState(prev => ({ ...prev, [key]: value }));
            });
            unsubscribers.push(unsub);
        });

        return () => unsubscribers.forEach(unsub => unsub());
    }, []);

    // ========================================================================
    // EFFECT DEFINITIONS
    // ========================================================================

    const loadEffectDefinitions = useCallback(async () => {
        try {
            const definitions = await api.effects.getDefinitions();
            setState(prev => ({ ...prev, effectDefinitions: definitions as any[] }));
            broadcastUpdate('effectDefinitions', definitions);
        } catch (error) {
            console.error("Failed to load effect definitions:", error);
            toast.error("Failed to load effect definitions");
        }
    }, [broadcastUpdate]);

    // ========================================================================
    // EFFECT CHAIN MANAGEMENT
    // ========================================================================

    const loadEffectChain = useCallback(async (trackId: string) => {
        try {
            const effects = await api.effects.getTrackEffects(trackId);
            const chain: TrackEffectChain = { track_id: trackId, effects: effects as any[] };
            setState(prev => {
                const newChains = { ...prev.effectChains, [trackId]: chain };
                broadcastUpdate('effectChains', newChains);
                return { ...prev, effectChains: newChains };
            });
        } catch (error) {
            console.error("Failed to load effect chain:", error);
            toast.error("Failed to load effect chain");
        }
    }, [broadcastUpdate]);

    const addEffect = useCallback(async (trackId: string, effectName: string, slotIndex: number) => {
        try {
            const effect = await api.effects.addEffect({ track_id: trackId, effect_name: effectName, slot_index: slotIndex });
            setState(prev => {
                const chain = prev.effectChains[trackId] || { track_id: trackId, effects: [] };
                const newEffects = [...chain.effects, effect as any];
                const newChain = { ...chain, effects: newEffects };
                const newChains = { ...prev.effectChains, [trackId]: newChain };
                broadcastUpdate('effectChains', newChains);
                return { ...prev, effectChains: newChains };
            });
            toast.success(`Added effect: ${effectName}`);
        } catch (error) {
            console.error("Failed to add effect:", error);
            toast.error("Failed to add effect");
        }
    }, [broadcastUpdate]);

    const deleteEffect = useCallback(async (effectId: string) => {
        try {
            await api.effects.deleteEffect(effectId);
            setState(prev => {
                const newChains = { ...prev.effectChains };
                Object.keys(newChains).forEach(trackId => {
                    newChains[trackId] = {
                        ...newChains[trackId],
                        effects: newChains[trackId].effects.filter(e => e.id !== effectId),
                    };
                });
                broadcastUpdate('effectChains', newChains);
                return { ...prev, effectChains: newChains };
            });
            toast.success("Effect deleted");
        } catch (error) {
            console.error("Failed to delete effect:", error);
            toast.error("Failed to delete effect");
        }
    }, [broadcastUpdate]);

    const moveEffect = useCallback(async (effectId: string, newSlotIndex: number) => {
        try {
            await api.effects.updateEffect(effectId, { slot_index: newSlotIndex });
            setState(prev => {
                const newChains = { ...prev.effectChains };
                Object.keys(newChains).forEach(trackId => {
                    newChains[trackId] = {
                        ...newChains[trackId],
                        effects: newChains[trackId].effects.map(e =>
                            e.id === effectId ? { ...e, slot_index: newSlotIndex } : e
                        ),
                    };
                });
                return { ...prev, effectChains: newChains };
            });
        } catch (error) {
            console.error("Failed to move effect:", error);
            toast.error("Failed to move effect");
        }
    }, []);

    const toggleEffectBypass = useCallback(async (effectId: string) => {
        try {
            // Find the effect to get current bypass state
            let currentBypass = false;
            Object.values(state.effectChains).forEach(chain => {
                const effect = chain.effects.find(e => e.id === effectId);
                if (effect) currentBypass = effect.bypassed;
            });

            await api.effects.updateEffect(effectId, { bypassed: !currentBypass });
            setState(prev => {
                const newChains = { ...prev.effectChains };
                Object.keys(newChains).forEach(trackId => {
                    newChains[trackId] = {
                        ...newChains[trackId],
                        effects: newChains[trackId].effects.map(e =>
                            e.id === effectId ? { ...e, bypassed: !currentBypass } : e
                        ),
                    };
                });
                return { ...prev, effectChains: newChains };
            });
        } catch (error) {
            console.error("Failed to toggle effect bypass:", error);
            toast.error("Failed to toggle effect bypass");
        }
    }, [state.effectChains]);

    const updateEffectParameter = useCallback(async (effectId: string, paramName: string, value: number) => {
        try {
            await api.effects.updateEffect(effectId, { parameters: { [paramName]: value } });
            setState(prev => {
                const newChains = { ...prev.effectChains };
                Object.keys(newChains).forEach(trackId => {
                    newChains[trackId] = {
                        ...newChains[trackId],
                        effects: newChains[trackId].effects.map(e =>
                            e.id === effectId ? { ...e, parameters: { ...e.parameters, [paramName]: value } } : e
                        ),
                    };
                });
                return { ...prev, effectChains: newChains };
            });
        } catch (error) {
            console.error("Failed to update effect parameter:", error);
            toast.error("Failed to update effect parameter");
        }
    }, []);

    // ========================================================================
    // UI ACTIONS
    // ========================================================================

    const setSelectedEffectId = useCallback((id: string | null) => {
        setState(prev => ({ ...prev, selectedEffectId: id }));
    }, []);

    const setShowEffectBrowser = useCallback((show: boolean) => {
        setState(prev => ({ ...prev, showEffectBrowser: show }));
    }, []);

    // ========================================================================
    // CONTEXT VALUE
    // ========================================================================

    const value: EffectsContextValue = {
        ...state,
        loadEffectDefinitions,
        loadEffectChain,
        addEffect,
        deleteEffect,
        moveEffect,
        toggleEffectBypass,
        updateEffectParameter,
        setSelectedEffectId,
        setShowEffectBrowser,
    };

    return (
        <EffectsContext.Provider value={value}>
            {children}
        </EffectsContext.Provider>
    );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useEffects() {
    const context = useContext(EffectsContext);
    if (context === undefined) {
        throw new Error("useEffects must be used within an EffectsProvider");
    }
    return context;
}

// Convenience hooks
export function useEffectDefinitions() {
    const { effectDefinitions, loadEffectDefinitions } = useEffects();
    return { effectDefinitions, loadEffectDefinitions };
}

export function useEffectChains() {
    const { effectChains, loadEffectChain, addEffect, deleteEffect, moveEffect, toggleEffectBypass, updateEffectParameter } = useEffects();
    return { effectChains, loadEffectChain, addEffect, deleteEffect, moveEffect, toggleEffectBypass, updateEffectParameter };
}

