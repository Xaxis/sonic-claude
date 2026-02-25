/**
 * MixerChannelStrip - Individual channel strip component
 *
 * REFACTORED: Pure component that reads everything from Zustand
 * - Reads ALL state from Zustand (meters, showMeters, track data)
 * - Calls actions directly from store
 * - Only receives trackId prop (identifier)
 *
 * Displays a sequencer track as a vertical mixer channel strip
 * Follows professional DAW layout (top to bottom): name, meter, pan, fader, mute/solo
 */

import { Fader } from "@/components/ui/fader.tsx";
import { Knob } from "@/components/ui/knob.tsx";
import { Meter } from "@/components/ui/meter.tsx";
import { useDAWStore } from '@/stores/dawStore';
import { MixerButton } from "./MixerButton.tsx";
import { volumeToDb, dbToVolume, formatDb } from "@/lib/audio-utils";
import { useInlineAI } from "@/hooks/useInlineAI";
import { useEntityHighlight } from "@/hooks/useEntityHighlight";
import { InlineAIPromptPopover } from "@/components/ai/InlineAIPromptPopover";
import { cn } from "@/lib/utils";

interface MixerChannelStripProps {
    trackId: string;
}

export function MixerChannelStrip({ trackId }: MixerChannelStripProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);
    const meters = useDAWStore(state => state.meters);
    const showMeters = useDAWStore(state => state.showMeters);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const updateTrackVolume = useDAWStore(state => state.updateTrackVolume);
    const updateTrackPan = useDAWStore(state => state.updateTrackPan);
    const muteTrack = useDAWStore(state => state.muteTrack);
    const soloTrack = useDAWStore(state => state.soloTrack);

    // ========================================================================
    // DERIVED STATE: Get track data
    // ========================================================================
    const track = tracks.find(t => t.id === trackId);

    // ========================================================================
    // INLINE AI: Universal pattern for AI editing
    // ========================================================================
    const { handlers: aiHandlers, showPrompt: showAIPrompt, position: aiPosition, closePrompt: closeAIPrompt } = useInlineAI({
        entityType: "mixer_channel",
        entityId: trackId,
    });

    const { highlightClass } = useEntityHighlight(trackId);

    // Validation: track must exist
    if (!track) {
        return null;
    }

    const faderValue = volumeToDb(track.volume);

    // Get real-time meter data for this track
    const trackMeter = meters[track.id];
    const peakLeft = trackMeter?.peakLeft ?? -60;
    const peakRight = trackMeter?.peakRight ?? -60;

    return (
        <>
            <div className={cn("flex w-56 flex-shrink-0 flex-col gap-3 rounded-lg border border-border/70 bg-gradient-to-b from-card to-card/60 p-3 shadow-lg hover:border-border transition-all", highlightClass)}>
                {/* Track Header */}
                <div className="flex flex-col gap-1.5 border-b border-border/30 pb-2.5">
                    {/* Track Name - Right-click or long-press for AI */}
                    <div
                        className="truncate text-center text-xs font-bold uppercase tracking-wider drop-shadow-sm cursor-pointer"
                        style={{ color: track.color }}
                        title={`${track.name} • Right-click or long-press for AI`}
                        {...aiHandlers}
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

