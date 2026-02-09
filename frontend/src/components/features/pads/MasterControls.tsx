/**
 * MasterControls - Master volume, quantize, and quick guide
 */

import { useState } from "react";
import { Volume2, Grid3x3, HelpCircle, ChevronUp, ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

interface MasterControlsProps {
    masterVolume: number;
    quantizeEnabled: boolean;
    onMasterVolumeChange: (volume: number) => void;
    onQuantizeToggle: () => void;
}

export function MasterControls({
    masterVolume,
    quantizeEnabled,
    onMasterVolumeChange,
    onQuantizeToggle,
}: MasterControlsProps) {
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    return (
        <>
            {/* Master Controls */}
            <div className="space-y-3">
                <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase">
                    <Volume2 className="h-3.5 w-3.5" />
                    Master Controls
                </div>
                <div className="bg-accent/5 border-accent/10 space-y-3 rounded-lg border p-3">
                    {/* Master Volume */}
                    <div className="space-y-1.5">
                        <label className="text-muted-foreground text-xs tracking-wider uppercase">
                            Master Volume
                        </label>
                        <Slider
                            value={masterVolume}
                            min={0}
                            max={1}
                            step={0.01}
                            onChange={onMasterVolumeChange}
                        />
                        <div className="text-accent text-center font-mono text-xs font-bold">
                            {Math.round(masterVolume * 100)}%
                        </div>
                    </div>

                    {/* Quantize */}
                    <div className="space-y-1.5">
                        <label className="text-muted-foreground text-xs tracking-wider uppercase">
                            Quantize
                        </label>
                        <Button
                            size="sm"
                            variant={quantizeEnabled ? "default" : "outline"}
                            onClick={onQuantizeToggle}
                            className="w-full gap-2"
                        >
                            <Grid3x3 className="h-3.5 w-3.5" />
                            {quantizeEnabled ? "ON" : "OFF"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Quick Guide - Collapsible */}
            <div className="space-y-3">
                <button
                    onClick={() => setIsGuideOpen(!isGuideOpen)}
                    className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between text-xs font-medium tracking-[0.15em] uppercase transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <HelpCircle className="h-3.5 w-3.5" />
                        Quick Guide
                    </div>
                    {isGuideOpen ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                    )}
                </button>
                {isGuideOpen && (
                    <div className="bg-primary/5 border-primary/10 animate-in slide-in-from-top-2 rounded-lg border p-3">
                        <div className="text-muted-foreground space-y-1.5 text-[10px] leading-relaxed">
                            <div>• <span className="text-foreground font-medium">Drag samples</span> from library onto pads</div>
                            <div>• <span className="text-foreground font-medium">Click pads</span> to trigger samples</div>
                            <div>• <span className="text-foreground font-medium">Keyboard keys</span> (Q-R, A-F, Z-V, 1-4) to trigger</div>
                            <div>• <span className="text-foreground font-medium">Select pad</span> to edit parameters</div>
                            <div>• <span className="text-foreground font-medium">Choke groups</span> mute each other (like hi-hats)</div>
                            <div>• <span className="text-foreground font-medium">Gate mode</span>: hold key to play, release to stop</div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

