/**
 * MixerMasterSection - Master channel strip component
 *
 * Displays the master channel with fader, meters, and limiter controls
 * Visually distinct from regular channels (wider, different color)
 */

import { Fader } from "@/components/ui/fader.tsx";
import { Meter } from "@/components/ui/meter.tsx";
import { Toggle } from "@/components/ui/toggle.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { useMixerContext } from "../../contexts/MixerContext.tsx";
import { formatDb } from "@/lib/audio-utils";
import type { MasterChannel } from "../../types.ts";

interface MixerMasterSectionProps {
    master: MasterChannel;
    showMeters: boolean;
    meterMode: "peak" | "rms" | "both";
}

export function MixerMasterSection({ master, showMeters, meterMode }: MixerMasterSectionProps) {
    const { handlers, meters } = useMixerContext();
    const { handleMasterFaderChange, handleToggleLimiter, handleLimiterThresholdChange } = handlers;

    // Get real-time meter data for master
    const masterMeter = meters["master"];
    const peakLeft = masterMeter?.peakLeft ?? master.meter_peak_left;
    const peakRight = masterMeter?.peakRight ?? master.meter_peak_right;

    return (
        <div className="flex w-40 flex-shrink-0 flex-col gap-3 rounded-lg border-2 border-primary/50 bg-gradient-to-b from-card to-card/80 p-4 shadow-xl">
            {/* Master Label */}
            <div className="flex flex-col items-center gap-1 border-b border-primary/20 pb-2">
                <div className="text-center text-sm font-bold uppercase tracking-widest text-primary">
                    {master.name}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-primary/60">
                    Main Output
                </div>
            </div>

            {/* Meter */}
            {showMeters && (
                <div className="flex justify-center rounded-md bg-background/60 p-2 shadow-inner">
                    <Meter
                        peak={peakLeft}
                        peakRight={peakRight}
                        stereo={true}
                        className="h-48"
                    />
                </div>
            )}

            {/* Limiter Controls */}
            <div className="space-y-2 rounded-md border border-primary/20 bg-background/40 p-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wide text-foreground">
                        Limiter
                    </Label>
                    <Toggle
                        pressed={master.limiter_enabled}
                        onPressedChange={handleToggleLimiter}
                        size="sm"
                        className="h-6 px-2 text-[10px] font-semibold"
                    >
                        {master.limiter_enabled ? "ON" : "OFF"}
                    </Toggle>
                </div>
                {master.limiter_enabled && (
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-medium text-muted-foreground">
                            Threshold
                        </Label>
                        <div className="flex items-center gap-2">
                            <Slider
                                value={[master.limiter_threshold]}
                                onValueChange={(values) => handleLimiterThresholdChange(values[0])}
                                min={-12}
                                max={0}
                                step={0.1}
                                className="flex-1"
                            />
                            <span className="w-14 text-right text-[10px] font-mono font-semibold text-foreground">
                                {formatDb(master.limiter_threshold)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Fader */}
            <div className="flex flex-1 justify-center py-2">
                <Fader
                    value={master.fader}
                    onChange={handleMasterFaderChange}
                    min={-60}
                    max={12}
                />
            </div>

            {/* Volume Display */}
            <div className="text-center text-sm font-mono font-bold text-cyan-400">
                {formatDb(master.fader)} dB
            </div>
        </div>
    );
}

