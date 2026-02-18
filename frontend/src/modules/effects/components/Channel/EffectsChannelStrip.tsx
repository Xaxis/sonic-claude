/**
 * EffectsChannelStrip - Individual effects column component
 *
 * Displays a sequencer track's effects chain as a vertical column.
 * Follows professional DAW layout: track header, 8 effect slots, add button.
 * Matches MixerChannelStrip width (w-36) for 1:1 alignment.
 */

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffectsContext } from "../../contexts/EffectsContext";
import type { SequencerTrack } from "@/modules/sequencer/types";
import type { TrackEffectChain } from "@/services/effects";

interface EffectsChannelStripProps {
    track: SequencerTrack;
    effectChain: TrackEffectChain | null;
}

export function EffectsChannelStrip({ track, effectChain }: EffectsChannelStripProps) {
    const { handlers } = useEffectsContext();
    const { handleAddEffect } = handlers;

    // 8 slots per track (0-7)
    const TOTAL_SLOTS = 8;
    const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => i);

    // Map effects to slots
    const effectsBySlot = new Map<number, typeof effectChain.effects[0]>();
    if (effectChain) {
        effectChain.effects.forEach((effect) => {
            effectsBySlot.set(effect.slot_index, effect);
        });
    }

    return (
        <div className="flex w-36 flex-shrink-0 flex-col gap-3 rounded-lg border border-border/70 bg-gradient-to-b from-card to-card/60 p-3 shadow-lg hover:border-border transition-all">
            {/* Track Header - Matches MixerChannelStrip */}
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
                            border: `1px solid ${track.color}40`,
                        }}
                    >
                        FX CHAIN
                    </span>
                </div>
            </div>

            {/* Effects Chain - 8 Slots */}
            <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                {slots.map((slotIndex) => {
                    const effect = effectsBySlot.get(slotIndex);

                    if (effect) {
                        // Slot has an effect - show effect card
                        return (
                            <div
                                key={slotIndex}
                                className="rounded-md border border-primary/30 bg-primary/10 p-2 text-xs"
                            >
                                <div className="font-bold text-primary truncate" title={effect.effect_name}>
                                    {effect.effect_name}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                    Slot {slotIndex + 1}
                                </div>
                            </div>
                        );
                    } else {
                        // Empty slot - show placeholder
                        return (
                            <div
                                key={slotIndex}
                                className="rounded-md border border-dashed border-border/50 bg-background/20 p-2 text-xs text-muted-foreground text-center"
                            >
                                <div className="text-[10px]">Slot {slotIndex + 1}</div>
                                <div className="text-[9px] opacity-50">Empty</div>
                            </div>
                        );
                    }
                })}
            </div>

            {/* Add Effect Button */}
            <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                    // Find first empty slot
                    const emptySlot = slots.find((slot) => !effectsBySlot.has(slot));
                    if (emptySlot !== undefined) {
                        // TODO: Open effect browser dialog
                        console.log("Add effect to slot", emptySlot);
                    }
                }}
            >
                <Plus className="h-3 w-3 mr-1" />
                Add FX
            </Button>
        </div>
    );
}

