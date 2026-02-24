/**
 * Mixer Panel
 *
 * Professional mixing console for sequencer tracks.
 * Displays sequencer tracks as mixer channels with faders, pan, mute/solo.
 */

import { useEffect } from "react";
import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { useDAWStore } from "@/stores/dawStore";
import { MixerToolbar } from "@/modules/mixer/components/Toolbars/MixerToolbar";
import { MixerChannelList } from "@/modules/mixer/components/Channel/MixerChannelList.tsx";

export function MixerPanel() {
    // Get state and actions from Zustand store
    const activeComposition = useDAWStore(state => state.activeComposition);
    const loadMaster = useDAWStore(state => state.loadMaster);

    // Load master channel when composition is active
    useEffect(() => {
        if (activeComposition) {
            loadMaster();
        }
    }, [activeComposition, loadMaster]);

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
                {/* Mixer Content - Flexible, takes all space */}
                <div className="flex-1 min-h-0 flex flex-col">
                    <SubPanel title="MIXER" showHeader={false} contentOverflow="hidden">
                        {/* Toolbar - Fixed */}
                        <div className="border-b-2 border-border/70 bg-gradient-to-b from-muted/30 to-muted/10 px-4 py-2.5 flex-shrink-0 shadow-sm">
                            <MixerToolbar />
                        </div>

                        {/* Channel List - Flexible */}
                        <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-background/95">
                            <MixerChannelList />
                        </div>
                    </SubPanel>
                </div>
            </div>
    );
}

