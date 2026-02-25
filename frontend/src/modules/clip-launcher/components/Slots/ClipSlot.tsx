/**
 * ClipSlot Component
 *
 * Individual clip slot in the clip launcher grid.
 * Matches MixerChannelStrip styling patterns.
 *
 * Features:
 * - Right-click to assign clips
 * - Click to launch/stop
 * - Visual launch states
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

    // Empty slot - RIGHT CLICK to show menu
    if (isEmpty) {
        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div
                        className="relative h-24 rounded-md border-2 border-dashed border-border/40 bg-black/20 hover:border-border/70 hover:bg-black/30 transition-all cursor-pointer flex items-center justify-center group"
                    >
                        {/* Plus icon for assigning clips */}
                        <div className="text-3xl opacity-30 group-hover:opacity-50 transition-opacity text-muted-foreground">+</div>

                        {/* Record button - BOTTOM RIGHT CORNER */}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleStartRecording();
                            }}
                            className={cn(
                                "absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center transition-all",
                                "opacity-0 group-hover:opacity-100",
                                isRecording
                                    ? "bg-red-500 shadow-lg shadow-red-500/50 animate-pulse"
                                    : "bg-red-500/80 hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/50"
                            )}
                            title="Record into this slot"
                        >
                            <Circle
                                size={12}
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

    // Track color with fallback
    const trackColor = track?.color || 'hsl(187 85% 55%)';

    // Filled slot with context menu - PROFESSIONAL VIBRANT DESIGN
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <button
                    className={cn(
                        "relative h-24 w-full rounded-md cursor-pointer transition-all overflow-hidden group",
                        "shadow-md hover:shadow-lg",
                        isPlaying && "ring-2 ring-white/50",
                    )}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClick();
                    }}
                    onMouseDown={() => {
                        console.log('MOUSE DOWN on clip slot');
                    }}
                    style={{
                        // BRIGHT SATURATED COLORS - Like Ableton Live Session View
                        backgroundColor: isPlaying
                            ? trackColor // Full saturation when playing
                            : isTriggered
                            ? '#fbbf24' // Bright yellow for triggered
                            : isStopping
                            ? '#ef4444' // Bright red for stopping
                            : trackColor, // Full color when idle
                        boxShadow: isPlaying
                            ? `0 0 20px ${trackColor}, 0 4px 12px rgba(0,0,0,0.5)`
                            : isTriggered
                            ? '0 0 20px #fbbf24, 0 4px 12px rgba(0,0,0,0.5)'
                            : isStopping
                            ? '0 0 20px #ef4444, 0 4px 12px rgba(0,0,0,0.5)'
                            : '0 2px 8px rgba(0,0,0,0.4)',
                    }}
                >
            {/* Dark overlay for contrast */}
            <div
                className={cn(
                    "absolute inset-0 pointer-events-none transition-opacity",
                    isPlaying ? "bg-black/20" : "bg-black/30 group-hover:bg-black/20"
                )}
            />

            {/* Clip content - HIGH CONTRAST */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3 gap-2 pointer-events-none">
                {/* Clip type icon */}
                <div className="text-white/90">
                    {clip.type === 'midi' ? (
                        <Music size={20} className="drop-shadow-lg" />
                    ) : (
                        <AudioWaveform size={20} className="drop-shadow-lg" />
                    )}
                </div>

                {/* Clip name - BOLD AND READABLE */}
                <span className="text-sm font-black uppercase tracking-wide truncate w-full text-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {clip.name}
                </span>

                {/* Clip duration */}
                <span className="text-[10px] font-mono text-white/80 drop-shadow-lg">
                    {clip.duration.toFixed(1)}s
                </span>
            </div>

            {/* Progress bar - BRIGHT AND VISIBLE */}
            {(isPlaying || isTriggered) && (
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 pointer-events-none">
                    <div
                        className="h-full bg-white transition-all shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                        style={{ width: `${progress * 100}%` }}
                    />
                </div>
            )}

            {/* Launch state indicator - TOP RIGHT CORNER */}
            <div className="absolute top-2 right-2 pointer-events-none">
                {isPlaying && (
                    <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-pulse" />
                )}
                {isTriggered && (
                    <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-pulse" />
                )}
                {isStopping && (
                    <div className="w-4 h-4 rounded-full bg-white/50 shadow-[0_0_12px_rgba(255,255,255,0.5)]" />
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

