/**
 * TrackStopButton - Stop button for individual track columns
 * 
 * Professional stop button that appears at the bottom of each track column.
 * Stops all clips (playing + triggered) on that specific track.
 * 
 * BRILLIANT UI/UX:
 * - Large, prominent button matching track color
 * - Shows count of active clips on track
 * - Glows when clips are playing
 * - Disabled state when no clips active
 * - Smooth hover/active animations
 */

import { Square } from "lucide-react";
import { useDAWStore } from "@/stores/dawStore";
import { cn } from "@/lib/utils";

interface TrackStopButtonProps {
    trackId: string;
    trackColor: string;
}

export function TrackStopButton({ trackId, trackColor }: TrackStopButtonProps) {
    // Read from store
    const composition = useDAWStore((state) => state.activeComposition);
    const clipLaunchStates = useDAWStore((state) => state.clipLaunchStates);
    const stopTrackClips = useDAWStore((state) => state.stopTrackClips);

    // Count active clips on this track
    const trackClipIds = composition?.clips
        .filter(clip => clip.track_id === trackId)
        .map(clip => clip.id) ?? [];
    
    const activeClipCount = trackClipIds.filter(clipId => 
        clipId in clipLaunchStates
    ).length;

    const hasActiveClips = activeClipCount > 0;

    const handleClick = () => {
        if (!hasActiveClips) return;
        stopTrackClips(trackId);
    };

    return (
        <button
            onClick={handleClick}
            disabled={!hasActiveClips}
            className={cn(
                "relative h-12 w-full rounded-md transition-all duration-200",
                "flex items-center justify-center gap-2",
                "font-black text-sm uppercase tracking-wider",
                "shadow-lg",
                hasActiveClips 
                    ? "cursor-pointer hover:scale-105 active:scale-95" 
                    : "cursor-not-allowed opacity-40"
            )}
            style={{
                backgroundColor: hasActiveClips 
                    ? `${trackColor}dd` 
                    : `${trackColor}30`,
                boxShadow: hasActiveClips 
                    ? `0 0 16px ${trackColor}80, 0 4px 12px rgba(0,0,0,0.4)`
                    : '0 2px 8px rgba(0,0,0,0.2)',
                color: 'white',
            }}
        >
            {/* Icon */}
            <Square 
                size={16} 
                fill="currentColor" 
                className={cn(
                    "transition-transform",
                    hasActiveClips && "animate-pulse"
                )}
            />
            
            {/* Label */}
            <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Stop
            </span>

            {/* Active clip count badge */}
            {hasActiveClips && (
                <div 
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg"
                    style={{
                        backgroundColor: '#ef4444',
                        color: 'white',
                    }}
                >
                    {activeClipCount}
                </div>
            )}

            {/* Glow effect when active */}
            {hasActiveClips && (
                <div 
                    className="absolute inset-0 rounded-md pointer-events-none animate-pulse"
                    style={{
                        background: `radial-gradient(circle at center, ${trackColor}40 0%, transparent 70%)`,
                    }}
                />
            )}
        </button>
    );
}

