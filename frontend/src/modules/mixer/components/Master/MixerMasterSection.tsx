/**
 * MixerMasterSection - Master channel strip component
 *
 * REFACTORED: Pure component that reads everything from Zustand
 * - Reads ALL state from Zustand (master, meters, showMeters)
 * - Calls actions directly from store
 * - No props needed
 *
 * Visually distinct from regular channels:
 *   - border-2 border-primary/60 (bolder outline)
 *   - gradient from-primary/10 (tinted background)
 *   - accent ControlCells (primary-tinted borders on internal sections)
 */

import { Fader }        from "@/components/ui/fader.tsx";
import { Meter }        from "@/components/ui/meter.tsx";
import { Button }       from "@/components/ui/button.tsx";
import { ChannelStrip } from "@/components/ui/channel-strip.tsx";
import { ControlCell }  from "@/components/ui/control-cell.tsx";
import { ValueDisplay } from "@/components/ui/value-display.tsx";
import { SectionLabel } from "@/components/ui/section-label.tsx";
import { ControlRow }   from "@/components/ui/control-row.tsx";
import { useDAWStore }  from "@/stores/dawStore";
import { formatDb }     from "@/lib/audio-utils";
import { cn }           from "@/lib/utils";

export function MixerMasterSection() {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const master     = useDAWStore(state => state.master);
    const meters     = useDAWStore(state => state.meters);
    const showMeters = useDAWStore(state => state.showMeters);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const updateMasterFader    = useDAWStore(state => state.updateMasterFader);
    const toggleLimiter        = useDAWStore(state => state.toggleLimiter);
    const setLimiterThreshold  = useDAWStore(state => state.setLimiterThreshold);

    if (!master) return null;

    const masterMeter = meters["master"];
    const peakLeft    = masterMeter?.peakLeft  ?? master.meter_peak_left;
    const peakRight   = masterMeter?.peakRight ?? master.meter_peak_right;

    return (
        <ChannelStrip variant="master">

            {/* ── Master Label ─────────────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-1.5 border-b-2 border-primary/30 pb-3">
                <div className="text-center text-sm font-black uppercase tracking-widest text-primary drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">
                    {master.name}
                </div>
                <SectionLabel size="sm" emphasis="primary">Main Output</SectionLabel>
            </div>

            {/* ── Meter ────────────────────────────────────────────────────── */}
            {showMeters && (
                <ControlCell variant="accent-inset" center>
                    <Meter
                        peak={peakLeft}
                        peakRight={peakRight}
                        stereo={true}
                        className="h-56"
                    />
                </ControlCell>
            )}

            {/* ── Limiter Controls ─────────────────────────────────────────── */}
            <ControlCell variant="accent" gap="3">
                <div className="flex items-center justify-between">
                    <SectionLabel size="sm" emphasis="primary">Limiter</SectionLabel>
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

                <ControlRow
                    label="Threshold"
                    value={master.limiter_threshold}
                    min={-12}
                    max={0}
                    step={0.1}
                    formatValue={formatDb}
                    onChange={setLimiterThreshold}
                    disabled={!master.limiter_enabled}
                    labelWidth="w-20"
                    valueWidth="w-12"
                />
            </ControlCell>

            {/* ── Fader ────────────────────────────────────────────────────── */}
            <ControlCell variant="accent" grow>
                <ValueDisplay value={formatDb(master.fader)} size="lg" emphasis="primary" />
                <div className="flex flex-1 justify-center">
                    <Fader
                        value={master.fader}
                        onChange={updateMasterFader}
                        min={-60}
                        max={12}
                        className="flex-1"
                    />
                </div>
            </ControlCell>
        </ChannelStrip>
    );
}
