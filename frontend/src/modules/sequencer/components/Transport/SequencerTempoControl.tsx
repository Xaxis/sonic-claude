/**
 * SequencerTempoControl - BPM slider component for transport
 *
 * Professional DAW-style tempo control with slider and numeric display.
 * Follows established UI/UX patterns with Zustand store integration.
 */

import { Label } from "@/components/ui/label.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { useDAWStore } from '@/stores/dawStore';

export function SequencerTempoControl() {
    // Read tempo from Zustand store
    const tempo = useDAWStore((state) => state.activeComposition?.tempo ?? 120);
    
    // Get setTempo action from Zustand store
    const setTempo = useDAWStore((state) => state.setTempo);

    const handleTempoChange = (values: number[]) => {
        const newTempo = values[0];
        setTempo(newTempo);
    };

    return (
        <div className="flex items-center gap-3 min-w-[180px]">
            <Label htmlFor="tempo-slider" className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                BPM
            </Label>
            
            <div className="flex-1 flex items-center gap-2">
                {/* Slider */}
                <Slider
                    id="tempo-slider"
                    value={[tempo]}
                    onValueChange={handleTempoChange}
                    min={20}
                    max={300}
                    step={1}
                    className="flex-1"
                />
                
                {/* Numeric Display */}
                <div className="text-sm font-mono font-bold text-primary min-w-[3ch] text-right">
                    {Math.round(tempo)}
                </div>
            </div>
        </div>
    );
}

