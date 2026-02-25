/**
 * ClipLauncherSlot - Individual clip slot component
 *
 * PERFORMANCE INSTRUMENT VISION:
 * - Large, tactile slots easy to click during live performance
 * - Clear state visualization (empty/armed/playing/stopping)
 * - Vibrant colors that are VISIBLE
 * - Loop progress indicator
 * - Each clip has its own unique color
 *
 * NO PROP DRILLING - Reads from Zustand store
 */

import { useDAWStore } from '@/stores/dawStore';
import { cn } from '@/lib/utils';
import { Play, Square, Music } from 'lucide-react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface ClipLauncherSlotProps {
    trackIndex: number;
    slotIndex: number;
}

// Vibrant clip colors (each slot gets unique color based on position)
const CLIP_COLORS = [
    'hsl(187 85% 55%)',  // cyan
    'hsl(280 85% 65%)',  // purple
    'hsl(45 95% 60%)',   // yellow
    'hsl(0 85% 60%)',    // red
    'hsl(120 85% 55%)',  // green
    'hsl(30 95% 60%)',   // orange
    'hsl(200 85% 60%)',  // blue
    'hsl(330 85% 65%)',  // pink
    'hsl(160 85% 55%)',  // teal
    'hsl(270 85% 60%)',  // violet
    'hsl(50 95% 65%)',   // gold
    'hsl(10 85% 60%)',   // coral
];

export function ClipLauncherSlot({ trackIndex, slotIndex }: ClipLauncherSlotProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);
    const clips = useDAWStore(state => state.clips);
    const playingClips = useDAWStore(state => state.playingClips);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const triggerClip = useDAWStore(state => state.triggerClip);

    // ========================================================================
    // DERIVED STATE
    // ========================================================================
    const track = tracks[trackIndex];
    if (!track) return null;

    // Find clip in this slot
    const clip = clips.find(c => c.track_id === track.id && c.slot_index === slotIndex);
    const isPlaying = playingClips.some(pc => pc.track_id === track.id && pc.slot_index === slotIndex);

    // Get unique color for this slot position
    const slotColor = CLIP_COLORS[(trackIndex * 3 + slotIndex) % CLIP_COLORS.length];

    // ========================================================================
    // HANDLERS
    // ========================================================================
    const handleClick = () => {
        // For now, trigger even if no clip (for UI testing)
        triggerClip(track.id, slotIndex);
    };

    // ========================================================================
    // RENDER: Empty slot - HARDWARE RGB PAD STYLE
    // ========================================================================
    if (!clip) {
        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <button
                        onClick={handleClick}
                        className={cn(
                            "relative h-full w-full rounded transition-all cursor-pointer",
                            "flex items-center justify-center",
                            "hover:brightness-125 active:scale-95"
                        )}
                        style={{
                            backgroundColor: isPlaying
                                ? slotColor
                                : '#1a1a1a',
                            boxShadow: isPlaying
                                ? `0 0 20px ${slotColor}, inset 0 0 10px ${slotColor}40`
                                : 'inset 0 2px 4px rgba(0,0,0,0.5)',
                            border: `1px solid ${isPlaying ? slotColor : '#2a2a2a'}`,
                        }}
                    >
                        {/* Dim indicator when empty */}
                        {!isPlaying && (
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                        )}

                        {/* Pulse when playing */}
                        {isPlaying && (
                            <div
                                className="absolute inset-0 rounded animate-pulse"
                                style={{
                                    background: `radial-gradient(circle at center, ${slotColor} 0%, transparent 70%)`,
                                    opacity: 0.5
                                }}
                            />
                        )}
                    </button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem>Add Audio Clip</ContextMenuItem>
                    <ContextMenuItem>Add MIDI Clip</ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    }

    // ========================================================================
    // RENDER: Filled slot - HARDWARE RGB PAD STYLE
    // ========================================================================
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <button
                    onClick={handleClick}
                    className={cn(
                        "relative h-full w-full rounded transition-all cursor-pointer overflow-hidden",
                        "flex flex-col p-1.5",
                        "hover:brightness-125 active:scale-95"
                    )}
                    style={{
                        backgroundColor: slotColor,
                        boxShadow: isPlaying
                            ? `0 0 20px ${slotColor}, inset 0 0 10px ${slotColor}40`
                            : `0 0 8px ${slotColor}60, inset 0 2px 4px rgba(0,0,0,0.3)`,
                        border: `1px solid ${slotColor}`,
                        opacity: isPlaying ? 1 : 0.7
                    }}
                >
                    {/* Pulse when playing */}
                    {isPlaying && (
                        <div
                            className="absolute inset-0 rounded animate-pulse"
                            style={{
                                background: `radial-gradient(circle at center, ${slotColor} 0%, transparent 70%)`,
                                opacity: 0.5
                            }}
                        />
                    )}

                    {/* Content */}
                    <div className="relative h-full flex flex-col justify-between">
                        {/* Clip name */}
                        <div className="text-[8px] font-bold text-white/90 truncate leading-tight drop-shadow">
                            {clip.name}
                        </div>

                        {/* Bottom: Type + Playing indicator */}
                        <div className="flex items-center justify-between">
                            <div className="text-[7px] text-white/70 uppercase font-bold">
                                {clip.type}
                            </div>
                            {isPlaying && (
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            )}
                        </div>
                    </div>
                </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem>Edit Clip</ContextMenuItem>
                <ContextMenuItem>Duplicate Clip</ContextMenuItem>
                <ContextMenuItem className="text-destructive">Delete Clip</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

