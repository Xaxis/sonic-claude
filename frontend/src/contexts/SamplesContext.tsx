/**
 * SamplesContext - Global context for sample library and assignments (SOURCE OF TRUTH)
 *
 * This is the GLOBAL samples context that manages:
 * - Sample library (all available samples - GLOBAL)
 * - Sample assignments (which track uses which sample - PER-COMPOSITION)
 * - Cross-window synchronization via BroadcastChannel
 *
 * ARCHITECTURE:
 * - Sample library is global (shared across all compositions)
 * - Sample assignments are per-composition (loaded when composition changes)
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
import type { SampleMetadata } from "@/services/api/providers/samples.provider";

// ============================================================================
// STATE TYPES
// ============================================================================

interface SamplesState {
    // Sample Library (GLOBAL - all available samples)
    samples: SampleMetadata[];

    // Sample Assignments (PER-COMPOSITION - track_id -> sample_file_path)
    sampleAssignments: Record<string, string>;

    // UI State
    selectedSampleId: string | null;
    showSampleBrowser: boolean;
}

// ============================================================================
// CONTEXT VALUE TYPE
// ============================================================================

interface SamplesContextValue extends SamplesState {
    // Sample Library Management (GLOBAL)
    loadSamples: () => Promise<void>;
    uploadSample: (file: File, name: string, category?: string) => Promise<void>;
    deleteSample: (sampleId: string) => Promise<void>;
    updateSample: (sampleId: string, name?: string, category?: string) => Promise<void>;

    // Sample Assignments (PER-COMPOSITION)
    loadSampleAssignments: (assignments: Record<string, string>) => Promise<void>;
    assignSample: (trackId: string, samplePath: string) => void;
    unassignSample: (trackId: string) => void;

    // UI Actions
    setSelectedSampleId: (id: string | null) => void;
    setShowSampleBrowser: (show: boolean) => void;
}

const SamplesContext = createContext<SamplesContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function SamplesProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<SamplesState>({
        samples: [],
        sampleAssignments: {},
        selectedSampleId: null,
        showSampleBrowser: false,
    });

    // ========================================================================
    // BROADCAST CHANNEL SYNC
    // ========================================================================

    const broadcastUpdate = useCallback((key: string, value: any) => {
        windowManager.broadcastState(`samples.${key}`, value);
    }, []);

    useEffect(() => {
        const unsubscribers: (() => void)[] = [];

        // Listen for updates from other windows
        const keys: (keyof SamplesState)[] = ["samples", "sampleAssignments", "selectedSampleId", "showSampleBrowser"];
        keys.forEach(key => {
            const unsub = windowManager.subscribeToState(`samples.${key}`, (value: any) => {
                setState(prev => ({ ...prev, [key]: value }));
            });
            unsubscribers.push(unsub);
        });

        return () => unsubscribers.forEach(unsub => unsub());
    }, []);

    // ========================================================================
    // SAMPLE LIBRARY MANAGEMENT (GLOBAL)
    // ========================================================================

    const loadSamples = useCallback(async () => {
        try {
            const response = await api.samples.getAll();
            setState(prev => ({ ...prev, samples: response.samples }));
            broadcastUpdate('samples', response.samples);
        } catch (error) {
            console.error("Failed to load samples:", error);
            toast.error("Failed to load samples");
        }
    }, [broadcastUpdate]);

    const uploadSample = useCallback(async (file: File, name: string, category: string = "Uncategorized") => {
        try {
            await api.samples.upload(file, name, category);
            await loadSamples(); // Reload sample library
            toast.success(`Uploaded sample: ${name}`);
        } catch (error) {
            console.error("Failed to upload sample:", error);
            toast.error("Failed to upload sample");
        }
    }, [loadSamples]);

    const deleteSample = useCallback(async (sampleId: string) => {
        try {
            await api.samples.deleteSample(sampleId);
            await loadSamples(); // Reload sample library
            toast.success("Sample deleted");
        } catch (error) {
            console.error("Failed to delete sample:", error);
            toast.error("Failed to delete sample");
        }
    }, [loadSamples]);

    const updateSample = useCallback(async (sampleId: string, name?: string, category?: string) => {
        try {
            await api.samples.update(sampleId, { name, category });
            await loadSamples(); // Reload sample library
            toast.success("Sample updated");
        } catch (error) {
            console.error("Failed to update sample:", error);
            toast.error("Failed to update sample");
        }
    }, [loadSamples]);

    // ========================================================================
    // SAMPLE ASSIGNMENTS (PER-COMPOSITION)
    // ========================================================================

    /**
     * Load sample assignments for a composition
     * This is called by CompositionContext when loading a composition
     */
    const loadSampleAssignments = useCallback(async (assignments: Record<string, string>) => {
        try {
            setState(prev => ({ ...prev, sampleAssignments: assignments }));
            broadcastUpdate('sampleAssignments', assignments);
        } catch (error) {
            console.error("Failed to load sample assignments:", error);
            toast.error("Failed to load sample assignments");
            throw error;
        }
    }, [broadcastUpdate]);

    const assignSample = useCallback((trackId: string, samplePath: string) => {
        setState(prev => {
            const newAssignments = { ...prev.sampleAssignments, [trackId]: samplePath };
            broadcastUpdate('sampleAssignments', newAssignments);
            return { ...prev, sampleAssignments: newAssignments };
        });
    }, [broadcastUpdate]);

    const unassignSample = useCallback((trackId: string) => {
        setState(prev => {
            const newAssignments = { ...prev.sampleAssignments };
            delete newAssignments[trackId];
            broadcastUpdate('sampleAssignments', newAssignments);
            return { ...prev, sampleAssignments: newAssignments };
        });
    }, [broadcastUpdate]);

    // ========================================================================
    // UI ACTIONS
    // ========================================================================

    const setSelectedSampleId = useCallback((id: string | null) => {
        setState(prev => ({ ...prev, selectedSampleId: id }));
    }, []);

    const setShowSampleBrowser = useCallback((show: boolean) => {
        setState(prev => ({ ...prev, showSampleBrowser: show }));
    }, []);

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    useEffect(() => {
        // Load sample library on mount
        loadSamples();
    }, [loadSamples]);

    // ========================================================================
    // CONTEXT VALUE
    // ========================================================================

    const value: SamplesContextValue = {
        ...state,
        loadSamples,
        uploadSample,
        deleteSample,
        updateSample,
        loadSampleAssignments,
        assignSample,
        unassignSample,
        setSelectedSampleId,
        setShowSampleBrowser,
    };

    return (
        <SamplesContext.Provider value={value}>
            {children}
        </SamplesContext.Provider>
    );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useSamples() {
    const context = useContext(SamplesContext);
    if (context === undefined) {
        throw new Error("useSamples must be used within a SamplesProvider");
    }
    return context;
}

// Convenience hooks
export function useSampleLibrary() {
    const { samples, loadSamples, uploadSample, deleteSample, updateSample } = useSamples();
    return { samples, loadSamples, uploadSample, deleteSample, updateSample };
}

export function useSampleAssignments() {
    const { sampleAssignments, assignSample, unassignSample } = useSamples();
    return { sampleAssignments, assignSample, unassignSample };
}

