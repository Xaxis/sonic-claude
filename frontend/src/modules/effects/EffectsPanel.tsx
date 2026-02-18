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
 * - Uses EffectsProvider context for state management
 * - Uses effectsService for API calls
 */

import { useEffect, useState, useCallback } from "react";
import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { useAudioEngine } from "@/contexts/AudioEngineContext.tsx";
import { useEffectsState } from "./hooks/useEffectsState";
import { useEffectsHandlers } from "./hooks/useEffectsHandlers";
import { EffectsProvider } from "./contexts/EffectsContext";
import { EffectsChannelList } from "./layouts/EffectsChannelList";
import { effectsService } from "@/services/effects";
import type { TrackEffectChain, EffectDefinition } from "@/services/effects";

export function EffectsPanel() {
    // Get sequencer tracks from AudioEngine context
    const { sequencerTracks, activeSequenceId, loadSequencerTracks } = useAudioEngine();

    // UI State
    const { state, actions } = useEffectsState();

    // Backend Data State
    const [effectChains, setEffectChains] = useState<Record<string, TrackEffectChain>>({});
    const [effectDefinitions, setEffectDefinitions] = useState<EffectDefinition[]>([]);

    // Load tracks when active sequence changes
    useEffect(() => {
        if (activeSequenceId) {
            loadSequencerTracks(activeSequenceId);
        }
    }, [activeSequenceId, loadSequencerTracks]);

    // Load effect definitions on mount
    useEffect(() => {
        const loadDefinitions = async () => {
            try {
                const defs = await effectsService.getEffectDefinitions();
                setEffectDefinitions(defs);
            } catch (error) {
                console.error("Failed to load effect definitions:", error);
            }
        };
        loadDefinitions();
    }, []);

    // Load effect chains for all tracks
    const loadEffectChains = useCallback(async () => {
        if (!sequencerTracks || sequencerTracks.length === 0) {
            setEffectChains({});
            return;
        }

        try {
            const chains: Record<string, TrackEffectChain> = {};
            await Promise.all(
                sequencerTracks.map(async (track) => {
                    try {
                        const chain = await effectsService.getTrackEffectChain(track.id);
                        chains[track.id] = chain;
                    } catch (error) {
                        console.error(`Failed to load effect chain for track ${track.id}:`, error);
                    }
                })
            );
            setEffectChains(chains);
        } catch (error) {
            console.error("Failed to load effect chains:", error);
        }
    }, [sequencerTracks]);

    // Load effect chains when tracks change
    useEffect(() => {
        loadEffectChains();
    }, [loadEffectChains]);

    // Callback for when effect chain changes (used by handlers)
    const handleEffectChainChanged = useCallback(
        async (trackId: string) => {
            try {
                const chain = await effectsService.getTrackEffectChain(trackId);
                setEffectChains((prev) => ({
                    ...prev,
                    [trackId]: chain,
                }));
            } catch (error) {
                console.error(`Failed to reload effect chain for track ${trackId}:`, error);
            }
        },
        []
    );

    // Event handlers
    const handlers = useEffectsHandlers({
        tracks: sequencerTracks || [],
        onEffectChainChanged: handleEffectChainChanged,
    });

    return (
        <EffectsProvider
            state={state}
            actions={actions}
            tracks={sequencerTracks || []}
            effectChains={effectChains}
            effectDefinitions={effectDefinitions}
            handlers={handlers}
        >
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
        </EffectsProvider>
    );
}
