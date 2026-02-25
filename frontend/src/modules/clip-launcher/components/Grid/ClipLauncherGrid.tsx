/**
 * ClipLauncherGrid - Professional clip launcher grid layout
 *
 * FOLLOWS EXACT MIXER PATTERN:
 * - Horizontal scrollable layout with gap-4
 * - Scene column on left (like master channel)
 * - Track columns (like mixer channels)
 * - Proper card styling with theme colors
 * - Empty placeholders for missing tracks
 */

import React, { useEffect } from 'react';
import { useDAWStore } from '@/stores/dawStore';
import { ClipLauncherSlot } from '../Clips/ClipLauncherSlot';
import { ClipLauncherSlotAssignment } from '../Clips/ClipLauncherSlotAssignment';
import { ClipLauncherScene } from '../Scenes/ClipLauncherScene';
import { ClipLauncherTrackStop } from '../Clips/ClipLauncherTrackStop';
import { cn } from '@/lib/utils';
import { Square, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

// PROFESSIONAL HARDWARE COLOR PALETTE (same as PAD VIEW)
const HARDWARE_COLORS = [
    'hsl(187 100% 50%)',  // Cyan
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

export function ClipLauncherGrid() {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);
    const clipLauncherMode = useDAWStore(state => state.clipLauncherMode);
    const numSlots = useDAWStore(state => state.numClipSlots);
    const playingScenes = useDAWStore(state => state.playingScenes);
    const loadClipSlots = useDAWStore(state => state.loadClipSlots);

    // ========================================================================
    // EFFECTS: Load clip slots on mount
    // ========================================================================
    useEffect(() => {
        loadClipSlots();
    }, [loadClipSlots]);

    // ========================================================================
    // LAYOUT CONSTANTS - Match mixer pattern
    // ========================================================================
    const MIN_TRACKS = 8;     // Always show at least 8 track columns

    // Pad out tracks to minimum
    const displayTracks = [...tracks];
    while (displayTracks.length < MIN_TRACKS) {
        displayTracks.push({
            id: `empty-${displayTracks.length}`,
            name: `Track ${displayTracks.length + 1}`,
            color: 'hsl(220 10% 30%)',
            type: 'audio',
            volume: 0.8,
            pan: 0,
            muted: false,
            soloed: false,
            armed: false,
        } as any);
    }

    const isEmpty = (trackIndex: number) => trackIndex >= tracks.length;

    return (
        <div className="flex h-full gap-4 overflow-x-auto overflow-y-hidden bg-gradient-to-b from-background/50 to-background p-5">
            {/* Scene Column - Like master channel in mixer */}
            <div className="flex w-24 flex-shrink-0 flex-col gap-3 rounded-lg border border-border/70 bg-gradient-to-b from-card to-card/60 p-3 shadow-lg overflow-hidden">
                {/* Scene Header - Controls for all scenes */}
                <div className="flex flex-col gap-2 border-b border-border/30 pb-2.5">
                    {/* Label */}
                    <div className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Scenes
                    </div>

                    {/* Scene Controls */}
                    <div className="flex items-center justify-center gap-1">
                        {/* Stop All Scenes */}
                        <button
                            onClick={() => {
                                const stopScene = useDAWStore.getState().stopScene;
                                const playingScenes = useDAWStore.getState().playingScenes;
                                playingScenes.forEach(sceneIndex => stopScene(sceneIndex));
                                toast.success('Stopped all scenes');
                            }}
                            className={cn(
                                "w-6 h-6 rounded flex items-center justify-center transition-all",
                                playingScenes.length > 0
                                    ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                                    : "bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
                            )}
                            disabled={playingScenes.length === 0}
                            title="Stop all scenes"
                        >
                            <Square size={12} />
                        </button>

                        {/* Trigger Next Scene */}
                        <button
                            onClick={() => {
                                const triggerScene = useDAWStore.getState().triggerScene;
                                const playingScenes = useDAWStore.getState().playingScenes;
                                const nextScene = playingScenes.length > 0
                                    ? Math.max(...playingScenes) + 1
                                    : 0;
                                if (nextScene < numSlots) {
                                    triggerScene(nextScene);
                                    toast.success(`Triggered scene ${nextScene + 1}`);
                                }
                            }}
                            className="w-6 h-6 rounded flex items-center justify-center bg-muted/30 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all"
                            title="Trigger next scene"
                        >
                            <ChevronDown size={12} />
                        </button>

                        {/* Scene Count Badge */}
                        <div className="w-6 h-6 rounded flex items-center justify-center bg-primary/20 text-primary text-[9px] font-bold">
                            {numSlots}
                        </div>
                    </div>
                </div>

                {/* Scene Triggers - No individual scrolling */}
                <div className="flex flex-col gap-2">
                    {Array.from({ length: numSlots }).map((_, slotIndex) => (
                        <div key={slotIndex} className="h-20 flex-shrink-0">
                            <ClipLauncherScene sceneIndex={slotIndex} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Track Columns - Like mixer channels */}
            {displayTracks.map((track, trackIndex) => (
                <div
                    key={track.id}
                    className={cn(
                        "flex w-56 flex-shrink-0 flex-col gap-3 rounded-lg border shadow-lg",
                        isEmpty(trackIndex)
                            ? "border-border/30 bg-gradient-to-b from-muted/20 to-muted/10"
                            : "border-border/70 bg-gradient-to-b from-card to-card/60 hover:border-border transition-all"
                    )}
                    style={{ padding: '12px' }}
                >
                    {/* Track Header - Ableton Live Style with M/S/Arm buttons */}
                    <div className="flex flex-col gap-2 border-b pb-2.5" style={{
                        borderColor: isEmpty(trackIndex) ? 'hsl(var(--border))' : `${HARDWARE_COLORS[trackIndex % HARDWARE_COLORS.length]}60`
                    }}>
                        {/* Track Name with Hardware Color */}
                        <div
                            className="truncate text-center text-xs font-bold uppercase tracking-wider drop-shadow-sm"
                            style={{
                                color: isEmpty(trackIndex)
                                    ? 'hsl(var(--muted-foreground))'
                                    : HARDWARE_COLORS[trackIndex % HARDWARE_COLORS.length]
                            }}
                            title={track.name}
                        >
                            {track.name}
                        </div>

                        {/* M / S / Arm Buttons - Ableton Live Style */}
                        {!isEmpty(trackIndex) ? (
                            <div className="flex items-center justify-center gap-1">
                                {/* Mute Button */}
                                <button
                                    onClick={() => useDAWStore.getState().muteTrack(track.id)}
                                    className={cn(
                                        "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all",
                                        track.muted
                                            ? "bg-accent text-accent-foreground shadow-md"
                                            : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                    )}
                                    title="Mute track"
                                >
                                    M
                                </button>

                                {/* Solo Button */}
                                <button
                                    onClick={() => useDAWStore.getState().soloTrack(track.id)}
                                    className={cn(
                                        "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all",
                                        track.soloed
                                            ? "bg-primary text-primary-foreground shadow-md"
                                            : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                    )}
                                    title="Solo track"
                                >
                                    S
                                </button>

                                {/* Arm Button */}
                                <button
                                    onClick={() => useDAWStore.getState().armTrack(track.id)}
                                    className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                        track.armed
                                            ? "bg-destructive shadow-md shadow-destructive/50"
                                            : "bg-muted/30 hover:bg-muted/50"
                                    )}
                                    title="Arm track for recording"
                                >
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        track.armed ? "bg-white" : "bg-muted-foreground/50"
                                    )} />
                                </button>
                            </div>
                        ) : (
                            <div className="h-6" /> // Spacer to maintain height
                        )}
                    </div>

                    {/* Clip Slots - MODE-DEPENDENT RENDERING */}
                    <div className="flex flex-col gap-2">
                        {Array.from({ length: numSlots }).map((_, slotIndex) => (
                            <div key={slotIndex} className="h-20 flex-shrink-0">
                                {isEmpty(trackIndex) ? (
                                    <div className="h-full w-full rounded-md border border-dashed border-border/20 bg-muted/5" />
                                ) : clipLauncherMode === "pad" ? (
                                    <ClipLauncherSlot trackIndex={trackIndex} slotIndex={slotIndex} />
                                ) : (
                                    <ClipLauncherSlotAssignment trackIndex={trackIndex} slotIndex={slotIndex} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Track Stop Button */}
                    <div className="h-10 border-t border-border/30 pt-2">
                        {isEmpty(trackIndex) ? (
                            <div className="h-full w-full rounded-md border border-dashed border-border/20 bg-muted/5" />
                        ) : (
                            <ClipLauncherTrackStop
                                trackId={track.id}
                                trackColor={HARDWARE_COLORS[trackIndex % HARDWARE_COLORS.length]}
                            />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

