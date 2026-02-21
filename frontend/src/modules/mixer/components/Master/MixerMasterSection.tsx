/**
 * MixerMasterSection - Master channel strip component
 *
 * Displays the master channel with fader, meters, and limiter controls
 * Visually distinct from regular channels (wider, different color)
 */

import { Fader } from "@/components/ui/fader.tsx";
import { Meter } from "@/components/ui/meter.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { useDAWStore } from '@/stores/dawStore';
import { formatDb } from "@/lib/audio-utils";
import { cn } from "@/lib/utils";
import type { MasterChannel } from "../../types.ts";

interface MixerMasterSectionProps {
    master: MasterChannel;
    showMeters: boolean;
}

export function MixerMasterSection({ master, showMeters }: MixerMasterSectionProps) {
    const meters = useDAWStore(state => state.meters);
    const updateMasterFader = useDAWStore(state => state.updateMasterFader);
    const toggleLimiter = useDAWStore(state => state.toggleLimiter);
    const setLimiterThreshold = useDAWStore(state => state.setLimiterThreshold);

    // Get real-time meter data for master
    const masterMeter = meters["master"];
    const peakLeft = masterMeter?.peakLeft ?? master.meter_peak_left;
    const peakRight = masterMeter?.peakRight ?? master.meter_peak_right;

    return (
        <div className="flex w-44 flex-shrink-0 flex-col gap-3 rounded-lg border-2 border-primary/60 bg-gradient-to-b from-primary/10 via-card to-card/80 p-4 shadow-2xl">
            {/* Master Label */}
            <div className="flex flex-col items-center gap-1.5 border-b-2 border-primary/30 pb-3">
                <div className="text-center text-sm font-black uppercase tracking-widest text-primary drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">
                    {master.name}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary/70">
                    Main Output
                </div>
            </div>

            {/* Meter */}
            {showMeters && (
                <div className="flex justify-center rounded-md bg-black/40 p-3 shadow-inner border border-primary/20">
                    <Meter
                        peak={peakLeft}
                        peakRight={peakRight}
                        stereo={true}
                        className="h-56"
                    />
                </div>
            )}

            {/* Limiter Controls */}
            <div className="space-y-2.5 rounded-md border-2 border-primary/30 bg-gradient-to-b from-primary/5 to-background/60 p-3 shadow-md">
                <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-primary">
                        Limiter
                    </Label>
                    <Button
                        onClick={toggleLimiter}
                        variant={master.limiter_enabled ? "default" : "outline"}
                        size="sm"
                        className={cn(
                            "h-6 px-2.5 text-[10px] font-bold",
                            master.limiter_enabled && "shadow-[0_0_10px_rgba(0,245,255,0.5)]"
                        )}
                    >
                        {master.limiter_enabled ? "ON" : "OFF"}
                    </Button>
                </div>
                {master.limiter_enabled && (
                    <div className="space-y-2">
                        <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Threshold
                        </Label>
                        <div className="flex items-center gap-2">
                            <Slider
                                value={[master.limiter_threshold]}
                                onValueChange={(values) => setLimiterThreshold(values[0])}
                                min={-12}
                                max={0}
                                step={0.1}
                                className="flex-1"
                            />
                            <span className="w-14 text-right text-[10px] font-mono font-bold text-primary">
                                {formatDb(master.limiter_threshold)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Fader Section */}
            <div className="flex flex-1 flex-col gap-2 rounded-md bg-gradient-to-b from-background/50 to-background/30 p-3 border-2 border-primary/20">
                {/* Volume Display */}
                <div className="text-center text-sm font-mono font-black text-primary drop-shadow-[0_0_6px_rgba(0,245,255,0.3)] tracking-tight">
                    {formatDb(master.fader)}
                </div>

                {/* Fader */}
                <div className="flex flex-1 justify-center">
                    <Fader
                        value={master.fader}
                        onChange={updateMasterFader}
                        min={-60}
                        max={12}
                        className="flex-1"
                    />
                </div>
            </div>
        </div>
    );
}

