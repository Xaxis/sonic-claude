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
    // RENDER: Empty slot (still clickable for testing)
    // ========================================================================
    if (!clip) {
        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <button
                        onClick={handleClick}
                        className={cn(
                            "relative h-full w-full rounded-lg border-2 border-dashed transition-all cursor-pointer",
                            "flex flex-col items-center justify-center gap-2 group",
                            "hover:scale-[1.02] active:scale-98",
                            isPlaying && "border-solid scale-[1.02]"
                        )}
                        style={{
                            borderColor: isPlaying
                                ? slotColor
                                : `color-mix(in srgb, ${slotColor} 30%, transparent)`,
                            backgroundColor: isPlaying
                                ? `color-mix(in srgb, ${slotColor} 35%, var(--color-background))`
                                : `color-mix(in srgb, ${slotColor} 8%, transparent)`,
                            boxShadow: isPlaying
                                ? `0 0 24px ${slotColor}60, inset 0 0 20px ${slotColor}20`
                                : 'none',
                        }}
                    >
                        {/* Background glow when playing */}
                        {isPlaying && (
                            <div
                                className="absolute inset-0 rounded-lg opacity-40 animate-pulse"
                                style={{
                                    background: `radial-gradient(circle at center, ${slotColor}60 0%, transparent 70%)`,
                                }}
                            />
                        )}

                        {/* Icon */}
                        <Music
                            size={20}
                            className={cn(
                                "relative transition-all",
                                isPlaying ? "text-white" : "text-muted-foreground/40"
                            )}
                        />

                        {/* Label */}
                        <div
                            className={cn(
                                "relative text-[9px] font-bold uppercase tracking-wider transition-all",
                                isPlaying ? "text-white" : "text-muted-foreground/40"
                            )}
                        >
                            {isPlaying ? 'Playing' : 'Empty'}
                        </div>

                        {/* Playing ring */}
                        {isPlaying && (
                            <div
                                className="absolute inset-0 rounded-lg border-2 animate-pulse"
                                style={{
                                    borderColor: `${slotColor}80`,
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
    // RENDER: Filled slot (PERFORMANCE INSTRUMENT)
    // ========================================================================
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <button
                    onClick={handleClick}
                    className={cn(
                        "relative h-full w-full rounded-lg border-2 transition-all cursor-pointer overflow-hidden",
                        "flex flex-col group",
                        "hover:scale-[1.02] active:scale-98",
                        isPlaying && "scale-[1.02]"
                    )}
                    style={{
                        borderColor: isPlaying
                            ? slotColor
                            : `color-mix(in srgb, ${slotColor} 60%, transparent)`,
                        backgroundColor: `color-mix(in srgb, ${slotColor} 30%, var(--color-background))`,
                        boxShadow: isPlaying
                            ? `0 0 24px ${slotColor}70, inset 0 0 20px ${slotColor}25`
                            : `0 0 8px ${slotColor}30`,
                    }}
                >
                    {/* Background glow when playing */}
                    {isPlaying && (
                        <div
                            className="absolute inset-0 opacity-40 animate-pulse"
                            style={{
                                background: `radial-gradient(circle at center, ${slotColor}80 0%, transparent 70%)`,
                            }}
                        />
                    )}

                    {/* Content */}
                    <div className="relative h-full flex flex-col p-3 gap-2">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-white/95 truncate">
                                {clip.name}
                            </div>
                            {isPlaying ? (
                                <Square
                                    size={14}
                                    className="text-white/95 flex-shrink-0 fill-white/20"
                                />
                            ) : (
                                <Play
                                    size={14}
                                    className="text-white/80 flex-shrink-0 fill-white/10"
                                />
                            )}
                        </div>

                        {/* Clip info */}
                        <div className="flex-1 flex flex-col justify-center gap-1">
                            <div className="text-[9px] text-white/60 uppercase tracking-wider font-medium">
                                {clip.type}
                            </div>
                            {clip.duration && (
                                <div className="text-[9px] text-white/50 font-mono">
                                    {clip.duration.toFixed(2)}s
                                </div>
                            )}
                        </div>

                        {/* Loop progress bar (only when playing) */}
                        {isPlaying && (
                            <div className="relative h-1.5 rounded-full overflow-hidden bg-black/40">
                                <div
                                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-100"
                                    style={{
                                        width: '50%', // TODO: Calculate from actual loop progress
                                        backgroundColor: slotColor,
                                        boxShadow: `0 0 8px ${slotColor}`,
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Playing ring */}
                    {isPlaying && (
                        <div
                            className="absolute inset-0 rounded-lg border-2 animate-pulse pointer-events-none"
                            style={{
                                borderColor: `${slotColor}90`,
                            }}
                        />
                    )}
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

