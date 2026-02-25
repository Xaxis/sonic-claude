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

import React from 'react';
import { useDAWStore } from '@/stores/dawStore';
import { ClipLauncherSlot } from '../Clips/ClipLauncherSlot';
import { ClipLauncherScene } from '../Scenes/ClipLauncherScene';
import { ClipLauncherTrackStop } from '../Clips/ClipLauncherTrackStop';
import { cn } from '@/lib/utils';

export function ClipLauncherGrid() {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);
    const numSlots = useDAWStore(state => state.numClipSlots);

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
            <div className="flex w-24 flex-shrink-0 flex-col gap-3 rounded-lg border border-border/70 bg-gradient-to-b from-card to-card/60 p-3 shadow-lg">
                {/* Scene Header - SAME HEIGHT AS TRACK HEADERS */}
                <div className="flex h-14 items-center justify-center border-b border-border/30 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Scenes
                    </span>
                </div>

                {/* Scene Triggers */}
                <div className="flex flex-col gap-2">
                    {Array.from({ length: numSlots }).map((_, slotIndex) => (
                        <div key={slotIndex} className="h-20">
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
                    {/* Track Header - Same as MixerChannelStrip - FIXED HEIGHT */}
                    <div className="flex h-14 flex-col gap-1.5 border-b border-border/30 pb-2.5">
                        {/* Track Name */}
                        <div
                            className="truncate text-center text-xs font-bold uppercase tracking-wider drop-shadow-sm"
                            style={{ color: isEmpty(trackIndex) ? 'hsl(var(--muted-foreground))' : track.color }}
                            title={track.name}
                        >
                            {track.name}
                        </div>

                        {/* Track Type Badge - Always render to maintain height */}
                        <div className="flex justify-center">
                            {!isEmpty(trackIndex) ? (
                                <span
                                    className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm"
                                    style={{
                                        backgroundColor: `${track.color}20`,
                                        color: track.color,
                                        border: `1px solid ${track.color}40`
                                    }}
                                >
                                    {track.type}
                                </span>
                            ) : (
                                <span className="h-[18px]" /> // Spacer to maintain height
                            )}
                        </div>
                    </div>

                    {/* Clip Slots */}
                    <div className="flex flex-col gap-2">
                        {Array.from({ length: numSlots }).map((_, slotIndex) => (
                            <div key={slotIndex} className="h-20">
                                {isEmpty(trackIndex) ? (
                                    <div className="h-full w-full rounded-md border border-dashed border-border/20 bg-muted/5" />
                                ) : (
                                    <ClipLauncherSlot trackIndex={trackIndex} slotIndex={slotIndex} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Track Stop Button */}
                    <div className="h-10 border-t border-border/30 pt-2">
                        {isEmpty(trackIndex) ? (
                            <div className="h-full w-full rounded-md border border-dashed border-border/20 bg-muted/5" />
                        ) : (
                            <ClipLauncherTrackStop trackId={track.id} trackColor={track.color} />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

