/**
 * ClipLauncherGrid - Professional clip launcher grid layout
 *
 * FOLLOWS EXACT MIXER PATTERN:
 * - Horizontal flex layout with gap-4
 * - Fixed width columns (like MixerChannelStrip w-56)
 * - Proper card styling with borders, gradients, shadows
 * - Scene column on left, track columns, scrollable
 */

import React from 'react';
import { useDAWStore } from '@/stores/dawStore';
import { ClipLauncherSlot } from '../Clips/ClipLauncherSlot';
import { ClipLauncherScene } from '../Scenes/ClipLauncherScene';
import { ClipLauncherTrackStop } from '../Clips/ClipLauncherTrackStop';

export function ClipLauncherGrid() {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);
    const numSlots = useDAWStore(state => state.numClipSlots);

    // ========================================================================
    // RENDER: EXACT MIXER PATTERN - Horizontal flex layout
    // ========================================================================
    return (
        <div className="flex h-full gap-4 overflow-x-auto overflow-y-hidden bg-gradient-to-b from-background/50 to-background p-5">
            {/* Scene Column - Fixed on left */}
            <div className="flex w-20 flex-shrink-0 flex-col gap-3">
                {/* Scene Header */}
                <div className="flex h-12 items-center justify-center rounded-lg border border-border/70 bg-gradient-to-b from-card to-card/60 px-3 shadow-lg">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Scenes
                    </span>
                </div>

                {/* Scene Triggers */}
                {Array.from({ length: numSlots }).map((_, slotIndex) => (
                    <div key={slotIndex} className="h-16">
                        <ClipLauncherScene sceneIndex={slotIndex} />
                    </div>
                ))}
            </div>

            {/* Track Columns - Scrollable */}
            {tracks.map((track, trackIndex) => (
                <div key={track.id} className="flex w-56 flex-shrink-0 flex-col gap-3">
                    {/* Track Header */}
                    <div className="flex h-12 flex-col gap-1.5 rounded-lg border border-border/70 bg-gradient-to-b from-card to-card/60 p-2 shadow-lg">
                        {/* Track Name */}
                        <div
                            className="truncate text-center text-xs font-bold uppercase tracking-wider drop-shadow-sm"
                            style={{ color: track.color }}
                            title={track.name}
                        >
                            {track.name}
                        </div>

                        {/* Track Type Badge */}
                        <div className="flex justify-center">
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
                        </div>
                    </div>

                    {/* Clip Slots */}
                    {Array.from({ length: numSlots }).map((_, slotIndex) => (
                        <div key={slotIndex} className="h-16">
                            <ClipLauncherSlot trackIndex={trackIndex} slotIndex={slotIndex} />
                        </div>
                    ))}

                    {/* Track Stop Button */}
                    <div className="h-10">
                        <ClipLauncherTrackStop trackId={track.id} trackColor={track.color} />
                    </div>
                </div>
            ))}
        </div>
    );
}

