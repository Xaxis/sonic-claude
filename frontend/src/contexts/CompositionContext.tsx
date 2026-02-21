/**
 * CompositionContext - Composition coordinator and loader (REFACTORED)
 * 
 * NEW RESPONSIBILITIES:
 * - Load complete composition state from backend
 * - Coordinate state distribution across all domain contexts
 * - Handle composition switching
 * - Manage autosave and manual save
 * - Track composition list
 * 
 * ARCHITECTURE:
 * - composition_id = sequence_id (they're the same thing)
 * - One composition = one sequence + complete state (mixer + effects + samples + chat)
 * - When activeCompositionId changes, load complete state and distribute to contexts
 * - Backend gathers state from all services on save
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { statePersistence } from "@/services/state-persistence";
import { useSequencer } from "./SequencerContext";
import { useMixer } from "./MixerContext";
import { useEffects } from "./EffectsContext";
import { useSamples } from "./SamplesContext";
// import { useAI } from "./AIContext"; // TODO: Move to global

// ============================================================================
// TYPES
// ============================================================================

interface CompositionMetadata {
    id: string;
    name: string;
    created_at: string;
    updated_at?: string;
}

interface CompositionState {
    // Active composition
    activeCompositionId: string | null;
    compositions: CompositionMetadata[];
    
    // Save state
    hasUnsavedChanges: boolean;
    lastSaveTime: number | null;
    isSaving: boolean;
    isLoading: boolean;
    lastError: string | null;
}

interface CompositionContextValue extends CompositionState {
    // Composition management
    loadComposition: (compositionId: string) => Promise<void>;
    createComposition: (name: string, tempo?: number) => Promise<void>;
    deleteComposition: (compositionId: string) => Promise<void>;
    refreshCompositionList: () => Promise<void>;
    
    // Save operations
    saveComposition: () => Promise<void>;
    markChanged: () => void;
    
    // Autosave control
    isAutosaveEnabled: boolean;
    setIsAutosaveEnabled: (enabled: boolean) => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const CompositionContext = createContext<CompositionContextValue | undefined>(undefined);

export function useComposition() {
    const context = useContext(CompositionContext);
    if (!context) {
        throw new Error("useComposition must be used within CompositionProvider");
    }
    return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface CompositionProviderProps {
    children: ReactNode;
    autosaveIntervalSeconds?: number;
}

export function CompositionProvider({
    children,
    autosaveIntervalSeconds = 60, // Default: 1 minute
}: CompositionProviderProps) {
    const [state, setState] = useState<CompositionState>(() => {
        // Load active composition ID from localStorage on mount
        const savedCompositionId = statePersistence.getActiveCompositionId();
        return {
            activeCompositionId: savedCompositionId,
            compositions: [],
            hasUnsavedChanges: false,
            lastSaveTime: null,
            isSaving: false,
            isLoading: false,
            lastError: null,
        };
    });

    const [isAutosaveEnabled, setIsAutosaveEnabled] = useState(true);
    const autosaveIntervalRef = useRef<number | undefined>(undefined);

    // Get domain contexts
    const sequencer = useSequencer();
    const mixer = useMixer();
    const effects = useEffects();
    const samples = useSamples();
    // const ai = useAI(); // TODO

    // ========================================================================
    // COMPOSITION LOADING
    // ========================================================================

    const loadComposition = useCallback(async (compositionId: string) => {
        setState(prev => ({ ...prev, isLoading: true, lastError: null }));
        
        try {
            // Load complete composition snapshot from backend
            const snapshot: any = await api.compositions.getById(compositionId);

            // Distribute state to domain contexts
            // 1. Sequencer: Load sequence + tracks + clips + UI state
            await sequencer.loadSequence(snapshot.sequence);

            // 2. Mixer: Load mixer state + UI state
            await mixer.loadMixerState(snapshot.mixer_state);

            // 3. Effects: Load effect chains
            await effects.loadEffectChains(snapshot.track_effects);

            // 4. Samples: Load sample assignments
            await samples.loadSampleAssignments(snapshot.sample_assignments);

            // 5. AI: Load chat history
            // await ai.loadChatHistory(snapshot.chat_history); // TODO

            // Update active composition
            setState(prev => ({
                ...prev,
                activeCompositionId: compositionId,
                isLoading: false,
                hasUnsavedChanges: false,
                lastSaveTime: Date.now(),
            }));

            // Store in localStorage
            localStorage.setItem("sonic-claude-active-composition", compositionId);

            toast.success(`Loaded composition: ${snapshot.name}`);
        } catch (error) {
            console.error("Failed to load composition:", error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                lastError: error instanceof Error ? error.message : "Unknown error",
            }));
            toast.error("Failed to load composition");
        }
    }, [sequencer, mixer, effects, samples]);

    const refreshCompositionList = useCallback(async () => {
        try {
            const response = await api.compositions.list();
            setState(prev => ({ ...prev, compositions: response.compositions }));
        } catch (error) {
            console.error("Failed to refresh composition list:", error);
        }
    }, []);

    const createComposition = useCallback(async (name: string, tempo: number = 120) => {
        try {
            // Create new sequence via API (returns the sequence with ID)
            const sequence = await api.sequencer.createSequence({
                name,
                tempo,
                time_signature_num: 4,
                time_signature_den: 4,
            });

            const newCompositionId = sequence.id;

            // Update sequencer context with the new sequence
            await sequencer.loadSequence(sequence);

            // Save initial composition state
            await api.compositions.save({
                sequence_id: newCompositionId,
                name,
                metadata: { source: "manual_create" },
            });

            // Refresh composition list
            await refreshCompositionList();

            setState(prev => ({
                ...prev,
                activeCompositionId: newCompositionId,
                hasUnsavedChanges: false,
                lastSaveTime: Date.now(),
            }));

            toast.success(`Created composition: ${name}`);
        } catch (error) {
            console.error("Failed to create composition:", error);
            toast.error("Failed to create composition");
            throw error; // Re-throw so the modal can handle it
        }
    }, [sequencer, refreshCompositionList]);

    const deleteComposition = useCallback(async (compositionId: string) => {
        try {
            // Delete sequence (which deletes the composition)
            await sequencer.deleteSequence(compositionId);

            // Refresh composition list
            await refreshCompositionList();

            // If we deleted the active composition, clear it
            if (state.activeCompositionId === compositionId) {
                setState(prev => ({ ...prev, activeCompositionId: null }));
                statePersistence.setActiveCompositionId(null);
            }

            toast.success("Composition deleted");
        } catch (error) {
            console.error("Failed to delete composition:", error);
            toast.error("Failed to delete composition");
        }
    }, [sequencer, state.activeCompositionId, refreshCompositionList]);

    // ========================================================================
    // SAVE OPERATIONS
    // ========================================================================

    const saveComposition = useCallback(async () => {
        if (!state.activeCompositionId) {
            toast.error("No active composition to save");
            return;
        }

        setState(prev => ({ ...prev, isSaving: true, lastError: null }));

        try {
            // Backend gathers state from all services
            await api.compositions.save({
                sequence_id: state.activeCompositionId,
                name: sequencer.sequences.find(s => s.id === state.activeCompositionId)?.name || "Untitled",
                metadata: { source: "manual_save" },
            });

            setState(prev => ({
                ...prev,
                isSaving: false,
                hasUnsavedChanges: false,
                lastSaveTime: Date.now(),
            }));

            toast.success("Composition saved");
        } catch (error) {
            console.error("Failed to save composition:", error);
            setState(prev => ({
                ...prev,
                isSaving: false,
                lastError: error instanceof Error ? error.message : "Unknown error",
            }));
            toast.error("Failed to save composition");
        }
    }, [state.activeCompositionId, sequencer.sequences]);

    const markChanged = useCallback(() => {
        setState(prev => ({ ...prev, hasUnsavedChanges: true }));
    }, []);

    // ========================================================================
    // AUTOSAVE
    // ========================================================================

    useEffect(() => {
        if (!isAutosaveEnabled || !state.activeCompositionId) {
            return;
        }

        autosaveIntervalRef.current = window.setInterval(() => {
            if (state.hasUnsavedChanges && !state.isSaving) {
                saveComposition();
            }
        }, autosaveIntervalSeconds * 1000);

        return () => {
            if (autosaveIntervalRef.current) {
                clearInterval(autosaveIntervalRef.current);
            }
        };
    }, [isAutosaveEnabled, state.activeCompositionId, state.hasUnsavedChanges, state.isSaving, autosaveIntervalSeconds, saveComposition]);

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    useEffect(() => {
        // Load composition list on mount
        // NOTE: loadAll() is called by SequencerContext to ensure proper initialization order
        refreshCompositionList();
    }, [refreshCompositionList]);

    // Persist activeCompositionId to localStorage
    useEffect(() => {
        statePersistence.setActiveCompositionId(state.activeCompositionId);
    }, [state.activeCompositionId]);

    // Auto-load last active composition on mount
    useEffect(() => {
        const savedCompositionId = statePersistence.getActiveCompositionId();
        if (savedCompositionId && !state.isLoading) {
            loadComposition(savedCompositionId).catch((error) => {
                console.error("Failed to auto-load composition:", error);
                // Clear invalid composition ID
                statePersistence.setActiveCompositionId(null);
                setState(prev => ({ ...prev, activeCompositionId: null }));
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    // ========================================================================
    // CONTEXT VALUE
    // ========================================================================

    const value: CompositionContextValue = {
        ...state,
        loadComposition,
        createComposition,
        deleteComposition,
        refreshCompositionList,
        saveComposition,
        markChanged,
        isAutosaveEnabled,
        setIsAutosaveEnabled,
    };

    return (
        <CompositionContext.Provider value={value}>
            {children}
        </CompositionContext.Provider>
    );
}

