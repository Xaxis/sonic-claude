/**
 * ClipSlot Component
 *
 * Individual clip slot in the clip launcher grid.
 * Each slot gets a UNIQUE vibrant color based on position (like Ableton Live).
 *
 * Features:
 * - Right-click to assign clips
 * - Click to launch/stop
 * - Visual launch states
 * - Unique color per slot position
 *
 * NO PROP DRILLING - Reads from Zustand store
 */

import { useState } from 'react';
import { useDAWStore } from '@/stores/dawStore';
import { cn } from '@/lib/utils';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuLabel,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Music, AudioWaveform, X, Circle } from 'lucide-react';
import { toast } from 'sonner';

// VIBRANT COLOR PALETTE - Each slot gets unique color based on position
const SLOT_COLORS = [
    'hsl(0 85% 60%)',    // Red
    'hsl(30 95% 60%)',   // Orange
    'hsl(45 95% 60%)',   // Yellow
    'hsl(120 75% 50%)',  // Green
    'hsl(187 85% 55%)',  // Cyan
    'hsl(220 85% 60%)',  // Blue
    'hsl(280 85% 65%)',  // Magenta
    'hsl(320 85% 60%)',  // Pink
    'hsl(160 85% 55%)',  // Teal
    'hsl(270 85% 65%)',  // Purple
    'hsl(15 95% 60%)',   // Coral
    'hsl(60 95% 55%)',   // Lime
];

interface ClipSlotProps {
    trackIndex: number;
    slotIndex: number;
}

