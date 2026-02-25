/**
 * ClipLauncherSlot - Individual clip slot component (PAD VIEW)
 *
 * PERFORMANCE INSTRUMENT VISION:
 * - Large, tactile pads easy to click during live performance
 * - INTELLIGENT COLOR SYSTEM (Akai Force / Ableton Live inspired):
 *   - Empty slot = Dark/dim (no clip assigned)
 *   - Assigned slot (not playing) = Vibrant hardware color (50% opacity)
 *   - Playing slot = Vibrant hardware color (full brightness, pulsing)
 * - Double-click to trigger/stop clip
 * - Single-click to select
 *
 * NO PROP DRILLING - Reads from Zustand store
 */

import { useState } from 'react';
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

// PROFESSIONAL CLIP LAUNCHER COLOR PALETTE
// Inspired by Akai Force, Ableton Push, and Ableton Live
// High saturation, vibrant RGB colors for maximum stage visibility
const HARDWARE_COLORS = [
    'hsl(187 100% 50%)',  // Cyan (Akai signature)
    'hsl(330 100% 60%)',  // Magenta
    'hsl(45 100% 55%)',   // Yellow
    'hsl(0 100% 60%)',    // Red
    'hsl(120 100% 45%)',  // Green
    'hsl(210 100% 55%)',  // Blue
    'hsl(30 100% 55%)',   // Orange
    'hsl(280 100% 65%)',  // Purple
    'hsl(160 100% 50%)',  // Teal
    'hsl(350 100% 65%)',  // Pink
    'hsl(270 100% 60%)',  // Violet
    'hsl(50 100% 60%)',   // Gold
    'hsl(10 100% 60%)',   // Coral
    'hsl(140 100% 50%)',  // Lime
    'hsl(200 100% 50%)',  // Sky Blue
    'hsl(300 100% 60%)',  // Fuchsia
];

export function ClipLauncherSlot({ trackIndex, slotIndex }: ClipLauncherSlotProps) {
    // ========================================================================
    // LOCAL STATE: Double-click detection
    // ========================================================================
    const [lastClickTime, setLastClickTime] = useState(0);

    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);
    const clips = useDAWStore(state => state.clips);
    const clipSlots = useDAWStore(state => state.clipSlots);
    const playingClips = useDAWStore(state => state.playingClips);
    const selectedClipSlot = useDAWStore(state => state.selectedClipSlot);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const triggerClip = useDAWStore(state => state.triggerClip);
    const setSelectedClipSlot = useDAWStore(state => state.setSelectedClipSlot);

    // ========================================================================
    // DERIVED STATE
    // ========================================================================
    const track = tracks[trackIndex];
    if (!track) return null;

    // Get assigned clip ID from grid
    const assignedClipId = clipSlots[trackIndex]?.[slotIndex] || null;
    const clip = assignedClipId ? clips.find(c => c.id === assignedClipId) : null;

    const isPlaying = playingClips.some(pc => pc.track_id === track.id && pc.slot_index === slotIndex);
    const isSelected = selectedClipSlot?.trackIndex === trackIndex && selectedClipSlot?.slotIndex === slotIndex;

    // INTELLIGENT COLOR SYSTEM:
    // Blend theme colors with hardware-inspired vibrant palette
    // Each track gets a vibrant color from the professional palette
    const hardwareColor = HARDWARE_COLORS[trackIndex % HARDWARE_COLORS.length];

    // Use track.color if it's vibrant enough, otherwise use hardware palette
    const isTrackColorVibrant = track.color && !track.color.includes('10%') && !track.color.includes('20%');
    const padColor = isTrackColorVibrant ? track.color : hardwareColor;

    // ========================================================================
    // HANDLERS
    // ========================================================================
    const handleClick = () => {
        const now = Date.now();
        const timeSinceLastClick = now - lastClickTime;

        // Double-click detection (within 300ms)
        if (timeSinceLastClick < 300) {
            // Double-click: Trigger/stop clip
            triggerClip(track.id, slotIndex);
            setLastClickTime(0); // Reset to prevent triple-click issues
        } else {
            // Single-click: Select slot
            setSelectedClipSlot({ trackIndex, slotIndex });
            setLastClickTime(now);
        }
    };

    // ========================================================================
    // RENDER: Empty slot - DARK/DIM (no clip assigned)
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
                            backgroundColor: '#1a1a1a',
                            boxShadow: isSelected
                                ? `0 0 0 2px hsl(var(--primary)), 0 0 20px hsl(var(--primary))40`
                                : 'inset 0 2px 4px rgba(0,0,0,0.5)',
                            border: isSelected
                                ? `2px solid hsl(var(--primary))`
                                : '1px solid #2a2a2a',
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
    // RENDER: Filled slot - TRACK COLOR (intelligent visual organization)
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
                        backgroundColor: padColor,
                        boxShadow: isSelected
                            ? `0 0 0 2px hsl(var(--primary)), 0 0 20px hsl(var(--primary))40, inset 0 0 10px ${padColor}40`
                            : isPlaying
                                ? `0 0 20px ${padColor}, inset 0 0 10px ${padColor}40`
                                : `0 0 8px ${padColor}60, inset 0 2px 4px rgba(0,0,0,0.3)`,
                        border: isSelected
                            ? `2px solid hsl(var(--primary))`
                            : `1px solid ${padColor}`,
                        opacity: isPlaying ? 1 : 0.5  // Dimmed when not playing
                    }}
                >
                    {/* Pulse when playing */}
                    {isPlaying && (
                        <div
                            className="absolute inset-0 rounded animate-pulse"
                            style={{
                                background: `radial-gradient(circle at center, ${padColor} 0%, transparent 70%)`,
                                opacity: 0.5
                            }}
                        />
                    )}

                    {/* Content */}
                    <div className="relative h-full flex flex-col justify-between gap-1">
                        {/* Top: Clip name + Playing indicator */}
                        <div className="flex items-start justify-between gap-1">
                            <div className="text-[8px] font-bold text-white/90 truncate leading-tight drop-shadow flex-1">
                                {clip.name}
                            </div>
                            {isPlaying && (
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse flex-shrink-0 mt-0.5" />
                            )}
                        </div>

                        {/* Middle: Loop progress bar (when playing) */}
                        {isPlaying && (
                            <div className="relative h-1 rounded-full overflow-hidden bg-black/40">
                                <div
                                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-100"
                                    style={{
                                        width: '50%', // TODO: Calculate from actual loop progress
                                        backgroundColor: 'white',
                                        boxShadow: '0 0 4px white',
                                    }}
                                />
                            </div>
                        )}

                        {/* Bottom: Type + Duration */}
                        <div className="flex items-center justify-between text-[7px] text-white/70">
                            <span className="uppercase font-bold">{clip.type}</span>
                            {clip.duration && (
                                <span className="font-mono">{clip.duration.toFixed(1)}s</span>
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

