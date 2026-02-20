/**
 * Composition Context
 * Manages composition persistence, autosave, and change tracking
 *
 * WHAT IS A COMPOSITION:
 * A composition is the COMPLETE state of the DAW for a given sequence:
 * - Sequence (tracks, clips, tempo, time signature, loop settings)
 * - Mixer state (all channels, volumes, pans, mutes, solos, master)
 * - Effects (all track effect chains with parameters)
 * - Sample assignments
 * - Chat history (AI conversations)
 *
 * Responsibilities:
 * - Track changes to composition (any action that modifies sequence/mixer/effects/chat)
 * - Autosave compositions at regular intervals
 * - Manual save with version history
 * - Persist to backend composition API
 *
 * ARCHITECTURE:
 * - The backend gathers state from all its services (sequencer, mixer, effects)
 * - Frontend just needs to call api.compositions.save() with sequence_id
 * - Backend creates CompositionSnapshot with ALL state
 * - This context only manages the save/autosave logic, not the state itself
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { setCompositionChangeCallback } from "./DAWStateContext";
import { useSequencer } from "./SequencerContext";

interface CompositionState {
    hasUnsavedChanges: boolean;
    lastSaveTime: number | null;
    isSaving: boolean;
    lastError: string | null;
}

interface CompositionContextValue extends CompositionState {
    // Mark composition as changed (call this after ANY action)
    markChanged: () => void;

    // Manual save
    saveComposition: (createVersion?: boolean) => Promise<void>;

    // Autosave control
    enableAutosave: () => void;
    disableAutosave: () => void;
    isAutosaveEnabled: boolean;
}

const CompositionContext = createContext<CompositionContextValue | undefined>(undefined);

interface CompositionProviderProps {
    children: ReactNode;
    autosaveIntervalSeconds?: number;
}

export function CompositionProvider({
    children,
    autosaveIntervalSeconds = 60, // Default: 1 minute
}: CompositionProviderProps) {
    // Get active sequence ID from SequencerContext
    const { activeSequenceId: sequenceId } = useSequencer();
    const [state, setState] = useState<CompositionState>({
        hasUnsavedChanges: false,
        lastSaveTime: null,
        isSaving: false,
        lastError: null,
    });

    const [isAutosaveEnabled, setIsAutosaveEnabled] = useState(true);
    const autosaveIntervalRef = useRef<number | undefined>(undefined);

    // @TODO - Why isnt this being called? Is it supposed to be used?
    const changeTimeoutRef = useRef<number | undefined>(undefined);

    // Mark composition as changed
    const markChanged = useCallback(() => {
        setState(prev => ({ ...prev, hasUnsavedChanges: true }));
    }, []);

    // Register this callback with AudioEngineContext
    useEffect(() => {
        setCompositionChangeCallback(markChanged);
        return () => {
            setCompositionChangeCallback(null);
        };
    }, [markChanged]);

    // Save composition to backend
    const saveComposition = useCallback(async (createVersion: boolean = false) => {
        if (!sequenceId) {
            toast.error("No sequence selected");
            return;
        }

        setState(prev => ({ ...prev, isSaving: true, lastError: null }));

        try {
            console.log("💾 Saving composition:", sequenceId, "createVersion:", createVersion);
            await api.compositions.save({
                sequence_id: sequenceId,
                create_history: createVersion,
                is_autosave: false,
                metadata: {
                    source: "manual_save",
                    timestamp: new Date().toISOString()
                }
            });

            setState(prev => ({
                ...prev,
                hasUnsavedChanges: false,
                lastSaveTime: Date.now(),
                isSaving: false,
            }));

            if (createVersion) {
                toast.success("Composition saved with new version");
            } else {
                toast.success("Composition saved");
            }

            console.log("✅ Composition saved successfully");
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("❌ Failed to save composition:", error);
            
            setState(prev => ({
                ...prev,
                isSaving: false,
                lastError: errorMessage,
            }));

            toast.error(`Failed to save: ${errorMessage}`);
        }
    }, [sequenceId]);

    // Autosave function
    const autosave = useCallback(async () => {
        if (!sequenceId || !state.hasUnsavedChanges || state.isSaving) {
            return;
        }

        console.log("💾 Autosaving composition:", sequenceId);

        try {
            await api.compositions.save({
                sequence_id: sequenceId,
                create_history: false,
                is_autosave: true,
                metadata: {
                    source: "autosave",
                    timestamp: new Date().toISOString()
                }
            });

            setState(prev => ({
                ...prev,
                hasUnsavedChanges: false,
                lastSaveTime: Date.now(),
            }));

            console.log("✅ Autosave successful");
        } catch (error) {
            console.error("❌ Autosave failed:", error);
            // Don't show toast for autosave failures to avoid spam
        }
    }, [sequenceId, state.hasUnsavedChanges, state.isSaving]);

    // Set up autosave interval
    useEffect(() => {
        if (!isAutosaveEnabled || !sequenceId) {
            if (autosaveIntervalRef.current) {
                clearInterval(autosaveIntervalRef.current);
                autosaveIntervalRef.current = undefined;
            }
            return;
        }

        // Initial autosave after 10 seconds
        const initialTimeout = setTimeout(() => {
            autosave();
        }, 10000);

        // Set up interval
        autosaveIntervalRef.current = window.setInterval(() => {
            autosave();
        }, autosaveIntervalSeconds * 1000);

        return () => {
            clearTimeout(initialTimeout);
            if (autosaveIntervalRef.current) {
                clearInterval(autosaveIntervalRef.current);
            }
        };
    }, [isAutosaveEnabled, sequenceId, autosaveIntervalSeconds, autosave]);

    const enableAutosave = useCallback(() => {
        setIsAutosaveEnabled(true);
    }, []);

    const disableAutosave = useCallback(() => {
        setIsAutosaveEnabled(false);
    }, []);

    const value: CompositionContextValue = {
        ...state,
        markChanged,
        saveComposition,
        enableAutosave,
        disableAutosave,
        isAutosaveEnabled,
    };

    return <CompositionContext.Provider value={value}>{children}</CompositionContext.Provider>;
}

export function useComposition() {
    const context = useContext(CompositionContext);
    if (!context) {
        throw new Error("useComposition must be used within CompositionProvider");
    }
    return context;
}

