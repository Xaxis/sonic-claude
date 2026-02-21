/**
 * MixerChannelList - Layout component for mixer channel strips
 *
 * Displays horizontal scrollable list of channel strips (from sequencer tracks) with master channel
 *
 * ARCHITECTURE:
 * - Gets tracks from SequencerContext (sequencer owns tracks)
 * - Gets mixer state from MixerContext (mixer owns channels/master)
 * - Each track has a corresponding mixer channel (1:1 relationship)
 */

import { useDAWStore } from '@/stores/dawStore';
import { MixerChannelStrip } from "../components/Channel/MixerChannelStrip.tsx";
import { MixerMasterSection } from "../components/Master/MixerMasterSection.tsx";

export function MixerChannelList() {
    // Get tracks, master, and UI state from Zustand store
    const tracks = useDAWStore(state => state.tracks);
    const master = useDAWStore(state => state.master);
    const showMeters = useDAWStore(state => state.showMeters);

    return (
        <div className="flex h-full gap-4 overflow-x-auto overflow-y-hidden bg-gradient-to-b from-background/50 to-background p-5">
            {/* Empty State Message (when no tracks) */}
            {tracks.length === 0 && (
                <div className="flex flex-1 items-center justify-center">
                    <div className="text-center space-y-3 max-w-sm">
                        <div className="text-6xl opacity-20">🎚️</div>
                        <p className="text-base font-bold text-foreground">No Mixer Channels</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Add tracks in the sequencer to see them as mixer channels with faders, pan controls, and meters
                        </p>
                    </div>
                </div>
            )}

            {/* Channel Strips (from sequencer tracks) */}
            {tracks.map((track) => (
                <MixerChannelStrip
                    key={track.id}
                    track={track}
                    showMeters={showMeters}
                />
            ))}

            {/* Separator before master (only if there are tracks) */}
            {tracks.length > 0 && (
                <div className="flex items-center">
                    <div className="w-0.5 h-full bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
                </div>
            )}

            {/* Master Section - ALWAYS VISIBLE */}
            {master && (
                <MixerMasterSection
                    master={master}
                    showMeters={showMeters}
                />
            )}
        </div>
    );
}

