/**
 * MixerChannelStrip - Individual channel strip component
 *
 * Displays a sequencer track as a vertical mixer channel strip
 * Follows professional DAW layout (top to bottom): name, meter, pan, fader, mute/solo
 */

import { Fader } from "@/components/ui/fader.tsx";
import { Knob } from "@/components/ui/knob.tsx";
import { Meter } from "@/components/ui/meter.tsx";
import { useMixerContext } from "../../contexts/MixerContext.tsx";
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
        <div className="flex w-32 flex-shrink-0 flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm">
            {/* Track Name */}
            <div className="flex items-center justify-center border-b border-border/50 pb-2">
                <div
                    className="truncate text-center text-xs font-bold uppercase tracking-wider"
                    style={{ color: track.color }}
                    title={track.name}
                >
                    {track.name}
                </div>
            </div>

            {/* Track Type Badge */}
            <div className="flex justify-center">
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {track.type}
                </span>
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

            {/* Pan Knob */}
            <div className="flex justify-center">
                <Knob
                    value={track.pan}
                    onChange={(value) => handlePanChange(track.id, value)}
                    label="Pan"
                    min={-1}
                    max={1}
                    format="pan"
                />
            </div>

            {/* Fader */}
            <div className="flex flex-1 justify-center py-2">
                <Fader
                    value={faderValue}
                    onChange={(db) => handleFaderChange(track.id, dbToVolume(db))}
                    min={-60}
                    max={12}
                />
            </div>

            {/* Volume Display */}
            <div className="text-center text-xs font-mono font-semibold text-cyan-400">
                {formatDb(faderValue)} dB
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

