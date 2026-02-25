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

export function ClipLauncherGrid() {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);
    const numSlots = useDAWStore(state => state.numClipSlots);

    // ========================================================================
    // HARDWARE GRID LAYOUT
    // ========================================================================
    const PAD_SIZE = 72;  // Square pads like hardware
    const GAP = 2;        // Minimal gap between pads

    return (
        <div className="h-full overflow-auto p-6 bg-black/95">
            {/* Hardware Surface */}
            <div className="inline-block rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-4 shadow-2xl border border-zinc-800">

                {/* Track Names Row */}
                <div className="flex gap-2 mb-3">
                    {/* Empty corner */}
                    <div style={{ width: PAD_SIZE }} />

                    {/* Track names */}
                    {tracks.map((track) => (
                        <div
                            key={track.id}
                            className="flex items-center justify-center text-[9px] font-bold uppercase tracking-wider truncate px-1"
                            style={{
                                width: PAD_SIZE,
                                color: track.color,
                                textShadow: `0 0 8px ${track.color}80`
                            }}
                            title={track.name}
                        >
                            {track.name}
                        </div>
                    ))}

                    {/* Scene label */}
                    <div
                        className="flex items-center justify-center text-[9px] font-bold uppercase tracking-wider text-zinc-500"
                        style={{ width: PAD_SIZE }}
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
                                className="flex items-center justify-center text-xs font-mono font-bold text-zinc-600"
                                style={{ width: PAD_SIZE, height: PAD_SIZE }}
                            >
                                {slotIndex + 1}
                            </div>

                            {/* Clip pads */}
                            {tracks.map((track, trackIndex) => (
                                <div key={track.id} style={{ width: PAD_SIZE, height: PAD_SIZE }}>
                                    <ClipLauncherSlot trackIndex={trackIndex} slotIndex={slotIndex} />
                                </div>
                            ))}

                            {/* Scene trigger */}
                            <div style={{ width: PAD_SIZE, height: PAD_SIZE }}>
                                <ClipLauncherScene sceneIndex={slotIndex} />
                            </div>
                        </div>
                    ))}

                    {/* Stop buttons row */}
                    <div className="flex mt-2" style={{ gap: `${GAP}px` }}>
                        {/* Empty corner */}
                        <div style={{ width: PAD_SIZE }} />

                        {/* Track stop buttons */}
                        {tracks.map((track) => (
                            <div key={track.id} style={{ width: PAD_SIZE, height: 32 }}>
                                <ClipLauncherTrackStop trackId={track.id} trackColor={track.color} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

