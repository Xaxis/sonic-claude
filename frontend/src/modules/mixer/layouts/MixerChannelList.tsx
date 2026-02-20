/**
 * MixerChannelList - Layout component for mixer channel strips
 *
 * Displays horizontal scrollable list of channel strips (from sequencer tracks) with master channel
 * Uses MixerContext for state management
 */

import { useMixerContext } from '@/contexts/MixerContext';
import { MixerChannelStrip } from "../components/Channel/MixerChannelStrip.tsx";
import { MixerMasterSection } from "../components/Master/MixerMasterSection.tsx";

export function MixerChannelList() {
    const { tracks, master, state } = useMixerContext();
    const { showMeters, meterMode } = state;

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
                    meterMode={meterMode}
                />
            ))}

            {/* Separator before master (only if there are tracks) */}
            {tracks.length > 0 && (
                <div className="flex items-center">
                    <div className="w-0.5 h-full bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
                </div>
            )}

            {/* Master Section - ALWAYS VISIBLE */}
            <MixerMasterSection
                master={master}
                showMeters={showMeters}
                meterMode={meterMode}
            />
        </div>
    );
}

