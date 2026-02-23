/**
 * useAutosave Hook
 * 
 * Watches the hasUnsavedChanges flag in the Zustand store and automatically
 * saves the composition after a debounce period.
 * 
 * Architecture:
 * - Uses Zustand's subscribe API to watch hasUnsavedChanges
 * - Debounces save calls to avoid excessive API requests
 * - Only saves when there's an active composition
 * - Handles errors gracefully
 */

import { useEffect, useRef } from 'react';
import { useDAWStore } from '@/stores/dawStore';
import { api } from '@/services/api';
import { toast } from 'sonner';

const AUTOSAVE_DEBOUNCE_MS = 3000; // 3 seconds

export function useAutosave() {
    const autosaveTimeoutRef = useRef<number | undefined>(undefined);
    const isSavingRef = useRef(false);

    useEffect(() => {
        // Subscribe to hasUnsavedChanges changes
        const unsubscribe = useDAWStore.subscribe(
            (state) => state.hasUnsavedChanges,
            async (hasUnsavedChanges, previousHasUnsavedChanges) => {
                // Only trigger autosave when changes go from false -> true
                if (!hasUnsavedChanges || previousHasUnsavedChanges === hasUnsavedChanges) {
                    return;
                }

                // Clear any pending autosave
                if (autosaveTimeoutRef.current) {
                    clearTimeout(autosaveTimeoutRef.current);
                }

                // Schedule autosave after debounce period
                autosaveTimeoutRef.current = window.setTimeout(async () => {
                    const state = useDAWStore.getState();
                    const { activeComposition } = state;

                    // Don't save if no active composition or already saving
                    if (!activeComposition || isSavingRef.current) {
                        return;
                    }

                    try {
                        isSavingRef.current = true;
                        console.log('💾 Autosaving composition:', activeComposition.id);

                        // Save composition (builds snapshot from current backend services)
                        await api.compositions.saveComposition(
                            activeComposition.id,
                            false, // createHistory
                            true   // isAutosave
                        );

                        // Mark as saved
                        useDAWStore.setState({ hasUnsavedChanges: false });

                        console.log('✅ Autosave complete');
                    } catch (error) {
                        console.error('❌ Autosave failed:', error);
                        toast.error('Autosave failed');
                    } finally {
                        isSavingRef.current = false;
                    }
                }, AUTOSAVE_DEBOUNCE_MS);
            }
        );

        // Cleanup
        return () => {
            unsubscribe();
            if (autosaveTimeoutRef.current) {
                clearTimeout(autosaveTimeoutRef.current);
            }
        };
    }, []);
}

