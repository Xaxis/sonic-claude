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
                "relative h-14 w-full rounded-lg transition-all duration-200",
                "flex items-center justify-center gap-2",
                "font-black text-xs uppercase tracking-widest",
                "shadow-lg",
                hasActiveClips
                    ? "cursor-pointer hover:scale-[1.03] active:scale-95"
                    : "cursor-not-allowed opacity-30"
            )}
            style={{
                backgroundColor: hasActiveClips
                    ? trackColor
                    : `${trackColor}20`,
                boxShadow: hasActiveClips
                    ? `0 0 20px ${trackColor}70, 0 4px 14px rgba(0,0,0,0.5)`
                    : '0 2px 6px rgba(0,0,0,0.3)',
                color: 'white',
            }}
        >
            {/* Dark overlay for contrast */}
            <div
                className={cn(
                    "absolute inset-0 rounded-lg pointer-events-none transition-opacity",
                    hasActiveClips ? "bg-black/20" : "bg-black/40"
                )}
            />

            {/* Content */}
            <div className="relative flex items-center gap-2">
                {/* Icon */}
                <Square
                    size={14}
                    fill="currentColor"
                    className={cn(
                        "transition-transform drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]",
                        hasActiveClips && "animate-pulse"
                    )}
                />

                {/* Label */}
                <span className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                    Stop
                </span>
            </div>

            {/* Active clip count badge */}
            {hasActiveClips && (
                <div
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black shadow-lg border-2 border-background"
                    style={{
                        backgroundColor: 'hsl(0 85% 60%)',
                        color: 'white',
                    }}
                >
                    {activeClipCount}
                </div>
            )}

            {/* Glow effect when active */}
            {hasActiveClips && (
                <div
                    className="absolute inset-0 rounded-lg pointer-events-none animate-pulse"
                    style={{
                        background: `radial-gradient(circle at center, ${trackColor}30 0%, transparent 70%)`,
                    }}
                />
            )}
        </button>
    );
}

