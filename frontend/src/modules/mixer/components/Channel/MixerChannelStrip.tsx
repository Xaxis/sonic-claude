/**
 * MixerChannelStrip - Individual channel strip component
 *
 * Displays a sequencer track as a vertical mixer channel strip
 * Follows professional DAW layout (top to bottom): name, meter, pan, fader, mute/solo
 */

import { Fader } from "@/components/ui/fader.tsx";
import { Knob } from "@/components/ui/knob.tsx";
import { Meter } from "@/components/ui/meter.tsx";
import { useMixerContext } from '@/contexts/MixerContext';
import { MixerButton } from "./MixerButton.tsx";
import { volumeToDb, dbToVolume, formatDb } from "@/lib/audio-utils";
import type { SequencerTrack } from "@/modules/sequencer/types";

interface MixerChannelStripProps {
    track: SequencerTrack;
    showMeters: boolean;
    meterMode: "peak" | "rms" | "both";
}

export function MixerChannelStrip({ track, showMeters, meterMode }: MixerChannelStripProps) {
    const { handlers, meters } = useMixerContext();
    const {
        handleFaderChange,
        handlePanChange,
        handleToggleMute,
        handleToggleSolo,
    } = handlers;

    const faderValue = volumeToDb(track.volume);

    // Get real-time meter data for this track
    const trackMeter = meters[track.id];
    const peakLeft = trackMeter?.peakLeft ?? -60;
    const peakRight = trackMeter?.peakRight ?? -60;

    return (
        <div className="flex w-56 flex-shrink-0 flex-col gap-3 rounded-lg border border-border/70 bg-gradient-to-b from-card to-card/60 p-3 shadow-lg hover:border-border transition-all">
            {/* Track Header */}
            <div className="flex flex-col gap-1.5 border-b border-border/30 pb-2.5">
                {/* Track Name */}
                <div
                    className="truncate text-center text-xs font-bold uppercase tracking-wider drop-shadow-sm"
                    style={{ color: track.color }}
                    title={track.name}
                >
                    {track.name}
                </div>

                {/* Track Type Badge */}
                <div className="flex justify-center">
                    <span
                        className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm"
                        style={{
                            backgroundColor: `${track.color}20`,
                            color: track.color,
                            border: `1px solid ${track.color}40`
                        }}
                    >
                        {track.type}
                    </span>
                </div>
            </div>

            {/* Meter */}
            {showMeters && (
                <div className="flex justify-center rounded-md bg-black/30 p-2.5 shadow-inner border border-white/5">
                    <Meter
                        peak={peakLeft}
                        peakRight={peakRight}
                        stereo={true}
                        className="h-56"
                    />
                </div>
            )}

            {/* Pan Knob */}
            <div className="flex justify-center rounded-md bg-background/40 p-2 border border-border/30">
                <Knob
                    value={track.pan}
                    onChange={(value) => handlePanChange(track.id, value)}
                    label="Pan"
                    min={-1}
                    max={1}
                    format="pan"
                />
            </div>

            {/* Fader Section */}
            <div className="flex flex-1 flex-col gap-2 rounded-md bg-background/40 p-2 border border-border/30">
                {/* Volume Display */}
                <div className="text-center text-[11px] font-mono font-bold text-cyan-400 tracking-tight">
                    {formatDb(faderValue)}
                </div>

                {/* Fader */}
                <div className="flex flex-1 justify-center">
                    <Fader
                        value={faderValue}
                        onChange={(db) => handleFaderChange(track.id, dbToVolume(db))}
                        min={-60}
                        max={12}
                        className="flex-1"
                    />
                </div>
            </div>

            {/* Mute/Solo Buttons */}
            <div className="flex gap-1.5">
                <MixerButton
                    variant="mute"
                    active={track.is_muted}
                    onClick={() => handleToggleMute(track.id)}
                    className="flex-1"
                />
                <MixerButton
                    variant="solo"
                    active={track.is_solo}
                    onClick={() => handleToggleSolo(track.id)}
                    className="flex-1"
                />
            </div>
        </div>
    );
}

