/**
 * Synthesis Panel
 *
 * Synth voice management - create, edit, and control synth instances.
 * Shows active synths with their parameters.
 * Integrates with AudioEngineContext for real synth management.
 */

import { useState, useEffect } from "react";
import { SubPanel } from "@/components/ui/sub-panel";
import { Slider } from "@/components/ui/slider";
import { Plus, Waves, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioEngine } from "@/contexts/AudioEngineContext";

export function SynthesisPanel() {
    const {
        activeSynths,
        synthDefs,
        loadSynthDefs,
        createSynth,
        updateSynthParameter,
        deleteSynth,
    } = useAudioEngine();

    const [selectedSynthId, setSelectedSynthId] = useState<string | null>(null);

    // Load synth definitions on mount
    useEffect(() => {
        loadSynthDefs();
    }, [loadSynthDefs]);

    // Auto-select first synth if none selected
    useEffect(() => {
        if (!selectedSynthId && activeSynths.length > 0) {
            setSelectedSynthId(activeSynths[0].id);
        }
    }, [activeSynths, selectedSynthId]);

    // Handle adding a new synth
    const handleAddSynth = async () => {
        // For now, create a default synth
        // TODO: Show dialog to select synth type
        if (synthDefs.length > 0) {
            await createSynth(synthDefs[0].name);
        } else {
            console.warn("No synth definitions available");
        }
    };

    // Handle parameter change
    const handleParameterChange = async (synthId: string, param: string, value: number) => {
        const synth = activeSynths.find(s => s.id === synthId);
        if (synth) {
            await updateSynthParameter(synth.node_id, param, value);
        }
    };

    // Handle delete synth
    const handleDeleteSynth = async (synthId: string) => {
        const synth = activeSynths.find(s => s.id === synthId);
        if (synth) {
            await deleteSynth(synth.node_id);
            if (selectedSynthId === synthId) {
                setSelectedSynthId(null);
            }
        }
    };

    const selectedSynth = activeSynths.find(s => s.id === selectedSynthId);

    return (
        <div className="flex-1 flex gap-2 overflow-hidden h-full p-2">
            {/* Synth List */}
            <div className="w-64 flex flex-col gap-2">
                <SubPanel title="Active Synths" className="flex-1 overflow-auto">
                    <div className="flex flex-col gap-1 p-2">
                        {activeSynths.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No active synths
                            </div>
                        ) : (
                            activeSynths.map((synth) => (
                                <div
                                    key={synth.id}
                                    className={cn(
                                        "p-3 rounded-lg transition-all border group",
                                        selectedSynthId === synth.id
                                            ? "bg-primary/20 border-primary text-primary"
                                            : "bg-muted/30 border-border hover:bg-muted/50"
                                    )}
                                >
                                    <button
                                        onClick={() => setSelectedSynthId(synth.id)}
                                        className="w-full text-left"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold">{synth.synthdef}</span>
                                            <Waves size={16} className="text-muted-foreground" />
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Node: {synth.node_id} • {synth.is_playing ? "Playing" : "Stopped"}
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteSynth(synth.id)}
                                        className="mt-2 w-full p-1 rounded bg-destructive/20 hover:bg-destructive/30 text-destructive text-xs flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={12} />
                                        Delete
                                    </button>
                                </div>
                            ))
                        )}
                        <button
                            onClick={handleAddSynth}
                            className="p-3 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/10 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                        >
                            <Plus size={16} />
                            <span className="text-sm">Add Synth</span>
                        </button>
                    </div>
                </SubPanel>
            </div>

            {/* Synth Parameters */}
            {selectedSynth ? (
                <div className="flex-1 flex flex-col gap-2">
                    <SubPanel title={`${selectedSynth.synthdef} Parameters`} className="flex-1 overflow-auto">
                        <div className="p-4 space-y-4">
                            {Object.keys(selectedSynth.parameters).length === 0 ? (
                                <div className="text-center text-sm text-muted-foreground py-8">
                                    No parameters available
                                </div>
                            ) : (
                                Object.entries(selectedSynth.parameters).map(([param, value]) => (
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
                                                onChange={(v) => handleParameterChange(selectedSynth.id, param, v)}
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
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                        <Waves size={48} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Select a synth to edit parameters</p>
                    </div>
                </div>
            )}
        </div>
    );
}

