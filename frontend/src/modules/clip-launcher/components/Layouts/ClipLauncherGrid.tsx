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
        <div className="h-full overflow-x-auto overflow-y-auto bg-gradient-to-br from-background via-background to-background/95">
            <div className="flex gap-2 p-6 min-w-min">
                {/* Scene column - PROMINENT */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                    {/* Header */}
                    <div className="h-16 flex items-center justify-center border-b border-border/50 pb-3">
                        <span className="text-sm font-black uppercase tracking-widest text-foreground/80">
                            Scenes
                        </span>
                    </div>

                    {/* Scene triggers - LARGER */}
                    <div className="flex flex-col gap-2 w-28">
                        {Array.from({ length: numSlots }).map((_, slotIndex) => (
                            <SceneTrigger key={slotIndex} sceneIndex={slotIndex} />
                        ))}
                    </div>
                </div>

                {/* Track columns - WIDER AND MORE PROMINENT */}
                {tracks.map((track, trackIndex) => (
                    <div key={track.id} className="flex flex-col gap-2 flex-shrink-0">
                        {/* Track header - VIBRANT */}
                        <div
                            className="h-16 flex flex-col gap-1.5 border-b pb-3 rounded-t-md px-3 pt-2"
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

                        {/* Clip slots - LARGER PADS */}
                        <div className="flex flex-col gap-2 w-48">
                            {Array.from({ length: numSlots }).map((_, slotIndex) => (
                                <ClipSlot key={slotIndex} trackIndex={trackIndex} slotIndex={slotIndex} />
                            ))}
                        </div>

                        {/* Track footer - STOP BUTTON */}
                        <div className="w-48 mt-2">
                            <TrackStopButton trackId={track.id} trackColor={track.color} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

