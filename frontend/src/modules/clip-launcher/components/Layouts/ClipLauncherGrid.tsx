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
            {/* STICKY HEADER ROW */}
            <div className="flex gap-2 px-6 pt-6 pb-3 flex-shrink-0 border-b border-border/30 bg-background/95 backdrop-blur-sm">
                {/* Scene column header */}
                <div className="w-28 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-black uppercase tracking-widest text-foreground/80">
                        Scenes
                    </span>
                </div>

                {/* Track headers - VIBRANT */}
                {tracks.map((track) => (
                    <div
                        key={track.id}
                        className="w-48 flex flex-col gap-1.5 border-b pb-3 rounded-t-md px-3 pt-2 flex-shrink-0"
                        style={{
                            backgroundColor: `${track.color}15`,
                            borderColor: `${track.color}40`,
                        }}
                    >
                        {/* Track name - BOLD */}
                        <div
                            className="text-base font-black uppercase tracking-wide truncate text-center drop-shadow-sm"
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

                            {/* Track type badge - VIBRANT */}
                            <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-md"
                                style={{
                                    backgroundColor: `${track.color}dd`,
                                    color: 'white',
                                }}
                            >
                                {track.type}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* SCROLLABLE GRID CONTENT - ROW-BASED WITH ALTERNATING COLORS */}
            <div className="flex-1 overflow-x-auto overflow-y-auto">
                <div className="flex flex-col px-6 pt-4 pb-6 min-w-min">
                    {/* Rows (scenes) */}
                    {Array.from({ length: numSlots }).map((_, slotIndex) => (
                        <div
                            key={slotIndex}
                            className="flex gap-2 mb-2"
                            style={{
                                backgroundColor: slotIndex % 2 === 0
                                    ? 'rgba(255, 255, 255, 0.02)'
                                    : 'rgba(0, 0, 0, 0.15)',
                                borderRadius: '6px',
                                padding: '4px',
                            }}
                        >
                            {/* Scene trigger */}
                            <div className="w-28 flex-shrink-0">
                                <SceneTrigger sceneIndex={slotIndex} />
                            </div>

                            {/* Clip slots for this row */}
                            {tracks.map((track, trackIndex) => (
                                <div key={track.id} className="w-48 flex-shrink-0">
                                    <ClipSlot trackIndex={trackIndex} slotIndex={slotIndex} />
                                </div>
                            ))}
                        </div>
                    ))}

                    {/* Track footer row - STOP BUTTONS */}
                    <div className="flex gap-2 mt-4">
                        {/* Empty space for scene column */}
                        <div className="w-28 flex-shrink-0" />

                        {/* Stop buttons for each track */}
                        {tracks.map((track) => (
                            <div key={track.id} className="w-48 flex-shrink-0">
                                <TrackStopButton trackId={track.id} trackColor={track.color} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

