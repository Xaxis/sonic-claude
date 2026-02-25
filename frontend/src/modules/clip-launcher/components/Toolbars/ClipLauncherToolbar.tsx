/**
 * ClipLauncherToolbar - Toolbar for clip launcher panel
 *
 * NO PROP DRILLING - Reads from Zustand store
 * Professional toolbar matching Mixer/Sequencer patterns
 */

import { useDAWStore } from '@/stores/dawStore';
import { Button } from '@/components/ui/button';
import { Plus, Grid3x3, Settings } from 'lucide-react';

export function ClipLauncherToolbar() {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const numClipSlots = useDAWStore(state => state.numClipSlots);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const setNumClipSlots = useDAWStore(state => state.setNumClipSlots);

    return (
        <div className="flex items-center justify-between">
            {/* Left: Actions */}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                >
                    <Plus size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                        Add Scene
                    </span>
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                >
                    <Grid3x3 size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                        Grid Size
                    </span>
                </Button>
            </div>

            {/* Right: Settings */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Scenes:</span>
                    <span className="text-primary">{numClipSlots}</span>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                >
                    <Settings size={14} />
                </Button>
            </div>
        </div>
    );
}

