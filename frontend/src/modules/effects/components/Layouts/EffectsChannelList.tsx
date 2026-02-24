/**
 * EffectsChannelList - Layout component for effects channel strips
 *
 * REFACTORED: Pure layout component using Zustand best practices
 * - No prop drilling - child components read from store directly
 * - Only manages layout and rendering
 *
 * Displays horizontal scrollable list of effects columns (one per track) with master effects column.
 */

import { useDAWStore } from '@/stores/dawStore.ts';
import { EffectsChannelStrip } from "../Channel/EffectsChannelStrip.tsx";
import { EffectsMasterSection } from "../Master/EffectsMasterSection.tsx";

export function EffectsChannelList() {
    // ========================================================================
    // STATE: Read from Zustand store (only for layout logic)
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);

    return (
        <div className="flex h-full gap-4 overflow-x-auto overflow-y-hidden bg-gradient-to-b from-background/50 to-background p-5">
            {/* Empty State Message (when no tracks) */}
            {tracks.length === 0 && (
                <div className="flex flex-1 items-center justify-center">
                    <div className="text-center space-y-3 max-w-sm">
                        <div className="text-6xl opacity-20">⚡</div>
                        <p className="text-base font-bold text-foreground">No Effects Channels</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Add tracks in the sequencer to see their effects chains with up to 8 insert effects per track
                        </p>
                    </div>
                </div>
            )}

            {/* Effects Channel Strips (one per sequencer track) */}
            {tracks.map((track) => (
                <EffectsChannelStrip
                    key={track.id}
                    trackId={track.id}
                />
            ))}

            {/* Separator before master (only if there are tracks) */}
            {tracks.length > 0 && (
                <div className="flex items-center">
                    <div className="w-0.5 h-full bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
                </div>
            )}

            {/* Master Effects Section - ALWAYS VISIBLE */}
            <EffectsMasterSection />
        </div>
    );
}

