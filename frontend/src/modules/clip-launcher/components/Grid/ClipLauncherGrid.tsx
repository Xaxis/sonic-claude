/**
 * ClipLauncherGrid - Professional clip launcher grid layout
 *
 * BEST PRACTICE: CSS Grid with sticky headers (like SequencerGridLayout)
 * - Single scroll container
 * - Sticky track headers at top
 * - Perfect alignment between headers and columns
 * - Consistent spacing throughout
 *
 * Architecture:
 * ┌──────────┬──────────┬──────────┬──────────┐
 * │ Scenes   │ Track 1  │ Track 2  │ Track 3  │ ← sticky headers
 * ├──────────┼──────────┼──────────┼──────────┤
 * │ Scene 1  │ Slot 1,1 │ Slot 2,1 │ Slot 3,1 │
 * │ Scene 2  │ Slot 1,2 │ Slot 2,2 │ Slot 3,2 │
 * │ Scene 3  │ Slot 1,3 │ Slot 2,3 │ Slot 3,3 │
 * ├──────────┼──────────┼──────────┼──────────┤
 * │          │ Stop 1   │ Stop 2   │ Stop 3   │
 * └──────────┴──────────┴──────────┴──────────┘
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
    // LAYOUT CONSTANTS - Professional sizing
    // ========================================================================
    const SCENE_COLUMN_WIDTH = 80;
    const TRACK_COLUMN_WIDTH = 160;
    const HEADER_HEIGHT = 56;
    const SLOT_HEIGHT = 64;
    const STOP_BUTTON_HEIGHT = 40;
    const GAP = 8;

    // ========================================================================
    // GRID LAYOUT - CSS Grid with sticky headers
    // ========================================================================
    return (
        <div className="h-full overflow-auto p-4 bg-gradient-to-b from-background/50 to-background">
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `${SCENE_COLUMN_WIDTH}px repeat(${tracks.length}, ${TRACK_COLUMN_WIDTH}px)`,
                    gap: `${GAP}px`,
                    minHeight: '100%',
                }}
            >
                {/* ============================================================ */}
                {/* HEADER ROW - Sticky at top */}
                {/* ============================================================ */}
                
                {/* Scene column header */}
                <div
                    className="flex items-center justify-center rounded-md border border-border/50 bg-background"
                    style={{
                        position: 'sticky',
                        top: 0,
                        height: `${HEADER_HEIGHT}px`,
                        zIndex: 40,
                    }}
                >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Scenes
                    </span>
                </div>

                {/* Track headers */}
                {tracks.map((track) => (
                    <div
                        key={track.id}
                        className="rounded-md border p-2 flex flex-col justify-between shadow-sm transition-all hover:border-border"
                        style={{
                            position: 'sticky',
                            top: 0,
                            height: `${HEADER_HEIGHT}px`,
                            backgroundColor: `color-mix(in srgb, ${track.color} 15%, var(--color-background))`,
                            borderColor: `color-mix(in srgb, ${track.color} 50%, transparent)`,
                            zIndex: 20,
                        }}
                    >
                        {/* Track name */}
                        <div
                            className="text-[11px] font-bold uppercase tracking-wide truncate text-center"
                            style={{ color: track.color }}
                            title={track.name}
                        >
                            {track.name}
                        </div>

                        {/* Track type badge */}
                        <div className="flex justify-center">
                            <span
                                className="rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                                style={{
                                    backgroundColor: `color-mix(in srgb, ${track.color} 30%, transparent)`,
                                    color: track.color,
                                    border: `1px solid color-mix(in srgb, ${track.color} 60%, transparent)`,
                                }}
                            >
                                {track.type}
                            </span>
                        </div>
                    </div>
                ))}

                {/* ============================================================ */}
                {/* SLOT ROWS - One row per scene */}
                {/* ============================================================ */}
                {Array.from({ length: numSlots }).map((_, slotIndex) => (
                    <React.Fragment key={slotIndex}>
                        {/* Scene trigger */}
                        <div style={{ height: `${SLOT_HEIGHT}px` }}>
                            <ClipLauncherScene sceneIndex={slotIndex} />
                        </div>

                        {/* Clip slots for each track */}
                        {tracks.map((track, trackIndex) => (
                            <div key={track.id} style={{ height: `${SLOT_HEIGHT}px` }}>
                                <ClipLauncherSlot trackIndex={trackIndex} slotIndex={slotIndex} />
                            </div>
                        ))}
                    </React.Fragment>
                ))}

                {/* ============================================================ */}
                {/* STOP BUTTON ROW */}
                {/* ============================================================ */}
                
                {/* Empty cell for scene column */}
                <div style={{ height: `${STOP_BUTTON_HEIGHT}px` }} />

                {/* Track stop buttons */}
                {tracks.map((track) => (
                    <div key={track.id} style={{ height: `${STOP_BUTTON_HEIGHT}px` }}>
                        <ClipLauncherTrackStop trackId={track.id} trackColor={track.color} />
                    </div>
                ))}
            </div>
        </div>
    );
}

