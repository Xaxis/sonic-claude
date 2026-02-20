/**
 * SynthesisContext - Global context for synthesis state (SOURCE OF TRUTH)
 *
 * This is the GLOBAL synthesis context that manages:
 * - Active synths (runtime state, not persisted)
 * - Synth definitions (available instruments)
 * - Synth parameters
 * - Note preview
 * - Cross-window synchronization via BroadcastChannel
 *
 * NOTE: Active synths are runtime state only. SynthDefs are loaded from backend.
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
import type { SynthDefInfo } from "@/modules/sequencer/types";

// ============================================================================
// TYPES
// ============================================================================

export interface ActiveSynth {
    id: number;
    synthdef: string;
    parameters: Record<string, number>;
    group: number;
    bus: number | null;
}

// ============================================================================
// STATE TYPES
// ============================================================================

interface SynthesisState {
    // Synth Definitions (available instruments)
    synthDefs: SynthDefInfo[];

    // Active Synths (runtime state)
    activeSynths: Record<number, ActiveSynth>; // synthId -> synth

    // UI State
    selectedSynthId: number | null;
}

// ============================================================================
// CONTEXT VALUE TYPE
// ============================================================================

interface SynthesisContextValue extends SynthesisState {
    // Synth Definitions
    loadSynthDefs: () => Promise<void>;

    // Synth Management
    createSynth: (synthdef: string, params?: Record<string, number>, group?: number, bus?: number | null) => Promise<ActiveSynth>;
    setSynthParam: (synthId: number, param: string, value: number) => Promise<void>;
    releaseSynth: (synthId: number) => Promise<void>;
    freeSynth: (synthId: number, immediate?: boolean) => Promise<void>;
    freeAllSynths: () => Promise<void>;

    // Note Preview
    previewNote: (note: number, velocity?: number, duration?: number, instrument?: string) => Promise<void>;

    // UI Actions
    setSelectedSynthId: (id: number | null) => void;
}

const SynthesisContext = createContext<SynthesisContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function SynthesisProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<SynthesisState>({
        synthDefs: [],
        activeSynths: {},
        selectedSynthId: null,
    });

    // Broadcast state changes to other windows
    const broadcastUpdate = useCallback((key: string, value: any) => {
        windowManager.broadcastState(`synthesis.${key}`, value);
    }, []);

    // Listen for state updates from other windows
    useEffect(() => {
        const unsubscribers: (() => void)[] = [];

        const keys = ['synthDefs', 'activeSynths'];
        keys.forEach(key => {
            const unsub = windowManager.subscribeToState(`synthesis.${key}`, (value: any) => {
                setState(prev => ({ ...prev, [key]: value }));
            });
            unsubscribers.push(unsub);
        });

        return () => unsubscribers.forEach(unsub => unsub());
    }, []);

    // ========================================================================
    // SYNTH DEFINITIONS
    // ========================================================================

    const loadSynthDefs = useCallback(async () => {
        try {
            const defs = await api.sequencer.getSynthDefs();
            setState(prev => ({ ...prev, synthDefs: defs as any[] }));
            broadcastUpdate('synthDefs', defs);
        } catch (error) {
            console.error("Failed to load synth definitions:", error);
            toast.error("Failed to load synth definitions");
        }
    }, [broadcastUpdate]);

    // ========================================================================
    // SYNTH MANAGEMENT
    // ========================================================================

    const createSynth = useCallback(async (
        synthdef: string,
        params: Record<string, number> = {},
        group: number = 1,
        bus: number | null = null
    ): Promise<ActiveSynth> => {
        try {
            const synth = await api.audio.createSynth({ synthdef, params, group, bus });
            const activeSynth: ActiveSynth = {
                id: synth.id,
                synthdef: synth.synthdef,
                parameters: synth.parameters,
                group: synth.group,
                bus: synth.bus,
            };
            setState(prev => {
                const newActiveSynths = { ...prev.activeSynths, [synth.id]: activeSynth };
                broadcastUpdate('activeSynths', newActiveSynths);
                return { ...prev, activeSynths: newActiveSynths };
            });
            return activeSynth;
        } catch (error) {
            console.error("Failed to create synth:", error);
            toast.error("Failed to create synth");
            throw error;
        }
    }, [broadcastUpdate]);

    const setSynthParam = useCallback(async (synthId: number, param: string, value: number) => {
        try {
            await api.audio.setSynthParam(synthId, { param, value });
            setState(prev => {
                const synth = prev.activeSynths[synthId];
                if (!synth) return prev;
                const updatedSynth = {
                    ...synth,
                    parameters: { ...synth.parameters, [param]: value },
                };
                const newActiveSynths = { ...prev.activeSynths, [synthId]: updatedSynth };
                broadcastUpdate('activeSynths', newActiveSynths);
                return { ...prev, activeSynths: newActiveSynths };
            });
        } catch (error) {
            console.error("Failed to set synth parameter:", error);
            toast.error("Failed to set synth parameter");
        }
    }, [broadcastUpdate]);

    const releaseSynth = useCallback(async (synthId: number) => {
        try {
            await api.audio.releaseSynth(synthId);
            // Note: Don't remove from activeSynths immediately - synth will release over time
            // Backend will handle cleanup
        } catch (error) {
            console.error("Failed to release synth:", error);
            toast.error("Failed to release synth");
        }
    }, []);

    const freeSynth = useCallback(async (synthId: number, immediate: boolean = false) => {
        try {
            await api.audio.deleteSynth(synthId, immediate);
            setState(prev => {
                const newActiveSynths = { ...prev.activeSynths };
                delete newActiveSynths[synthId];
                broadcastUpdate('activeSynths', newActiveSynths);
                return { ...prev, activeSynths: newActiveSynths };
            });
        } catch (error) {
            console.error("Failed to free synth:", error);
            toast.error("Failed to free synth");
        }
    }, [broadcastUpdate]);

    const freeAllSynths = useCallback(async () => {
        try {
            const synthIds = Object.keys(state.activeSynths).map(Number);
            await Promise.all(synthIds.map(id => api.audio.deleteSynth(id, true)));
            setState(prev => {
                broadcastUpdate('activeSynths', {});
                return { ...prev, activeSynths: {} };
            });
            toast.success("All synths freed");
        } catch (error) {
            console.error("Failed to free all synths:", error);
            toast.error("Failed to free all synths");
        }
    }, [state.activeSynths, broadcastUpdate]);

    // ========================================================================
    // NOTE PREVIEW
    // ========================================================================

    const previewNote = useCallback(async (
        note: number,
        velocity: number = 100,
        duration: number = 0.5,
        instrument: string = "sine"
    ) => {
        try {
            await api.sequencer.previewNote({ note, velocity, duration, synthdef: instrument });
        } catch (error) {
            console.error("Failed to preview note:", error);
            // Don't show toast for preview failures (too spammy)
        }
    }, []);

    // ========================================================================
    // UI ACTIONS
    // ========================================================================

    const setSelectedSynthId = useCallback((id: number | null) => {
        setState(prev => ({ ...prev, selectedSynthId: id }));
    }, []);

    // ========================================================================
    // CONTEXT VALUE
    // ========================================================================

    const value: SynthesisContextValue = {
        ...state,
        loadSynthDefs,
        createSynth,
        setSynthParam,
        releaseSynth,
        freeSynth,
        freeAllSynths,
        previewNote,
        setSelectedSynthId,
    };

    return (
        <SynthesisContext.Provider value={value}>
            {children}
        </SynthesisContext.Provider>
    );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useSynthesis() {
    const context = useContext(SynthesisContext);
    if (context === undefined) {
        throw new Error("useSynthesis must be used within a SynthesisProvider");
    }
    return context;
}

// Convenience hooks
export function useSynthDefs() {
    const { synthDefs, loadSynthDefs } = useSynthesis();
    return { synthDefs, loadSynthDefs };
}

export function useActiveSynths() {
    const { activeSynths, createSynth, setSynthParam, releaseSynth, freeSynth, freeAllSynths } = useSynthesis();
    return { activeSynths, createSynth, setSynthParam, releaseSynth, freeSynth, freeAllSynths };
}

export function useNotePreview() {
    const { previewNote } = useSynthesis();
    return { previewNote };
}

