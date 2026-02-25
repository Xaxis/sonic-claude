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
    // RENDER: Empty slot
    // ========================================================================
    if (!clip) {
        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div
                        className="relative h-full w-full rounded-md border-2 border-dashed transition-all cursor-pointer flex items-center justify-center group hover:scale-[1.01]"
                        style={{
                            borderColor: `color-mix(in srgb, ${track.color} 40%, transparent)`,
                            backgroundColor: `color-mix(in srgb, ${track.color} 8%, transparent)`,
                        }}
                    >
                        <div className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-wider">
                            Empty
                        </div>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem>Add Audio Clip</ContextMenuItem>
                    <ContextMenuItem>Add MIDI Clip</ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    }

    // ========================================================================
    // RENDER: Filled slot
    // ========================================================================
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <button
                    onClick={handleClick}
                    className={cn(
                        "relative h-full w-full rounded-md cursor-pointer transition-all overflow-hidden group",
                        "shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-95",
                        isPlaying && "ring-2 ring-primary/60 scale-[1.01]",
                    )}
                    style={{
                        backgroundColor: `color-mix(in srgb, ${track.color} 25%, var(--color-background))`,
                        border: `1px solid color-mix(in srgb, ${track.color} 60%, transparent)`,
                    }}
                >
                    {/* Background glow */}
                    <div
                        className="absolute inset-0 opacity-30"
                        style={{
                            background: `radial-gradient(circle at center, ${track.color}40 0%, transparent 70%)`,
                        }}
                    />

                    {/* Content */}
                    <div className="relative h-full flex flex-col justify-between p-2">
                        {/* Top: Clip name */}
                        <div
                            className="text-[10px] font-bold uppercase tracking-wide truncate"
                            style={{ color: track.color }}
                            title={clip.name}
                        >
                            {clip.name}
                        </div>

                        {/* Bottom: Play state indicator */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                {isPlaying ? (
                                    <Square size={10} fill="currentColor" className="text-primary animate-pulse" />
                                ) : (
                                    <Play size={10} fill="currentColor" className="text-muted-foreground" />
                                )}
                                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">
                                    {isPlaying ? 'Playing' : 'Ready'}
                                </span>
                            </div>
                        </div>
                    </div>
                </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={handleClick}>
                    {isPlaying ? 'Stop Clip' : 'Play Clip'}
                </ContextMenuItem>
                <ContextMenuItem>Edit Clip</ContextMenuItem>
                <ContextMenuItem>Duplicate Clip</ContextMenuItem>
                <ContextMenuItem className="text-destructive">Delete Clip</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

