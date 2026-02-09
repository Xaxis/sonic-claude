/**
 * Effects Panel
 *
 * Audio effects management and routing.
 * Create and control effect chains for tracks.
 */

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { SubPanel } from "@/components/ui/sub-panel";
import { Knob } from "@/components/ui/knob";
import { audioEngineService } from "@/services/api/audio-engine.service";
import { Plus, X, Power } from "lucide-react";
import { cn } from "@/lib/utils";

// Backend API types (matching backend/routes/effects.py)
interface EffectDefResponse {
    name: string;
    effect_type: string;
    parameters: Record<string, number>;
    description: string;
    parameter_ranges: Record<string, [number, number]>;
    parameter_descriptions: Record<string, string>;
}

interface EffectResponse {
    id: number;
    effectdef: string;
    parameters: Record<string, number>;
    group: number;
    input_bus: number;
    output_bus: number | null;
}

export function EffectsPanel() {
    const [effectDefs, setEffectDefs] = useState<EffectDefResponse[]>([]);
    const [activeEffects, setActiveEffects] = useState<EffectResponse[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    // Load effect definitions
    useEffect(() => {
        loadEffectDefs();
    }, []);

    const loadEffectDefs = async () => {
        try {
            const defs = await audioEngineService.getEffectDefs();
            // Cast to EffectDefResponse[] since the API returns the correct type
            setEffectDefs(defs as unknown as EffectDefResponse[]);
        } catch (error) {
            console.error("Failed to load effect definitions:", error);
        }
    };

    // Get unique categories
    const categories = ["all", ...Array.from(new Set(effectDefs.map((def) => def.effect_type)))];

    // Filter effects by category
    const filteredEffects =
        selectedCategory === "all"
            ? effectDefs
            : effectDefs.filter((def) => def.effect_type === selectedCategory);

    // Add effect
    const handleAddEffect = async (effectDef: EffectDefResponse) => {
        try {
            // Backend expects CreateEffectRequest with group, input_bus, output_bus
            const baseURL = (audioEngineService as any).baseURL || "http://localhost:8000";
            const response = await fetch(`${baseURL}/audio/effects/effects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    effectdef: effectDef.name,
                    parameters: effectDef.parameters,
                    group: 2, // Effects group
                    input_bus: 0, // TODO: Get from track
                    output_bus: null,
                }),
            });
            const effect: EffectResponse = await response.json();
            setActiveEffects([...activeEffects, effect]);
        } catch (error) {
            console.error("Failed to create effect:", error);
        }
    };

    // Remove effect
    const handleRemoveEffect = async (effectId: number) => {
        try {
            await audioEngineService.freeEffect(effectId.toString());
            setActiveEffects(activeEffects.filter((e) => e.id !== effectId));
        } catch (error) {
            console.error("Failed to remove effect:", error);
        }
    };

    // Update effect parameter
    const handleParameterChange = async (effectId: number, parameter: string, value: number) => {
        try {
            // Backend expects UpdateEffectRequest with parameter and value fields
            const baseURL = (audioEngineService as any).baseURL || "http://localhost:8000";
            const response = await fetch(`${baseURL}/audio/effects/effects/${effectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    parameter,
                    value,
                }),
            });
            await response.json();
            setActiveEffects(
                activeEffects.map((e) =>
                    e.id === effectId ? { ...e, parameters: { ...e.parameters, [parameter]: value } } : e
                )
            );
        } catch (error) {
            console.error("Failed to update effect parameter:", error);
        }
    };

    return (
        <Panel title="EFFECTS" className="flex flex-col">
            <div className="flex-1 p-4 overflow-auto flex gap-4">
                {/* Effect Browser */}
                <div className="w-1/3 flex flex-col gap-4">
                    <SubPanel title="EFFECT BROWSER">
                        <div className="p-3">
                            {/* Category filter */}
                            <div className="flex flex-wrap gap-1 mb-3">
                                {categories.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={cn(
                                            "px-2 py-1 text-xs font-semibold rounded transition-colors",
                                            selectedCategory === category
                                                ? "bg-cyan-500 text-black"
                                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                        )}
                                    >
                                        {category.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            {/* Effect list */}
                            <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                {filteredEffects.map((effectDef) => (
                                    <div
                                        key={effectDef.name}
                                        className="p-2 bg-gray-800/50 rounded hover:bg-gray-700/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-cyan-400 truncate">
                                                    {effectDef.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {effectDef.description}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddEffect(effectDef)}
                                                className="flex-shrink-0 p-1 bg-cyan-500 hover:bg-cyan-400 text-black rounded transition-colors"
                                                title="Add effect"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </SubPanel>
                </div>

                {/* Active Effects Chain */}
                <div className="flex-1 flex flex-col gap-4">
                    <SubPanel title="ACTIVE EFFECTS">
                        <div className="p-3">
                            {activeEffects.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <p className="text-sm">No active effects</p>
                                    <p className="text-xs mt-1">Add effects from the browser</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeEffects.map((effect) => {
                                        const effectDef = effectDefs.find((def) => def.name === effect.effectdef);
                                        if (!effectDef) return null;

                                        return (
                                            <SubPanel key={effect.id} title={effectDef.name.toUpperCase()}>
                                                <div className="p-3">
                                                    {/* Effect header */}
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="text-xs text-muted-foreground">
                                                            {effectDef.description}
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button
                                                                className="p-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                                                                title="Bypass"
                                                            >
                                                                <Power className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemoveEffect(effect.id)}
                                                                className="p-1 bg-red-500 hover:bg-red-400 rounded transition-colors"
                                                                title="Remove"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Parameters */}
                                                    <div className="grid grid-cols-3 gap-4">
                                                        {Object.entries(effectDef.parameters).map(([param, defaultValue]) => {
                                                            const range = effectDef.parameter_ranges[param] || [0, 1];
                                                            const currentValue = effect.parameters[param] ?? defaultValue;

                                                            return (
                                                                <Knob
                                                                    key={param}
                                                                    value={currentValue}
                                                                    onChange={(value) =>
                                                                        handleParameterChange(effect.id, param, value)
                                                                    }
                                                                    label={param.toUpperCase()}
                                                                    min={range[0]}
                                                                    max={range[1]}
                                                                    format="default"
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </SubPanel>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </SubPanel>
                </div>
            </div>
        </Panel>
    );
}