export function ClipSlot({ trackIndex, slotIndex }: ClipSlotProps) {
    // Read from store (no prop drilling)
    const composition = useDAWStore((state) => state.activeComposition);
    const clipLaunchStates = useDAWStore((state) => state.clipLaunchStates);
    const launchClip = useDAWStore((state) => state.launchClip);
    const stopClip = useDAWStore((state) => state.stopClip);
    const assignClipToSlot = useDAWStore((state) => state.assignClipToSlot);
    const openPianoRoll = useDAWStore((state) => state.openPianoRoll);
    const openSampleEditor = useDAWStore((state) => state.openSampleEditor);

    // Local state for recording and double-click detection
    const [isRecording, setIsRecording] = useState(false);
    const [lastClickTime, setLastClickTime] = useState(0);

    // Get clip ID from slot
    const clipId = composition?.clip_slots?.[trackIndex]?.[slotIndex] ?? null;

    // Get clip and track data from composition
    const clips = composition?.clips ?? [];
    const tracks = composition?.tracks ?? [];
    const clip = clipId ? clips.find(c => c.id === clipId) : null;
    const track = tracks[trackIndex];
    const launchState = clipId ? clipLaunchStates[clipId] : null;
    const availableClips = clips.filter(c => c.track_id === track?.id);

    // Determine visual state
    const isEmpty = !clip;
    const isPlaying = launchState?.state === 'playing';
    const isTriggered = launchState?.state === 'triggered';
    const isStopping = launchState?.state === 'stopping';

    // Progress bar (0-1)
    const progress = launchState?.progress ?? 0;

    const handleClick = () => {
        if (!clipId || !clip) {
            return;
        }

        const now = Date.now();
        const timeSinceLastClick = now - lastClickTime;

        // Double-click detection (within 300ms)
        if (timeSinceLastClick < 300) {
            // Double-click: open editor
            if (clip.type === 'midi') {
                openPianoRoll(clipId);
                toast.info(`Opening Piano Roll for "${clip.name}"`);
            } else if (clip.type === 'audio') {
                openSampleEditor(clipId);
                toast.info(`Opening Sample Editor for "${clip.name}"`);
            }
            // Reset click time to prevent triple-click issues
            setLastClickTime(0);
        } else {
            // Single-click: launch/stop clip
            if (isPlaying || isTriggered) {
                stopClip(clipId);
            } else {
                launchClip(clipId);
            }
            setLastClickTime(now);
        }
    };

    const handleAssignClip = (clipId: string) => {
        assignClipToSlot(trackIndex, slotIndex, clipId);
    };

    const handleClearSlot = () => {
        assignClipToSlot(trackIndex, slotIndex, null);
    };

    const handleStartRecording = () => {
        // TODO: Implement recording functionality
        // For now, just show a toast
        setIsRecording(true);
        toast.info("Recording functionality coming soon!");

        // Simulate recording for 4 beats (at 120 BPM = 2 seconds)
        setTimeout(() => {
            setIsRecording(false);
            toast.success("Recording complete! (simulated)");
        }, 2000);
    };

    // Calculate UNIQUE color for this slot position (like Ableton Live)
    const slotColor = SLOT_COLORS[(trackIndex * 8 + slotIndex) % SLOT_COLORS.length];

    // Empty slot - RIGHT CLICK to show menu
    if (isEmpty) {
        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div
                        className="relative h-20 rounded-lg border-2 border-dashed transition-all cursor-pointer flex items-center justify-center group hover:scale-[1.01]"
                        style={{
                            borderColor: `${slotColor}30`,
                            backgroundColor: `${slotColor}08`,
                        }}
                    >
                        {/* Plus icon for assigning clips */}
                        <div
                            className="text-2xl opacity-20 group-hover:opacity-50 transition-opacity"
                            style={{ color: slotColor }}
                        >
                            +
                        </div>

                        {/* Record button - BOTTOM RIGHT CORNER */}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleStartRecording();
                            }}
                            className={cn(
                                "absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                "opacity-0 group-hover:opacity-100",
                                isRecording
                                    ? "bg-destructive shadow-lg shadow-destructive/50 animate-pulse"
                                    : "bg-destructive/80 hover:bg-destructive hover:shadow-lg hover:shadow-destructive/50"
                            )}
                            title="Record into this slot"
                        >
                            <Circle
                                size={10}
                                fill={isRecording ? "white" : "currentColor"}
                                className="text-white"
                            />
                        </button>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                    <ContextMenuLabel>Assign Clip</ContextMenuLabel>
                    <ContextMenuSeparator />
                    {availableClips.length === 0 ? (
                        <ContextMenuItem disabled>
                            <span className="text-muted-foreground text-xs">No clips on this track</span>
                        </ContextMenuItem>
                    ) : (
                        availableClips.map((clip) => (
                            <ContextMenuItem
                                key={clip.id}
                                onClick={() => handleAssignClip(clip.id)}
                                className="gap-2"
                            >
                                {clip.type === 'midi' ? (
                                    <Music size={14} className="text-primary" />
                                ) : (
                                    <AudioWaveform size={14} className="text-accent" />
                                )}
                                <span className="truncate">{clip.name}</span>
                                <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                                    {clip.duration.toFixed(1)}s
                                </span>
                            </ContextMenuItem>
                        ))
                    )}
                </ContextMenuContent>
            </ContextMenu>
        );
    }

    // Filled slot with context menu - PROFESSIONAL VIBRANT DESIGN
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <button
                    className={cn(
                        "relative h-20 w-full rounded-lg cursor-pointer transition-all overflow-hidden group",
                        "shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95",
                        isPlaying && "ring-2 ring-white/60 scale-[1.02]",
                    )}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClick();
                    }}
                    style={{
                        // VIBRANT UNIQUE COLORS - Each slot has different color
                        backgroundColor: isPlaying
                            ? slotColor
                            : isTriggered
                            ? 'hsl(45 95% 60%)' // Accent yellow for triggered
                            : isStopping
                            ? 'hsl(0 85% 60%)' // Destructive red for stopping
                            : slotColor,
                        boxShadow: isPlaying
                            ? `0 0 28px ${slotColor}, 0 6px 20px rgba(0,0,0,0.7)`
                            : isTriggered
                            ? '0 0 28px hsl(45 95% 60%), 0 6px 20px rgba(0,0,0,0.7)'
                            : isStopping
                            ? '0 0 28px hsl(0 85% 60%), 0 6px 20px rgba(0,0,0,0.7)'
                            : `0 0 20px ${slotColor}60, 0 4px 14px rgba(0,0,0,0.6)`,
                    }}
                >
                    {/* Dark overlay for contrast */}
                    <div
                        className={cn(
                            "absolute inset-0 pointer-events-none transition-opacity",
                            isPlaying ? "bg-black/15" : "bg-black/25 group-hover:bg-black/15"
                        )}
                    />

                    {/* Clip content - HIGH CONTRAST */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2.5 gap-1.5 pointer-events-none">
                        {/* Clip type icon */}
                        <div className="text-white/95">
                            {clip.type === 'midi' ? (
                                <Music size={18} className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]" />
                            ) : (
                                <AudioWaveform size={18} className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]" />
                            )}
                        </div>

                        {/* Clip name - BOLD AND READABLE */}
                        <span className="text-xs font-black uppercase tracking-wider truncate w-full text-center text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                            {clip.name}
                        </span>

                        {/* Clip duration */}
                        <span className="text-[9px] font-mono font-bold text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            {clip.duration.toFixed(1)}s
                        </span>
                    </div>

                    {/* Progress bar - BRIGHT AND VISIBLE */}
                    {(isPlaying || isTriggered) && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/70 pointer-events-none">
                            <div
                                className="h-full bg-white transition-all shadow-[0_0_10px_rgba(255,255,255,0.9)]"
                                style={{ width: `${progress * 100}%` }}
                            />
                        </div>
                    )}

                    {/* Launch state indicator - TOP RIGHT CORNER */}
                    <div className="absolute top-1.5 right-1.5 pointer-events-none">
                        {isPlaying && (
                            <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,1)] animate-pulse" />
                        )}
                        {isTriggered && (
                            <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,1)] animate-pulse" />
                        )}
                        {isStopping && (
                            <div className="w-3 h-3 rounded-full bg-white/60 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                        )}
                    </div>
                </button>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56">
                <ContextMenuLabel>Reassign Clip</ContextMenuLabel>
                <ContextMenuSeparator />
                {availableClips.length === 0 ? (
                    <ContextMenuItem disabled>
                        <span className="text-muted-foreground text-xs">No clips on this track</span>
                    </ContextMenuItem>
                ) : (
                    availableClips.map((availableClip) => (
                        <ContextMenuItem
                            key={availableClip.id}
                            onClick={() => handleAssignClip(availableClip.id)}
                            className="gap-2"
                        >
                            {availableClip.type === 'midi' ? (
                                <Music size={14} className="text-primary" />
                            ) : (
                                <AudioWaveform size={14} className="text-accent" />
                            )}
                            <span className="truncate">{availableClip.name}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                                {availableClip.duration.toFixed(1)}s
                            </span>
                        </ContextMenuItem>
                    ))
                )}
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleClearSlot} className="gap-2 text-destructive">
                    <X size={14} />
                    <span>Clear Slot</span>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

