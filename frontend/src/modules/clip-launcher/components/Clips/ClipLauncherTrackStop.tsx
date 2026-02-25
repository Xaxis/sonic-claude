/**
 * ClipLauncherTrackStop - Track stop button
 *
 * NO PROP DRILLING - Reads from Zustand store
 * Stops all clips on a track
 * Professional styling with track color
 */

import { useDAWStore } from '@/stores/dawStore';
import { cn } from '@/lib/utils';
import { Square } from 'lucide-react';

interface ClipLauncherTrackStopProps {
    trackId: string;
    trackColor: string;
}

export function ClipLauncherTrackStop({ trackId, trackColor }: ClipLauncherTrackStopProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const playingClips = useDAWStore(state => state.playingClips);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const stopTrack = useDAWStore(state => state.stopTrack);

    // ========================================================================
    // DERIVED STATE
    // ========================================================================
    const hasActiveClips = playingClips.some(pc => pc.track_id === trackId);

    // ========================================================================
    // HANDLERS
    // ========================================================================
    const handleClick = () => {
        if (hasActiveClips) {
            stopTrack(trackId);
        }
    };

    // ========================================================================
    // RENDER
    // ========================================================================
    return (
        <button
            onClick={handleClick}
            disabled={!hasActiveClips}
            className={cn(
                "relative h-full w-full rounded-md transition-all duration-200",
                "flex items-center justify-center gap-1.5",
                "font-bold text-[10px] uppercase tracking-wider",
                "shadow-sm",
                hasActiveClips 
                    ? "cursor-pointer hover:scale-[1.01] active:scale-95" 
                    : "cursor-not-allowed opacity-30"
            )}
            style={{
                backgroundColor: hasActiveClips 
                    ? trackColor
                    : `color-mix(in srgb, ${trackColor} 15%, transparent)`,
                boxShadow: hasActiveClips 
                    ? `0 0 16px ${trackColor}, 0 4px 12px rgba(0,0,0,0.5)`
                    : '0 2px 4px rgba(0,0,0,0.3)',
                color: 'white',
            }}
        >
            {/* Background pulse when active */}
            {hasActiveClips && (
                <div
                    className="absolute inset-0 rounded-md animate-pulse"
                    style={{
                        backgroundColor: trackColor,
                        opacity: 0.3,
                    }}
                />
            )}

            {/* Content */}
            <div className="relative flex items-center gap-1.5">
                {/* Icon */}
                <Square 
                    size={12} 
                    fill="currentColor" 
                    className={cn(
                        "transition-transform drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]",
                        hasActiveClips && "animate-pulse"
                    )}
                />
                
                {/* Label */}
                <span className="drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                    Stop
                </span>
            </div>
        </button>
    );
}

