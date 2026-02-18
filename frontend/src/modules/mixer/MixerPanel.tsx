/**
 * Mixer Panel
 *
 * Professional mixing console for sequencer tracks.
 * Displays sequencer tracks as mixer channels with faders, pan, mute/solo.
 * Follows the same pattern as SequencerPanel and InputPanel.
 */

import { useEffect } from "react";
import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { useAudioEngine } from "@/contexts/AudioEngineContext.tsx";
import { useMixerState } from "./hooks/useMixerState";
import { useMixerHandlers } from "./hooks/useMixerHandlers";
import { MixerProvider } from "./contexts/MixerContext";
import { MixerToolbar } from "./components/Toolbar/MixerToolbar";
import { MixerChannelList } from "./layouts/MixerChannelList";
import { mixerService } from "@/services/mixer/mixer.service";
import { useMeterWebSocket } from "@/hooks/useMeterWebsocket";

export function MixerPanel() {
    // Get sequencer tracks from AudioEngine context
    const {
        sequencerTracks,
        activeSequenceId,
        loadSequencerTracks,
        updateSequencerTrack,
        muteSequencerTrack,
        soloSequencerTrack,
    } = useAudioEngine();

    // UI State
    const { state, actions } = useMixerState();

    // Real-time metering via WebSocket
    const { meters, isConnected: meterConnected } = useMeterWebSocket();

    // Load tracks when active sequence changes
    useEffect(() => {
        if (activeSequenceId) {
            loadSequencerTracks(activeSequenceId);
        }
    }, [activeSequenceId, loadSequencerTracks]);

    // Load master channel from backend ONCE on mount
    useEffect(() => {
        const loadMaster = async () => {
            try {
                const master = await mixerService.getMaster();
                actions.setMaster(master);
            } catch (error) {
                console.error("Failed to load master channel:", error);
            }
        };
        loadMaster();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    // Event handlers
    const handlers = useMixerHandlers({
        tracks: sequencerTracks || [],
        master: state.master,
        updateSequencerTrack,
        muteSequencerTrack,
        soloSequencerTrack,
        setMaster: actions.setMaster,
    });

    return (
        <MixerProvider
            state={state}
            actions={actions}
            tracks={sequencerTracks || []}
            master={state.master}
            handlers={handlers}
            meters={meters}
        >
            <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
                {/* Mixer Content - Flexible, takes all space */}
                <div className="flex-1 min-h-0 flex flex-col">
                    <SubPanel title="MIXER" showHeader={false} contentOverflow="hidden">
                        {/* Toolbar - Fixed */}
                        <div className="border-b border-border bg-muted/20 px-3 py-2 flex-shrink-0">
                            <MixerToolbar />
                        </div>

                        {/* Channel List - Flexible */}
                        <div className="flex-1 overflow-hidden">
                            <MixerChannelList />
                        </div>
                    </SubPanel>
                </div>
            </div>
        </MixerProvider>
    );
}

