/**
 * Clip Launcher Module Types
 * 
 * Re-exports types from dawStore for convenience
 */

export type { Scene, ClipLaunchState } from '@/stores/dawStore';

/**
 * Clip slot position in the grid
 */
export interface ClipSlotPosition {
    trackIndex: number;
    slotIndex: number;
}

/**
 * Clip slot data (combines position + clip ID)
 */
export interface ClipSlotData extends ClipSlotPosition {
    clipId: string | null;
}

