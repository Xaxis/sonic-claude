/**
 * Synthesis Panel
 *
 * Synth management and parameter control.
 * Create, edit, and control SuperCollider synths.
 */

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { SubPanel } from "@/components/ui/sub-panel";
import { Knob } from "@/components/ui/knob";
import { audioEngineService } from "@/services/api/audio-engine.service";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Backend API types (matching backend/routes/synthesis.py)
interface SynthDefResponse {
    name: string;
    category: string;
    parameters: Record<string, number>;
    description: string;
    parameter_ranges: Record<string, [number, number]>;
    parameter_descriptions: Record<string, string>;
}

interface SynthResponse {
    id: number;
    synthdef: string;
    parameters: Record<string, number>;
    group: number;
    bus: number | null;
}

export function SynthesisPanel() {
    const [synthDefs, setSynthDefs] = useState<SynthDefResponse[]>([]);
    const [activeSynths, setActiveSynths] = useState<SynthResponse[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    // Load synth definitions
    useEffect(() => {
        loadSynthDefs();
    }, []);

    const loadSynthDefs = async () => {
        try {
            const defs = await audioEngineService.getSynthDefs();
            // Cast to SynthDefResponse[] since the API returns the correct type
            setSynthDefs(defs as unknown as SynthDefResponse[]);
        } catch (error) {
            console.error("Failed to load synth definitions:", error);
        }
    };

    // Get unique categories
    const categories = ["all", ...Array.from(new Set(synthDefs.map((def) => def.category)))];

    // Filter synths by category
    const filteredSynths =
        selectedCategory === "all"
            ? synthDefs
            : synthDefs.filter((def) => def.category === selectedCategory);

    // Add synth
    const handleAddSynth = async (synthDef: SynthDefResponse) => {
        try {
            // Backend expects CreateSynthRequest with group and bus
            const baseURL = (audioEngineService as any).baseURL || "http://localhost:8000";
            const response = await fetch(`${baseURL}/audio/synthesis/synths`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    synthdef: synthDef.name,
                    parameters: synthDef.parameters,
                    group: 1, // Synth group
                    bus: null,
                }),
            });
            const synth: SynthResponse = await response.json();
            setActiveSynths([...activeSynths, synth]);
        } catch (error) {
            console.error("Failed to create synth:", error);
        }
    };

    // Remove synth
    const handleRemoveSynth = async (synthId: number) => {
        try {
            await audioEngineService.freeSynth(synthId.toString());
            setActiveSynths(activeSynths.filter((s) => s.id !== synthId));
        } catch (error) {
            console.error("Failed to remove synth:", error);
        }
    };

    // Update synth parameter
    const handleParameterChange = async (synthId: number, parameter: string, value: number) => {
        try {
            // Backend expects UpdateSynthRequest with parameter and value fields
            const baseURL = (audioEngineService as any).baseURL || "http://localhost:8000";
            const response = await fetch(`${baseURL}/audio/synthesis/synths/${synthId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    parameter,
                    value,
                }),
            });
            await response.json();
            setActiveSynths(
                activeSynths.map((s) =>
                    s.id === synthId ? { ...s, parameters: { ...s.parameters, [parameter]: value } } : s
                )
            );
        } catch (error) {
            console.error("Failed to update synth parameter:", error);
        }
    };

    return (
        <Panel title="SYNTHESIS" className="flex flex-col">
            <div className="flex-1 p-4 overflow-auto flex gap-4">
                {/* Synth Browser */}
                <div className="w-1/3 flex flex-col gap-4">
                    <SubPanel title="SYNTH BROWSER">
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

                            {/* Synth list */}
                            <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                {filteredSynths.map((synthDef) => (
                                    <div
                                        key={synthDef.name}
                                        className="p-2 bg-gray-800/50 rounded hover:bg-gray-700/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-cyan-400 truncate">
                                                    {synthDef.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {synthDef.description}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddSynth(synthDef)}
                                                className="flex-shrink-0 p-1 bg-cyan-500 hover:bg-cyan-400 text-black rounded transition-colors"
                                                title="Add synth"
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

                {/* Active Synths */}
                <div className="flex-1 flex flex-col gap-4">
                    <SubPanel title="ACTIVE SYNTHS">
                        <div className="p-3">
                            {activeSynths.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No active synths. Add a synth from the browser.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activeSynths.map((synth) => {
                                        const synthDef = synthDefs.find((def) => def.name === synth.synthdef);
                                        if (!synthDef) return null;

                                        return (
                                            <SubPanel key={synth.id} title={synthDef.name.toUpperCase()}>
                                                <div className="p-3">
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs text-muted-foreground">
                                                                {synthDef.description}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleRemoveSynth(synth.id)}
                                                                className="p-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                                                                title="Remove synth"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Parameters */}
                                                    <div className="grid grid-cols-3 gap-4">
                                                        {Object.entries(synthDef.parameter_ranges).map(
                                                            ([param, range]) => {
                                                                const currentValue = synth.parameters[param] ?? synthDef.parameters[param];
                                                                return (
                                                                    <Knob
                                                                        key={param}
                                                                        value={currentValue}
                                                                        onChange={(value) =>
                                                                            handleParameterChange(synth.id, param, value)
                                                                        }
                                                                        label={param.toUpperCase()}
                                                                        min={range[0]}
                                                                        max={range[1]}
                                                                        format="default"
                                                                    />
                                                                );
                                                            }
                                                        )}
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

