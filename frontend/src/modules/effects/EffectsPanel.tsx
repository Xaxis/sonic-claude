/**
 * Effects Panel
 *
 * Per-track effects chain management for sequencer tracks.
 * Shows effects for the selected track with full parameter controls.
 *
 * Architecture:
 * - Follows MixerPanel/InputPanel pattern (SubPanel, hooks, state management)
 * - Uses effectsService for API calls (not old AudioEngineContext effects)
 * - Shows effects for currently selected sequencer track
 * - Professional Knob components in grid layout for parameters
 * - Effect browser with category grouping
 */

import { useState, useEffect } from "react";
import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { Knob } from "@/components/ui/knob.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.tsx";
import { Plus, Power, Zap, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useAudioEngine } from "@/contexts/AudioEngineContext.tsx";
import { effectsService } from "@/services/effects";
import type {
    EffectDefinition,
    EffectInstance,
    TrackEffectChain,
} from "@/services/effects";
import { toast } from "sonner";

export function EffectsPanel() {
    // Get sequencer tracks from AudioEngine context
    const { sequencerTracks, activeSequenceId } = useAudioEngine();

    // Local state
    const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
    const [effectChain, setEffectChain] = useState<TrackEffectChain | null>(null);
    const [effectDefinitions, setEffectDefinitions] = useState<EffectDefinition[]>([]);
    const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
    const [isLoadingChain, setIsLoadingChain] = useState(false);
    const [isLoadingDefs, setIsLoadingDefs] = useState(false);
    const [expandedEffects, setExpandedEffects] = useState<Set<string>>(new Set());

    // Load effect definitions on mount
    useEffect(() => {
        loadEffectDefinitions();
    }, []);

    // Auto-select first track if none selected
    useEffect(() => {
        if (!selectedTrackId && sequencerTracks && sequencerTracks.length > 0) {
            setSelectedTrackId(sequencerTracks[0].id);
        }
    }, [sequencerTracks, selectedTrackId]);

    // Load effect chain when selected track changes
    useEffect(() => {
        if (selectedTrackId) {
            loadEffectChain(selectedTrackId);
        } else {
            setEffectChain(null);
        }
    }, [selectedTrackId]);

    // Auto-select first effect when chain loads
    useEffect(() => {
        if (effectChain && effectChain.effects.length > 0 && !selectedEffectId) {
            setSelectedEffectId(effectChain.effects[0].id);
        }
    }, [effectChain, selectedEffectId]);

    const loadEffectDefinitions = async () => {
        try {
            setIsLoadingDefs(true);
            const defs = await effectsService.getEffectDefinitions();
            setEffectDefinitions(defs);
        } catch (error) {
            console.error("Failed to load effect definitions:", error);
            toast.error("Failed to load effect definitions");
        } finally {
            setIsLoadingDefs(false);
        }
    };

    const loadEffectChain = async (trackId: string) => {
        try {
            setIsLoadingChain(true);
            const chain = await effectsService.getTrackEffectChain(trackId);
            setEffectChain(chain);
        } catch (error) {
            console.error("Failed to load effect chain:", error);
            // Initialize empty chain on error
            setEffectChain({
                track_id: trackId,
                effects: [],
                max_slots: 8,
            });
        } finally {
            setIsLoadingChain(false);
        }
    };

    const handleAddEffect = async (effectName: string) => {
        if (!selectedTrackId) {
            toast.error("No track selected");
            return;
        }

        try {
            // Find next available slot
            const usedSlots = effectChain?.effects.map((e) => e.slot_index) || [];
            const nextSlot = Array.from({ length: 8 }, (_, i) => i).find(
                (slot) => !usedSlots.includes(slot)
            );

            if (nextSlot === undefined) {
                toast.error("No available effect slots (max 8 per track)");
                return;
            }

            await effectsService.createEffect(selectedTrackId, {
                effect_name: effectName,
                slot_index: nextSlot,
            });

            // Reload effect chain
            await loadEffectChain(selectedTrackId);
            toast.success("Effect added");
        } catch (error) {
            console.error("Failed to add effect:", error);
            toast.error("Failed to add effect");
        }
    };

    const handleParameterChange = async (
        effectId: string,
        parameterName: string,
        value: number
    ) => {
        try {
            await effectsService.updateEffectParameter(effectId, parameterName, value);
            // Update local state optimistically
            if (effectChain) {
                setEffectChain({
                    ...effectChain,
                    effects: effectChain.effects.map((e) =>
                        e.id === effectId
                            ? { ...e, parameters: { ...e.parameters, [parameterName]: value } }
                            : e
                    ),
                });
            }
        } catch (error) {
            console.error("Failed to update effect parameter:", error);
            toast.error("Failed to update parameter");
        }
    };

    const handleToggleBypass = async (effectId: string, bypassed: boolean) => {
        try {
            await effectsService.toggleEffectBypass(effectId, bypassed);
            // Update local state optimistically
            if (effectChain) {
                setEffectChain({
                    ...effectChain,
                    effects: effectChain.effects.map((e) =>
                        e.id === effectId ? { ...e, is_bypassed: bypassed } : e
                    ),
                });
            }
        } catch (error) {
            console.error("Failed to toggle effect bypass:", error);
            toast.error("Failed to toggle bypass");
        }
    };

    const handleDelete = async (effectId: string) => {
        try {
            await effectsService.deleteEffect(effectId);
            if (selectedTrackId) {
                await loadEffectChain(selectedTrackId);
            }
            if (selectedEffectId === effectId) {
                setSelectedEffectId(null);
            }
            toast.success("Effect removed");
        } catch (error) {
            console.error("Failed to delete effect:", error);
            toast.error("Failed to delete effect");
        }
    };

    const toggleEffectExpanded = (effectId: string) => {
        setExpandedEffects((prev) => {
            const next = new Set(prev);
            if (next.has(effectId)) {
                next.delete(effectId);
            } else {
                next.add(effectId);
            }
            return next;
        });
    };

    // Group effect definitions by category
    const groupedEffectDefs = effectDefinitions.reduce((acc, def) => {
        if (!acc[def.category]) {
            acc[def.category] = [];
        }
        acc[def.category].push(def);
        return acc;
    }, {} as Record<string, EffectDefinition[]>);

    const selectedTrack = sequencerTracks?.find((t) => t.id === selectedTrackId);
    const effects = effectChain?.effects || [];
    const selectedEffect = effects.find((e) => e.id === selectedEffectId);
    const selectedEffectDef = selectedEffect
        ? effectDefinitions.find((def) => def.name === selectedEffect.effect_name)
        : null;
    const enabledCount = effects.filter((e) => !e.is_bypassed).length;
    const canAddMore = effects.length < (effectChain?.max_slots || 8);

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            {/* Track Selector */}
            <SubPanel title="Track Selection" className="flex-shrink-0">
                <div className="p-2">
                    {sequencerTracks && sequencerTracks.length > 0 ? (
                        <Select
                            value={selectedTrackId || ""}
                            onValueChange={setSelectedTrackId}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a track..." />
                            </SelectTrigger>
                            <SelectContent>
                                {sequencerTracks.map((track) => (
                                    <SelectItem key={track.id} value={track.id}>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-3 w-3 rounded-full"
                                                style={{ backgroundColor: track.color }}
                                            />
                                            <span>{track.name}</span>
                                            <Badge variant="outline" className="text-[10px]">
                                                {track.type}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <div className="text-muted-foreground text-center text-sm py-2">
                            No tracks available. Create a track in the Sequencer.
                        </div>
                    )}
                </div>
            </SubPanel>

            {/* Effects Chain */}
            {selectedTrack && (
                <SubPanel
                    title={`Effects Chain (${enabledCount}/${effects.length} active)`}
                    className="flex-1 min-h-0 flex flex-col"
                >
                    <div className="flex-1 overflow-auto p-2 space-y-1">
                        {isLoadingChain ? (
                            <div className="text-muted-foreground p-4 text-center text-sm">
                                Loading effects...
                            </div>
                        ) : effects.length === 0 ? (
                            <div className="text-muted-foreground p-4 text-center text-sm">
                                No effects on this track
                            </div>
                        ) : (
                            effects
                                .sort((a, b) => a.slot_index - b.slot_index)
                                .map((effect, index) => {
                                    const effectDef = effectDefinitions.find(
                                        (def) => def.name === effect.effect_name
                                    );
                                    const isExpanded = expandedEffects.has(effect.id);
                                    const isSelected = selectedEffectId === effect.id;

                                    return (
                                        <div
                                            key={effect.id}
                                            className={cn(
                                                "group rounded-lg border transition-all",
                                                isSelected
                                                    ? "bg-primary/20 border-primary"
                                                    : "bg-muted/30 border-border hover:bg-muted/50",
                                                effect.is_bypassed && "opacity-50"
                                            )}
                                        >
                                            {/* Effect Header */}
                                            <div className="p-2">
                                                <div
                                                    onClick={() => setSelectedEffectId(effect.id)}
                                                    className="flex cursor-pointer items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <span className="text-muted-foreground w-4 font-mono text-xs flex-shrink-0">
                                                            {index + 1}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleEffectExpanded(effect.id);
                                                            }}
                                                            className="p-0.5 rounded hover:bg-muted transition-colors flex-shrink-0"
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronUp size={12} className="text-muted-foreground" />
                                                            ) : (
                                                                <ChevronDown size={12} className="text-muted-foreground" />
                                                            )}
                                                        </button>
                                                        <Zap size={14} className="text-primary flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-semibold truncate">
                                                                {effect.display_name}
                                                            </div>
                                                            {effectDef && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-[9px] px-1 py-0 h-auto"
                                                                >
                                                                    {effectDef.category}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleBypass(effect.id, !effect.is_bypassed);
                                                            }}
                                                            className={cn(
                                                                "rounded p-1.5 transition-colors",
                                                                effect.is_bypassed
                                                                    ? "bg-muted text-muted-foreground hover:bg-muted/80"
                                                                    : "bg-primary/30 text-primary hover:bg-primary/40"
                                                            )}
                                                            title={effect.is_bypassed ? "Bypassed (Click to Enable)" : "Active (Click to Bypass)"}
                                                        >
                                                            <Power size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(effect.id);
                                                            }}
                                                            className="rounded p-1.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                                                            title="Remove Effect"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Parameters (Collapsible) */}
                                                {isExpanded && effectDef && effectDef.parameters.length > 0 && (
                                                    <div className="border-t border-border/30 mt-2 pt-2">
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {effectDef.parameters.map((paramDef) => {
                                                                const currentValue =
                                                                    effect.parameters[paramDef.name] ?? paramDef.default;
                                                                const paramLower = paramDef.name.toLowerCase();
                                                                const format = paramLower.includes("pan")
                                                                    ? "pan"
                                                                    : paramLower.includes("mix") ||
                                                                      paramLower.includes("wet") ||
                                                                      paramLower.includes("dry")
                                                                      ? "percent"
                                                                      : "default";

                                                                return (
                                                                    <div key={paramDef.name} className="flex justify-center">
                                                                        <Knob
                                                                            value={currentValue}
                                                                            onChange={(value) =>
                                                                                handleParameterChange(
                                                                                    effect.id,
                                                                                    paramDef.name,
                                                                                    value
                                                                                )
                                                                            }
                                                                            label={paramDef.display_name}
                                                                            min={paramDef.min ?? 0}
                                                                            max={paramDef.max ?? 1}
                                                                            format={format}
                                                                            disabled={effect.is_bypassed}
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                        )}

                        {/* Add Effect Button */}
                        {canAddMore && !isLoadingChain && (
                            <Select onValueChange={handleAddEffect}>
                                <SelectTrigger className="w-full border-dashed hover:border-primary hover:bg-primary/10 transition-all">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Plus size={14} />
                                        <span className="text-xs">Add Effect</span>
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="max-h-80">
                                    {Object.entries(groupedEffectDefs).map(([category, defs]) => (
                                        <SelectGroup key={category}>
                                            <SelectLabel className="text-xs font-semibold text-muted-foreground">
                                                {category}
                                            </SelectLabel>
                                            {defs.map((effectDef) => (
                                                <SelectItem
                                                    key={effectDef.name}
                                                    value={effectDef.name}
                                                    className="text-xs"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{effectDef.display_name}</span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {effectDef.description}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </SubPanel>
            )}

            {/* Empty State */}
            {!selectedTrack && (
                <div className="flex flex-1 items-center justify-center">
                    <div className="text-muted-foreground text-center">
                        <Zap size={48} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Select a track to view its effects</p>
                    </div>
                </div>
            )}
        </div>
    );
}

