/**
 * MixerChannelStrip - Individual channel strip component
 *
 * REFACTORED: Pure component that reads everything from Zustand
 * - Reads ALL state from Zustand (meters, showMeters, track data)
 * - Calls actions directly from store
 * - Only receives trackId prop (identifier)
 *
 * Layout (top → bottom): name header → meter → pan knob → fader → mute/solo
 * All control sections are wrapped in <ControlCell> for visual consistency.
 */

import { Fader }        from "@/components/ui/fader.tsx";
import { Knob }         from "@/components/ui/knob.tsx";
import { Meter }        from "@/components/ui/meter.tsx";
import { ControlCell }        from "@/components/ui/control-cell.tsx";
import { ValueDisplay }       from "@/components/ui/value-display.tsx";
import { TrackButton }        from "@/components/ui/track-button.tsx";
import { ChannelStrip }       from "@/components/ui/channel-strip.tsx";
import { ChannelStripHeader } from "@/components/ui/channel-strip-header.tsx";
import { useDAWStore }  from "@/stores/dawStore";
import { volumeToDb, dbToVolume, formatDb } from "@/lib/audio-utils";
import { useInlineAI }        from "@/hooks/useInlineAI";
import { useEntityHighlight } from "@/hooks/useEntityHighlight";
import { InlineAIPromptPopover } from "@/components/ai/InlineAIPromptPopover";

interface MixerChannelStripProps {
    trackId: string;
}

export function MixerChannelStrip({ trackId }: MixerChannelStripProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const tracks     = useDAWStore(state => state.tracks);
    const meters     = useDAWStore(state => state.meters);
    const showMeters = useDAWStore(state => state.showMeters);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const updateTrackVolume = useDAWStore(state => state.updateTrackVolume);
    const updateTrackPan    = useDAWStore(state => state.updateTrackPan);
    const muteTrack         = useDAWStore(state => state.muteTrack);
    const soloTrack         = useDAWStore(state => state.soloTrack);

    // ========================================================================
    // DERIVED STATE: Get track data
    // ========================================================================
    const track = tracks.find(t => t.id === trackId);

    // ========================================================================
    // INLINE AI: Universal pattern for AI editing
    // ========================================================================
    const { handlers: aiHandlers, showPrompt: showAIPrompt, position: aiPosition, closePrompt: closeAIPrompt } = useInlineAI({
        entityType: "mixer_channel",
        entityId:   trackId,
    });

    const { highlightClass } = useEntityHighlight(trackId);

    if (!track) return null;

    const faderValue = volumeToDb(track.volume);
    const trackMeter = meters[track.id];
    const peakLeft   = trackMeter?.peakLeft  ?? -60;
    const peakRight  = trackMeter?.peakRight ?? -60;

    return (
        <>
            <ChannelStrip className={highlightClass}>

                {/* ── Track Header ─────────────────────────────────────────── */}
                <ChannelStripHeader
                    name={track.name}
                    color={track.color}
                    label={track.type}
                    nameProps={{
                        title: `${track.name} • Right-click or long-press for AI`,
                        ...aiHandlers,
                    }}
                />

                {/* ── Meter ────────────────────────────────────────────────── */}
                {showMeters && (
                    <ControlCell variant="inset" center>
                        <Meter
                            peak={peakLeft}
                            peakRight={peakRight}
                            stereo={true}
                            className="h-56"
                        />
                    </ControlCell>
                )}

                {/* ── Pan Knob ─────────────────────────────────────────────── */}
                <ControlCell variant="default" center>
                    <Knob
                        value={track.pan}
                        onChange={(value) => updateTrackPan(track.id, value)}
                        label="Pan"
                        min={-1}
                        max={1}
                        format="pan"
                    />
                </ControlCell>

                {/* ── Fader ────────────────────────────────────────────────── */}
                <ControlCell variant="default" grow>
                    <ValueDisplay value={formatDb(faderValue)} />
                    <div className="flex flex-1 justify-center">
                        <Fader
                            value={faderValue}
                            onChange={(db) => updateTrackVolume(track.id, dbToVolume(db))}
                            min={-60}
                            max={12}
                            className="flex-1"
                        />
                    </div>
                </ControlCell>

                {/* ── Mute / Solo ──────────────────────────────────────────── */}
                <div className="flex gap-1.5">
                    <TrackButton
                        variant="mute"
                        active={track.is_muted}
                        onClick={() => muteTrack(track.id, !track.is_muted)}
                        className="flex-1"
                    />
                    <TrackButton
                        variant="solo"
                        active={track.is_solo}
                        onClick={() => soloTrack(track.id, !track.is_solo)}
                        className="flex-1"
                    />
                </div>
            </ChannelStrip>

            {/* INLINE AI PROMPT - Universal pattern */}
            {showAIPrompt && aiPosition && (
                <InlineAIPromptPopover
                    entityType="mixer_channel"
                    entityId={trackId}
                    position={aiPosition}
                    onClose={closeAIPrompt}
                />
            )}
        </>
    );
}
