/**
 * MixerChannelList - Layout component for mixer channel strips
 *
 * Displays horizontal scrollable list of channel strips (from sequencer tracks) with master channel
 * Uses MixerContext for state management
 */

import { useMixerContext } from "../contexts/MixerContext.tsx";
import { MixerChannelStrip } from "../components/Channel/MixerChannelStrip.tsx";
import { MixerMasterSection } from "../components/Master/MixerMasterSection.tsx";

export function MixerChannelList() {
    const { tracks, master, state } = useMixerContext();
    const { showMeters, meterMode } = state;

    return (
        <div className="flex h-full gap-3 overflow-x-auto overflow-y-hidden bg-background p-4">
            {/* Empty State Message (when no tracks) */}
            {tracks.length === 0 && (
                <div className="flex flex-1 items-center justify-center">
                    <div className="text-center space-y-2 max-w-xs">
                        <div className="text-4xl opacity-20">🎚️</div>
                        <p className="text-sm font-semibold text-foreground">No Tracks Yet</p>
                        <p className="text-xs text-muted-foreground">
                            Add tracks in the sequencer to see them as mixer channels
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
            {tracks.length > 0 && <div className="w-px bg-border/50" />}

            {/* Master Section - ALWAYS VISIBLE */}
            <MixerMasterSection
                master={master}
                showMeters={showMeters}
                meterMode={meterMode}
            />
        </div>
    );
}

