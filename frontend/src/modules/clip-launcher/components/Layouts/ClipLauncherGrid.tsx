/**
 * ClipLauncherGrid Component
 * 
 * Main grid layout for clip launcher.
 * Matches MixerChannelList horizontal scrolling pattern.
 * 
 * NO PROP DRILLING - Reads from Zustand store
 */

import { useDAWStore } from '@/stores/dawStore';
import { ClipSlot } from '../Slots/ClipSlot';
import { SceneTrigger } from '../Slots/SceneTrigger';

export function ClipLauncherGrid() {
    // Read from store (no prop drilling)
    const composition = useDAWStore((state) => state.activeComposition);
    const tracks = composition?.tracks ?? [];

    // Default to 8 slots per track
    const numSlots = 8;
    const numTracks = tracks.length || 0;

    if (numTracks === 0) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="text-6xl opacity-20">🎹</div>
                    <p className="text-lg font-bold text-muted-foreground">No Tracks</p>
                    <p className="text-sm text-muted-foreground">
                        Create tracks in the COMPOSE tab first
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-x-auto overflow-y-auto">
            <div className="flex gap-4 p-4 min-w-min">
                {/* Scene column */}
                <div className="flex flex-col gap-3 flex-shrink-0">
                    {/* Header */}
                    <div className="h-20 flex items-center justify-center border-b-2 border-border/30 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Scenes
                        </span>
                    </div>

                    {/* Scene triggers */}
                    <div className="flex flex-col gap-3 w-24">
                        {Array.from({ length: numSlots }).map((_, slotIndex) => (
                            <SceneTrigger key={slotIndex} sceneIndex={slotIndex} />
                        ))}
                    </div>
                </div>

                {/* Track columns */}
                {tracks.map((track, trackIndex) => (
                    <div key={track.id} className="flex flex-col gap-3 flex-shrink-0">
                        {/* Track header */}
                        <div className="h-20 flex flex-col gap-1.5 border-b-2 border-border/30 pb-2">
                            {/* Track name */}
                            <div
                                className="text-sm font-bold uppercase tracking-wider truncate text-center drop-shadow-sm"
                                style={{ color: track.color }}
                                title={track.name}
                            >
                                {track.name}
                            </div>

                            {/* Track type badge */}
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

                        {/* Clip slots */}
                        <div className="flex flex-col gap-3 w-40">
                            {Array.from({ length: numSlots }).map((_, slotIndex) => (
                                <ClipSlot key={slotIndex} trackIndex={trackIndex} slotIndex={slotIndex} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

