/**
 * ClipLauncherGrid Component
 *
 * Professional clip launcher grid matching Ableton Live Session View.
 * Follows MixerChannelList horizontal scrolling pattern.
 *
 * NO PROP DRILLING - Reads from Zustand store
 */

import { useDAWStore } from '@/stores/dawStore';
import { ClipSlot } from '../Slots/ClipSlot';
import { SceneTrigger } from '../Slots/SceneTrigger';
import { TrackStopButton } from '../Slots/TrackStopButton';

export function ClipLauncherGrid() {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const composition = useDAWStore((state) => state.activeComposition);
    const tracks = composition?.tracks ?? [];

    // Default to 8 slots per track (like Ableton Live)
    const numSlots = 8;

    // ========================================================================
    // EMPTY STATE
    // ========================================================================
    if (!composition) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-3 max-w-md">
                    <div className="text-6xl opacity-20">🎛️</div>
                    <p className="text-base font-bold text-foreground">No Composition Loaded</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Create or load a composition to use the clip launcher
                    </p>
                </div>
            </div>
        );
    }

    if (tracks.length === 0) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-3 max-w-md">
                    <div className="text-6xl opacity-20">🎹</div>
                    <p className="text-base font-bold text-foreground">No Tracks</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Add tracks in the sequencer to launch clips in the session view
                    </p>
                </div>
            </div>
        );
    }

    // ========================================================================
    // PROFESSIONAL GRID LAYOUT - Like Ableton Live Session View
    // ========================================================================
    return (
        <div className="h-full flex flex-col overflow-hidden bg-gradient-to-b from-background/50 to-background p-5">
            {/* Header Row - Track Names */}
            <div className="flex gap-3 mb-3 flex-shrink-0">
                {/* Scene column header - EXACT HEIGHT MATCH */}
                <div className="w-24 h-20 flex items-center justify-center rounded-lg border-2 border-border/30 bg-muted/20">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Scenes
                    </span>
                </div>

                {/* Track headers - EXACT HEIGHT MATCH */}
                {tracks.map((track) => (
                    <div
                        key={track.id}
                        className="w-48 h-20 rounded-lg border-2 p-2.5 flex flex-col justify-between shadow-lg transition-all hover:shadow-xl hover:scale-[1.01]"
                        style={{
                            backgroundColor: `${track.color}18`,
                            borderColor: `${track.color}60`,
                        }}
                    >
                        {/* Track name */}
                        <div
                            className="text-xs font-black uppercase tracking-wider truncate text-center leading-tight"
                            style={{ color: track.color }}
                            title={track.name}
                        >
                            {track.name}
                        </div>

                        {/* Track type badge */}
                        <div className="flex justify-center">
                            <span
                                className="rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest"
                                style={{
                                    backgroundColor: `${track.color}30`,
                                    color: track.color,
                                    border: `2px solid ${track.color}70`,
                                }}
                            >
                                {track.type}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Scrollable Grid Content */}
            <div className="flex-1 overflow-x-auto overflow-y-auto">
                <div className="flex gap-3">
                    {/* Scene Column */}
                    <div className="flex flex-col gap-3 flex-shrink-0">
                        {/* Scene triggers */}
                        {Array.from({ length: numSlots }).map((_, slotIndex) => (
                            <div key={slotIndex} className="w-24">
                                <SceneTrigger sceneIndex={slotIndex} />
                            </div>
                        ))}

                        {/* Stop All button placeholder */}
                        <div className="h-14" />
                    </div>

                    {/* Track Columns */}
                    {tracks.map((track, trackIndex) => (
                        <div key={track.id} className="flex flex-col gap-3 flex-shrink-0">
                            {/* Clip Slots */}
                            {Array.from({ length: numSlots }).map((_, slotIndex) => (
                                <div key={slotIndex} className="w-48">
                                    <ClipSlot trackIndex={trackIndex} slotIndex={slotIndex} />
                                </div>
                            ))}

                            {/* Track Stop Button */}
                            <div className="w-48">
                                <TrackStopButton trackId={track.id} trackColor={track.color} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

