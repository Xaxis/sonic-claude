/**
 * Effects Panel
 *
 * Audio effects chain management.
 * Shows active effects with their parameters and routing.
 * Integrates with AudioEngineContext for real effect management.
 */

import { useState, useEffect } from "react";
import { SubPanel } from "@/components/ui/sub-panel";
import { Slider } from "@/components/ui/slider";
import { Plus, Power, Zap, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioEngine } from "@/contexts/AudioEngineContext";

export function EffectsPanel() {
    const {
        activeEffects,
        effectDefs,
        loadEffectDefs,
        createEffect,
        updateEffectParameter,
        deleteEffect,
        bypassEffect,
    } = useAudioEngine();

    const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);

    // Load effect definitions on mount
    useEffect(() => {
        loadEffectDefs();
    }, [loadEffectDefs]);

    // Auto-select first effect if none selected
    useEffect(() => {
        if (!selectedEffectId && activeEffects.length > 0) {
            setSelectedEffectId(activeEffects[0].id);
        }
    }, [activeEffects, selectedEffectId]);

    // Handle adding a new effect
    const handleAddEffect = async () => {
        if (effectDefs.length > 0) {
            await createEffect(effectDefs[0].name);
        } else {
            console.warn("No effect definitions available");
        }
    };

    // Handle toggle effect bypass
    const handleToggleEffect = async (effectId: string) => {
        const effect = activeEffects.find(e => e.id === effectId);
        if (effect) {
            await bypassEffect(effect.node_id, !effect.is_active);
        }
    };

    // Handle parameter change
    const handleParameterChange = async (effectId: string, param: string, value: number) => {
        const effect = activeEffects.find(e => e.id === effectId);
        if (effect) {
            await updateEffectParameter(effect.node_id, param, value);
        }
    };

    // Handle delete effect
    const handleDeleteEffect = async (effectId: string) => {
        const effect = activeEffects.find(e => e.id === effectId);
        if (effect) {
            await deleteEffect(effect.node_id);
            if (selectedEffectId === effectId) {
                setSelectedEffectId(null);
            }
        }
    };

    const selectedEffect = activeEffects.find(e => e.id === selectedEffectId);
    const enabledCount = activeEffects.filter(e => e.is_active).length;

    return (
        <div className="flex-1 flex flex-col gap-2 overflow-hidden h-full p-2">
            {/* Effects Chain */}
            <SubPanel title={`Effects Chain (${enabledCount} active)`} className="flex-shrink-0">
                <div className="p-2 space-y-1">
                    {activeEffects.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No active effects
                        </div>
                    ) : (
                        activeEffects.map((effect, index) => (
                            <div
                                key={effect.id}
                                className={cn(
                                    "p-2 rounded-lg transition-all border group",
                                    selectedEffectId === effect.id
                                        ? "bg-primary/20 border-primary"
                                        : "bg-muted/30 border-border hover:bg-muted/50",
                                    !effect.is_active && "opacity-50"
                                )}
                            >
                                <div
                                    onClick={() => setSelectedEffectId(effect.id)}
                                    className="cursor-pointer flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground font-mono w-4">{index + 1}</span>
                                        <Zap size={14} className="text-primary" />
                                        <div>
                                            <div className="text-sm font-semibold">{effect.effectdef}</div>
                                            <div className="text-xs text-muted-foreground">Node: {effect.node_id}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleEffect(effect.id);
                                        }}
                                        className={cn(
                                            "p-1.5 rounded transition-colors",
                                            effect.is_active
                                                ? "bg-primary/30 text-primary hover:bg-primary/40"
                                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        )}
                                        title={effect.is_active ? "Bypass" : "Enable"}
                                    >
                                        <Power size={14} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleDeleteEffect(effect.id)}
                                    className="mt-2 w-full p-1 rounded bg-destructive/20 hover:bg-destructive/30 text-destructive text-xs flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={12} />
                                    Delete
                                </button>
                            </div>
                        ))
                    )}
                    <button
                        onClick={handleAddEffect}
                        className="w-full p-2 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/10 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                    >
                        <Plus size={14} />
                        <span className="text-xs">Add Effect</span>
                    </button>
                </div>
            </SubPanel>

            {/* Effect Parameters */}
            {selectedEffect ? (
                <SubPanel title={`${selectedEffect.effectdef} Parameters`} className="flex-1 overflow-auto">
                    <div className="p-4 space-y-4">
                        {Object.keys(selectedEffect.parameters).length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-8">
                                No parameters available
                            </div>
                        ) : (
                            Object.entries(selectedEffect.parameters).map(([param, value]) => (
                                <div key={param}>
                                    <div className="flex justify-between mb-1">
                                        <label className="text-xs text-muted-foreground capitalize">
                                            {param.replace(/_/g, " ")}
                                        </label>
                                        <span className="text-xs font-mono text-foreground">
                                            {typeof value === "number" ? value.toFixed(3) : value}
                                        </span>
                                    </div>
                                    {typeof value === "number" && (
                                        <Slider
                                            value={value}
                                            onChange={(v) => handleParameterChange(selectedEffect.id, param, v)}
                                            min={0}
                                            max={1}
                                            step={0.01}
                                        />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </SubPanel>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                        <Zap size={48} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Select an effect to edit parameters</p>
                    </div>
                </div>
            )}
        </div>
    );
}

