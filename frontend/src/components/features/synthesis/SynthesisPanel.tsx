/**
 * Synthesis Panel
 *
 * Synth voice management - create, edit, and control synth instances.
 * Shows active synths with their parameters.
 * Integrates with AudioEngineContext for real synth management.
 *
 * Uses professional Knob components in grid layout for parameters.
 */

import { useState, useEffect } from "react";
import { SubPanel } from "@/components/ui/sub-panel";
import { Knob } from "@/components/ui/knob";
import { Plus, Waves, Trash2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioEngine } from "@/contexts/AudioEngineContext";
import { api } from "@/services/api";

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

    // Handle play note - trigger a test note
    const handlePlayNote = async (synthId: string, note: number = 60) => {
        const synth = activeSynths.find(s => s.id === synthId);
        if (!synth) return;

        try {
            // Convert MIDI note to frequency (A4 = 440Hz = MIDI note 69)
            const freq = 440.0 * Math.pow(2, (note - 69) / 12);

            // Set frequency and trigger gate
            await api.audioEngine.updateSynth(synth.node_id.toString(), {
                parameters: { freq, gate: 1.0 },
            });

            // Release note after 500ms
            setTimeout(async () => {
                try {
                    await api.audioEngine.updateSynth(synth.node_id.toString(), {
                        parameters: { gate: 0.0 },
                    });
                } catch (error) {
                    console.error("Failed to release note:", error);
                }
            }, 500);
        } catch (error) {
            console.error("Failed to play note:", error);
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
                        <div className="p-4">
                            {/* Play Note Button */}
                            <div className="mb-4 flex gap-2">
                                <button
                                    onClick={() => handlePlayNote(selectedSynth.id, 60)}
                                    className="px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary text-primary transition-all flex items-center gap-2"
                                >
                                    <Play size={16} />
                                    <span className="text-sm font-semibold">Play C4</span>
                                </button>
                                <button
                                    onClick={() => handlePlayNote(selectedSynth.id, 64)}
                                    className="px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary text-primary transition-all flex items-center gap-2"
                                >
                                    <Play size={16} />
                                    <span className="text-sm font-semibold">Play E4</span>
                                </button>
                                <button
                                    onClick={() => handlePlayNote(selectedSynth.id, 67)}
                                    className="px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary text-primary transition-all flex items-center gap-2"
                                >
                                    <Play size={16} />
                                    <span className="text-sm font-semibold">Play G4</span>
                                </button>
                            </div>

                            {Object.keys(selectedSynth.parameters).length === 0 ? (
                                <div className="text-center text-sm text-muted-foreground py-8">
                                    No parameters available
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-4">
                                    {Object.entries(selectedSynth.parameters).map(([param, value]) => {
                                        if (typeof value !== "number") return null;

                                        // Determine format based on parameter name
                                        const format = param.toLowerCase().includes("pan") ? "pan" : "default";
                                        const min = param.toLowerCase().includes("pan") ? -1 : 0;
                                        const max = 1;

                                        return (
                                            <div key={param} className="flex justify-center">
                                                <Knob
                                                    value={value}
                                                    onChange={(v) => handleParameterChange(selectedSynth.id, param, v)}
                                                    label={param.replace(/_/g, " ")}
                                                    format={format}
                                                    min={min}
                                                    max={max}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
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

