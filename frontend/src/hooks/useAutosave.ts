/**
 * useAutosave Hook - Periodic History Snapshots
 *
 * Creates periodic history snapshots for undo/redo functionality.
 *
 * Architecture:
 * - Backend auto-persists after every mutation (current.json always in sync)
 * - This hook creates periodic history entries for undo/redo
 * - Runs every 60 seconds if there's an active composition
 * - Only creates history if composition exists
 *
 * Note: This is NOT for preventing data loss (backend already handles that).
 * This is ONLY for creating undo/redo savepoints.
 */

import { useEffect, useRef } from 'react';
import { useDAWStore } from '@/stores/dawStore';
import { api } from '@/services/api';

const SNAPSHOT_INTERVAL_MS = 60000; // 1 minute

export function useAutosave() {
    const intervalRef = useRef<number | undefined>(undefined);
    const isSavingRef = useRef(false);

    useEffect(() => {
        // Create periodic history snapshots
        intervalRef.current = window.setInterval(async () => {
            const state = useDAWStore.getState();
            const { activeComposition } = state;

            // Don't save if no active composition or already saving
            if (!activeComposition || isSavingRef.current) {
                return;
            }

            try {
                isSavingRef.current = true;
                console.log('📸 Creating history snapshot:', activeComposition.id);

                // Create history entry (for undo/redo)
                await api.compositions.saveComposition(
                    activeComposition.id,
                    true,  // createHistory = true (for undo/redo)
                    false  // isAutosave = false
                );

                console.log('✅ History snapshot created');
            } catch (error) {
                console.error('❌ Failed to create history snapshot:', error);
                // Don't show toast - this is background operation
            } finally {
                isSavingRef.current = false;
            }
        }, SNAPSHOT_INTERVAL_MS);

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);
}

