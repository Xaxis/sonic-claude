/**
 * Effects Panel
 *
 * Horizontal multi-track effects panel that aligns 1:1 with MixerPanel.
 * Each track gets a vertical column showing its effects chain (up to 8 insert effects).
 * Designed to snap to MixerPanel's bottom edge for integrated workflow.
 *
 * Architecture:
 * - Follows MixerPanel pattern exactly (horizontal scrollable layout)
 * - One column per track (same width as mixer channels: w-36)
 * - Uses global EffectsContext for state management
 */

import { useEffect } from "react";
import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { useSequencer } from "@/contexts/SequencerContext";
import { useEffects } from "@/contexts/EffectsContext";
import { EffectsChannelList } from "./layouts/EffectsChannelList";

export function EffectsPanel() {
    // Get sequencer state from global Sequencer context
    const { activeSequenceId, loadTracks } = useSequencer();

    // Get effects methods from global Effects context
    const { loadEffectDefinitions } = useEffects();

    // Load tracks when active sequence changes
    useEffect(() => {
        if (activeSequenceId) {
            loadTracks(activeSequenceId);
        }
    }, [activeSequenceId, loadTracks]);

    // Load effect definitions on mount
    useEffect(() => {
        loadEffectDefinitions();
    }, [loadEffectDefinitions]);

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            {/* Effects Content - Flexible, takes all space */}
            <div className="flex-1 min-h-0 flex flex-col">
                <SubPanel title="EFFECTS" showHeader={false} contentOverflow="hidden">
                    {/* Channel List - Flexible */}
                    <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-background/95">
                        <EffectsChannelList />
                    </div>
                </SubPanel>
            </div>
        </div>
    );
}
