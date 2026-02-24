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
import { Music, AudioWaveform, X } from 'lucide-react';

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
        console.log('ClipSlot clicked:', { clipId, clip, isPlaying, isTriggered });

        if (!clipId) {
            console.log('No clip ID - slot is empty');
            return;
        }

        if (isPlaying || isTriggered) {
            console.log('Stopping clip:', clipId);
            stopClip(clipId);
        } else {
            console.log('Launching clip:', clipId);
            launchClip(clipId);
        }
    };

    const handleAssignClip = (clipId: string) => {
        assignClipToSlot(trackIndex, slotIndex, clipId);
    };

    const handleClearSlot = () => {
        assignClipToSlot(trackIndex, slotIndex, null);
    };

    // Empty slot with context menu
    if (isEmpty) {
        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div className="h-24 rounded-lg border-2 border-dashed border-border/20 bg-background/20 hover:border-border/40 hover:bg-background/30 transition-all cursor-pointer" />
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

    // Filled slot with context menu
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <button
                    className={cn(
                        "relative h-24 w-full rounded-lg border-2 cursor-pointer transition-all overflow-hidden",
                        "bg-gradient-to-b from-card to-card/60 shadow-lg",
                        isPlaying && "border-primary shadow-primary/50",
                        isTriggered && "border-accent shadow-accent/50 animate-pulse",
                        isStopping && "border-destructive shadow-destructive/50",
                        !isPlaying && !isTriggered && !isStopping && "border-border/70 hover:border-border"
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
                        borderColor: isPlaying || isTriggered || isStopping ? undefined : `${trackColor}60`,
                    }}
                >
            {/* Background gradient with track color */}
            <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    background: `linear-gradient(135deg, ${trackColor}40 0%, transparent 100%)`
                }}
            />

            {/* Clip content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3 gap-1.5 pointer-events-none">
                <span
                    className="text-sm font-bold uppercase tracking-wider truncate w-full text-center drop-shadow-sm"
                    style={{ color: trackColor }}
                >
                    {clip.name}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                    {clip.start_time.toFixed(1)} - {(clip.start_time + clip.duration).toFixed(1)}
                </span>
            </div>

            {/* Progress bar */}
            {(isPlaying || isTriggered) && (
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/40 pointer-events-none">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-accent transition-all shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                        style={{ width: `${progress * 100}%` }}
                    />
                </div>
            )}

            {/* Launch state indicator */}
            <div className="absolute top-2 right-2 pointer-events-none">
                {isPlaying && (
                    <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse" />
                )}
                {isTriggered && (
                    <div className="w-3 h-3 rounded-full bg-accent shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-pulse" />
                )}
                {isStopping && (
                    <div className="w-3 h-3 rounded-full bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />
                )}
            </div>
                </button>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
                <ContextMenuLabel>{clip.name}</ContextMenuLabel>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleClearSlot} className="gap-2 text-destructive">
                    <X size={14} />
                    <span>Clear Slot</span>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

