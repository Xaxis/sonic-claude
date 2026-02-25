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

import { useState, useRef } from 'react';
import { useDAWStore } from '@/stores/dawStore';
import { useTransportWebSocket } from '@/hooks/useTransportWebsocket';
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

// THEME-MATCHED COLOR PALETTE
// Uses the same color scheme as the visualizer module for consistency
// High saturation colors that fit the dark theme aesthetic
const HARDWARE_COLORS = [
    'hsl(187 85% 55%)',   // Cyan (primary)
    'hsl(280 85% 65%)',   // Magenta (secondary)
    'hsl(45 95% 60%)',    // Yellow (accent)
    'hsl(0 85% 60%)',     // Red
    'hsl(120 85% 55%)',   // Green
    'hsl(210 85% 60%)',   // Blue
    'hsl(30 90% 60%)',    // Orange
    'hsl(270 85% 65%)',   // Purple
    'hsl(160 85% 55%)',   // Teal
    'hsl(330 85% 65%)',   // Pink
    'hsl(60 90% 60%)',    // Lime
    'hsl(180 85% 60%)',   // Aqua
    'hsl(300 85% 65%)',   // Fuchsia
    'hsl(15 90% 60%)',    // Coral
    'hsl(240 85% 65%)',   // Indigo
    'hsl(90 85% 55%)',    // Chartreuse
];

export function ClipLauncherSlot({ trackIndex, slotIndex }: ClipLauncherSlotProps) {
    // ========================================================================
    // LOCAL STATE: Double-click detection (use ref to persist across renders)
    // ========================================================================
    const lastClickTimeRef = useRef(0);

    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);
    const clips = useDAWStore(state => state.clips);
    const clipSlots = useDAWStore(state => state.clipSlots);
    const selectedClipSlots = useDAWStore(state => state.selectedClipSlots);

    // Read playing clips from WebSocket (runtime state)
    const { transport } = useTransportWebSocket();
    const playingClipIds = transport.playing_clips || [];

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

    // Check if this clip is playing (by clip ID from WebSocket)
    const isPlaying = assignedClipId ? playingClipIds.includes(assignedClipId) : false;
    const isSelected = selectedClipSlots.get(trackIndex) === slotIndex;

    // DEBUG: Log playing state
    if (isPlaying) {
        console.log(`🟢 Slot [${trackIndex}][${slotIndex}] is PLAYING:`, { assignedClipId, playingClipIds });
    }

    // INTELLIGENT COLOR SYSTEM:
    // Each track column gets a unique vibrant color from the hardware palette
    // This ensures visual differentiation between columns (like Akai Force)
    const padColor = HARDWARE_COLORS[trackIndex % HARDWARE_COLORS.length];

    // ========================================================================
    // HANDLERS
    // ========================================================================
    const handleClick = () => {
        const now = Date.now();
        const timeSinceLastClick = now - lastClickTimeRef.current;

        console.log('🖱️ Pad clicked:', { trackIndex, slotIndex, assignedClipId, timeSinceLastClick });

        // Double-click detection (within 300ms)
        if (timeSinceLastClick < 300 && timeSinceLastClick > 0) {
            // Double-click: Trigger/stop clip
            console.log('🎯 Double-click detected - triggering clip');
            if (assignedClipId) {
                triggerClip(track.id, slotIndex);
            } else {
                console.warn('⚠️ No clip assigned to this slot');
            }
            lastClickTimeRef.current = 0; // Reset to prevent triple-click issues
        } else {
            // Single-click: Select slot (one per column)
            console.log('👆 Single-click - selecting slot');
            setSelectedClipSlot(trackIndex, slotIndex);
            lastClickTimeRef.current = now;
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
                                    background: `radial-gradient(circle at center, ${padColor} 0%, transparent 70%)`,
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
                        "relative h-full w-full rounded-md transition-all cursor-pointer overflow-hidden",
                        "flex flex-col p-1.5",
                        "hover:brightness-110 active:scale-[0.98]"
                    )}
                    style={{
                        backgroundColor: isPlaying
                            ? padColor
                            : isSelected
                                ? `color-mix(in srgb, ${padColor} 15%, transparent)`
                                : '#1a1a1a',
                        boxShadow: isSelected
                            ? `0 0 0 2px ${padColor}, 0 0 8px ${padColor}60`
                            : isPlaying
                                ? `0 0 16px ${padColor}, 0 4px 12px ${padColor}80, inset 0 0 20px ${padColor}60`
                                : `0 2px 4px rgba(0,0,0,0.4)`,
                        border: isSelected
                            ? `2px solid ${padColor}`
                            : `1px solid rgba(255,255,255,0.1)`,
                    }}
                >
                    {/* Pulsing glow when playing */}
                    {isPlaying && (
                        <div
                            className="absolute inset-0 rounded-md"
                            style={{
                                background: `radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, transparent 70%)`,
                                animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
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

