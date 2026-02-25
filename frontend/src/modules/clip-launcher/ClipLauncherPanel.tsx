/**
 * Clip Launcher Panel
 *
 * Professional clip launcher for live performance.
 * Displays clips in a grid for triggering scenes and individual clips.
 *
 * FOLLOWS EXACT MIXER/SEQUENCER PANEL PATTERN
 *
 * NOTE: Clip launch states (playing/triggered) are synced via WebSocket in WebSocketProvider.
 * No HTTP polling needed - WebSocket provides 60Hz real-time updates.
 */

import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { useDAWStore } from "@/stores/dawStore";
import { ClipLauncherToolbar } from "./components/Toolbars/ClipLauncherToolbar";
import { ClipLauncherGrid } from "./components/Grid/ClipLauncherGrid";

export function ClipLauncherPanel() {
    // Get state from Zustand store
    const activeComposition = useDAWStore(state => state.activeComposition);

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            {/* Clip Launcher Content - Flexible, takes all space */}
            <div className="flex-1 min-h-0 flex flex-col">
                <SubPanel title="CLIP LAUNCHER" showHeader={false} contentOverflow="hidden">
                    {/* Toolbar - Fixed */}
                    <div className="border-b-2 border-border/70 bg-gradient-to-b from-muted/30 to-muted/10 px-4 py-2.5 flex-shrink-0 shadow-sm">
                        <ClipLauncherToolbar />
                    </div>

                    {/* Grid - Flexible */}
                    <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-background/95">
                        <ClipLauncherGrid />
                    </div>
                </SubPanel>
            </div>
        </div>
    );
}

