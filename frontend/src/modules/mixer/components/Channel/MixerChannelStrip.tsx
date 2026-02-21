/**
 * MixerChannelStrip - Individual channel strip component
 *
 * Displays a sequencer track as a vertical mixer channel strip
 * Follows professional DAW layout (top to bottom): name, meter, pan, fader, mute/solo
 *
 * ARCHITECTURE:
 * - Tracks have mixer properties (volume, pan, is_muted, is_solo) directly on them
 * - Updates go through Sequencer API (not a separate mixer API)
 * - Real-time meters come from TelemetryContext
 */

import { Fader } from "@/components/ui/fader.tsx";
import { Knob } from "@/components/ui/knob.tsx";
import { Meter } from "@/components/ui/meter.tsx";
import { useDAWStore } from '@/stores/dawStore';
import { MixerButton } from "./MixerButton.tsx";
import { volumeToDb, dbToVolume, formatDb } from "@/lib/audio-utils";
import type { SequencerTrack } from "@/modules/sequencer/types";

interface MixerChannelStripProps {
    track: SequencerTrack;
    showMeters: boolean;
}

export function MixerChannelStrip({ track, showMeters }: MixerChannelStripProps) {
    // Get real-time meters from Zustand store
    const meters = useDAWStore(state => state.meters);

    // Get sequencer actions from Zustand store
    const updateTrackVolume = useDAWStore(state => state.updateTrackVolume);
    const updateTrackPan = useDAWStore(state => state.updateTrackPan);
    const muteTrack = useDAWStore(state => state.muteTrack);
    const soloTrack = useDAWStore(state => state.soloTrack);

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
                    onChange={(value) => updateTrackPan(track.id, value)}
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
                        onChange={(db) => updateTrackVolume(track.id, dbToVolume(db))}
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
                    onClick={() => muteTrack(track.id, !track.is_muted)}
                    className="flex-1"
                />
                <MixerButton
                    variant="solo"
                    active={track.is_solo}
                    onClick={() => soloTrack(track.id, !track.is_solo)}
                    className="flex-1"
                />
            </div>
        </div>
    );
}

