/**
 * ClipLauncherGrid - Hardware-style clip launcher grid
 *
 * INSPIRED BY HARDWARE:
 * - Ableton Push / Novation Launchpad / Akai APC
 * - Tight grid of RGB backlit pads
 * - Minimal gaps, uniform squares
 * - Dark surface with glowing buttons
 * - Track names on top, scene triggers on right
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
    // HARDWARE GRID LAYOUT - Blended with theme
    // ========================================================================
    const PAD_SIZE = 80;      // Square pads like hardware
    const GAP = 3;            // Minimal gap between pads
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
            {/* Hardware Surface - Blended with theme */}
            <div className="inline-flex flex-col rounded-xl bg-gradient-to-br from-card/60 via-card/40 to-card/30 p-5 shadow-xl border border-border/40 backdrop-blur-sm">

                {/* Track Names Row */}
                <div className="flex mb-4" style={{ gap: `${GAP}px` }}>
                    {/* Empty corner */}
                    <div style={{ width: PAD_SIZE }} />

                    {/* Track names */}
                    {displayTracks.map((track, idx) => (
                        <div
                            key={track.id}
                            className={cn(
                                "flex items-center justify-center text-[9px] font-bold uppercase tracking-wider truncate px-1 rounded-md border",
                                isEmpty(idx) ? "border-border/30 bg-muted/20" : "border-border/50 bg-card/40"
                            )}
                            style={{
                                width: PAD_SIZE,
                                height: 28,
                                color: isEmpty(idx) ? 'hsl(var(--muted-foreground))' : track.color,
                                textShadow: isEmpty(idx) ? 'none' : `0 0 8px ${track.color}60`,
                            }}
                            title={track.name}
                        >
                            {track.name}
                        </div>
                    ))}

                    {/* Scene label */}
                    <div
                        className="flex items-center justify-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground rounded-md border border-border/30 bg-muted/20"
                        style={{ width: PAD_SIZE, height: 28 }}
                    >
                        Scene
                    </div>
                </div>

                {/* Pad Grid */}
                <div className="flex flex-col" style={{ gap: `${GAP}px` }}>
                    {Array.from({ length: numSlots }).map((_, slotIndex) => (
                        <div key={slotIndex} className="flex" style={{ gap: `${GAP}px` }}>
                            {/* Row number */}
                            <div
                                className="flex items-center justify-center text-xs font-mono font-bold text-muted-foreground/60 rounded border border-border/30 bg-muted/10"
                                style={{ width: PAD_SIZE, height: PAD_SIZE }}
                            >
                                {slotIndex + 1}
                            </div>

                            {/* Clip pads */}
                            {displayTracks.map((track, trackIndex) => (
                                <div key={track.id} style={{ width: PAD_SIZE, height: PAD_SIZE }}>
                                    {isEmpty(trackIndex) ? (
                                        <div className="h-full w-full rounded border border-dashed border-border/20 bg-muted/5" />
                                    ) : (
                                        <ClipLauncherSlot trackIndex={trackIndex} slotIndex={slotIndex} />
                                    )}
                                </div>
                            ))}

                            {/* Scene trigger */}
                            <div style={{ width: PAD_SIZE, height: PAD_SIZE }}>
                                <ClipLauncherScene sceneIndex={slotIndex} />
                            </div>
                        </div>
                    ))}

                    {/* Stop buttons row */}
                    <div className="flex mt-3 pt-3 border-t border-border/30" style={{ gap: `${GAP}px` }}>
                        {/* Empty corner */}
                        <div style={{ width: PAD_SIZE }} />

                        {/* Track stop buttons */}
                        {displayTracks.map((track, idx) => (
                            <div key={track.id} style={{ width: PAD_SIZE, height: 36 }}>
                                {isEmpty(idx) ? (
                                    <div className="h-full w-full rounded border border-dashed border-border/20 bg-muted/5" />
                                ) : (
                                    <ClipLauncherTrackStop trackId={track.id} trackColor={track.color} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

