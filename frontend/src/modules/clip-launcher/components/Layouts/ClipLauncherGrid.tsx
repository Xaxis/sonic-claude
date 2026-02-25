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
import { TrackStopButton } from '../Slots/TrackStopButton';
import { MixerButton } from '@/modules/mixer/components/Channel/MixerButton';

export function ClipLauncherGrid() {
    // Read from store (no prop drilling)
    const composition = useDAWStore((state) => state.activeComposition);
    const tracks = composition?.tracks ?? [];
    const muteTrack = useDAWStore((state) => state.muteTrack);
    const soloTrack = useDAWStore((state) => state.soloTrack);

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

    // PROFESSIONAL CLIP LAUNCHER GRID - Like Ableton Live Session View
    return (
        <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-background via-background to-background/95">
            {/* STICKY HEADER ROW - ALWAYS VISIBLE */}
            <div className="flex gap-2 px-6 pt-4 pb-4 flex-shrink-0 border-b-2 border-border/50 bg-background shadow-lg z-10">
                {/* Scene column header */}
                <div className="w-20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Scenes
                    </span>
                </div>

                {/* Track headers - PROFESSIONAL */}
                {tracks.map((track) => (
                    <div
                        key={track.id}
                        className="w-56 flex flex-col gap-2 border rounded-lg px-3 py-2.5 flex-shrink-0 shadow-sm"
                        style={{
                            backgroundColor: `${track.color}10`,
                            borderColor: `${track.color}30`,
                        }}
                    >
                        {/* Track name - LARGE AND BOLD */}
                        <div
                            className="text-sm font-bold truncate text-center"
                            style={{ color: track.color }}
                            title={track.name}
                        >
                            {track.name}
                        </div>

                        {/* Track controls - SOLO/MUTE + TYPE BADGE */}
                        <div className="flex items-center justify-between gap-2">
                            {/* Solo/Mute buttons */}
                            <div className="flex gap-1">
                                <MixerButton
                                    variant="solo"
                                    active={track.is_solo ?? false}
                                    onClick={() => soloTrack(track.id, !(track.is_solo ?? false))}
                                />
                                <MixerButton
                                    variant="mute"
                                    active={track.is_muted ?? false}
                                    onClick={() => muteTrack(track.id, !(track.is_muted ?? false))}
                                />
                            </div>

                            {/* Track type badge */}
                            <span
                                className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                                style={{
                                    backgroundColor: `${track.color}20`,
                                    color: track.color,
                                    border: `1px solid ${track.color}40`,
                                }}
                            >
                                {track.type}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* SCROLLABLE GRID CONTENT */}
            <div className="flex-1 overflow-x-auto overflow-y-auto">
                <div className="flex flex-col gap-2 px-6 pt-4 pb-6 min-w-min">
                    {/* Rows (scenes) */}
                    {Array.from({ length: numSlots }).map((_, slotIndex) => (
                        <div key={slotIndex} className="flex gap-2">
                            {/* Scene trigger */}
                            <div className="w-20 flex-shrink-0">
                                <SceneTrigger sceneIndex={slotIndex} />
                            </div>

                            {/* Clip slots for this row */}
                            {tracks.map((track, trackIndex) => (
                                <div key={track.id} className="w-56 flex-shrink-0">
                                    <ClipSlot trackIndex={trackIndex} slotIndex={slotIndex} />
                                </div>
                            ))}
                        </div>
                    ))}

                    {/* Track footer row - STOP BUTTONS */}
                    <div className="flex gap-2 mt-4">
                        {/* Empty space for scene column */}
                        <div className="w-20 flex-shrink-0" />

                        {/* Stop buttons for each track */}
                        {tracks.map((track) => (
                            <div key={track.id} className="w-56 flex-shrink-0">
                                <TrackStopButton trackId={track.id} trackColor={track.color} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

