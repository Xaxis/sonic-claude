/**
 * Sequencer Panel
 *
 * Main sequencer/timeline interface for arranging clips and patterns.
 * Supports MIDI and audio clips with multi-track editing.
 */

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { SubPanel } from "@/components/ui/sub-panel";
import { Knob } from "@/components/ui/knob";
import { Plus, X, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";

// Backend API types (matching backend/routes/sequencer.py)
interface SequenceResponse {
    id: string;
    name: string;
    tempo: number;
    time_signature: [number, number];
    is_looping: boolean;
    loop_start: number;
    loop_end: number;
    clip_count: number;
}

interface PlaybackStateResponse {
    is_playing: boolean;
    current_sequence: string | null;
    playhead_position: number;
    tempo: number;
}

export function SequencerPanel() {
    const [sequences, setSequences] = useState<SequenceResponse[]>([]);
    const [selectedSequence, setSelectedSequence] = useState<string | null>(null);
    const [playbackState, setPlaybackState] = useState<PlaybackStateResponse>({
        is_playing: false,
        current_sequence: null,
        playhead_position: 0,
        tempo: 120,
    });
    const [newSequenceName, setNewSequenceName] = useState("");

    const baseURL = "http://localhost:8000";

    // Load sequences
    useEffect(() => {
        loadSequences();
        loadPlaybackState();
        // Poll playback state every 100ms
        const interval = setInterval(loadPlaybackState, 100);
        return () => clearInterval(interval);
    }, []);

    const loadSequences = async () => {
        try {
            const response = await fetch(`${baseURL}/audio/sequencer/sequences`);
            const data: SequenceResponse[] = await response.json();
            setSequences(data);
            if (data.length > 0 && !selectedSequence) {
                setSelectedSequence(data[0].id);
            }
        } catch (error) {
            console.error("Failed to load sequences:", error);
        }
    };

    const loadPlaybackState = async () => {
        try {
            const response = await fetch(`${baseURL}/audio/sequencer/state`);
            const data: PlaybackStateResponse = await response.json();
            setPlaybackState(data);
        } catch (error) {
            console.error("Failed to load playback state:", error);
        }
    };

    const handleCreateSequence = async () => {
        if (!newSequenceName.trim()) return;
        try {
            const response = await fetch(`${baseURL}/audio/sequencer/sequences`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newSequenceName,
                    tempo: 120,
                    time_signature: [4, 4],
                }),
            });
            const sequence: SequenceResponse = await response.json();
            setSequences([...sequences, sequence]);
            setSelectedSequence(sequence.id);
            setNewSequenceName("");
        } catch (error) {
            console.error("Failed to create sequence:", error);
        }
    };

    const handleDeleteSequence = async (sequenceId: string) => {
        try {
            await fetch(`${baseURL}/audio/sequencer/sequences/${sequenceId}`, {
                method: "DELETE",
            });
            setSequences(sequences.filter((s) => s.id !== sequenceId));
            if (selectedSequence === sequenceId) {
                setSelectedSequence(sequences[0]?.id || null);
            }
        } catch (error) {
            console.error("Failed to delete sequence:", error);
        }
    };

    const handlePlay = async () => {
        if (!selectedSequence) return;
        try {
            await fetch(`${baseURL}/audio/sequencer/sequences/${selectedSequence}/play`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ position: 0 }),
            });
        } catch (error) {
            console.error("Failed to play sequence:", error);
        }
    };

    const handleStop = async () => {
        try {
            await fetch(`${baseURL}/audio/sequencer/stop`, {
                method: "POST",
            });
        } catch (error) {
            console.error("Failed to stop playback:", error);
        }
    };

    const handleTempoChange = async (tempo: number) => {
        try {
            await fetch(`${baseURL}/audio/sequencer/tempo`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tempo }),
            });
            setPlaybackState({ ...playbackState, tempo });
        } catch (error) {
            console.error("Failed to set tempo:", error);
        }
    };

    const currentSequence = sequences.find((s) => s.id === selectedSequence);

    return (
        <Panel title="SEQUENCER" className="flex flex-col">
            <div className="flex-1 p-4 overflow-auto flex gap-4">
                {/* Sequence List */}
                <div className="w-1/3 flex flex-col gap-4">
                    <SubPanel title="SEQUENCES">
                        <div className="p-3">
                            {/* Create new sequence */}
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={newSequenceName}
                                    onChange={(e) => setNewSequenceName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleCreateSequence()}
                                    placeholder="New sequence name..."
                                    className="flex-1 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-cyan-500"
                                />
                                <button
                                    onClick={handleCreateSequence}
                                    className="p-1 bg-cyan-500 hover:bg-cyan-400 text-black rounded transition-colors"
                                    title="Create sequence"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Sequence list */}
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {sequences.map((sequence) => (
                                    <div
                                        key={sequence.id}
                                        className={cn(
                                            "p-2 rounded cursor-pointer transition-colors",
                                            selectedSequence === sequence.id
                                                ? "bg-cyan-500/20 border border-cyan-500"
                                                : "bg-gray-800/50 hover:bg-gray-700/50"
                                        )}
                                        onClick={() => setSelectedSequence(sequence.id)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-cyan-400 truncate">
                                                    {sequence.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {sequence.tempo} BPM • {sequence.time_signature[0]}/
                                                    {sequence.time_signature[1]} • {sequence.clip_count} clips
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSequence(sequence.id);
                                                }}
                                                className="flex-shrink-0 p-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                                                title="Delete sequence"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </SubPanel>
                </div>

                {/* Playback Controls & Info */}
                <div className="flex-1 flex flex-col gap-4">
                    <SubPanel title="PLAYBACK">
                        <div className="p-3">
                            {/* Transport controls */}
                            <div className="flex items-center gap-3 mb-4">
                                <button
                                    onClick={handlePlay}
                                    disabled={!selectedSequence}
                                    className={cn(
                                        "p-3 rounded transition-colors",
                                        playbackState.is_playing
                                            ? "bg-green-500/20 text-green-400"
                                            : "bg-gray-700 hover:bg-gray-600 text-gray-300",
                                        !selectedSequence && "opacity-50 cursor-not-allowed"
                                    )}
                                    title="Play"
                                >
                                    <Play className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={handleStop}
                                    className="p-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                                    title="Stop"
                                >
                                    <Square className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Playback info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">POSITION</div>
                                    <div className="text-2xl font-mono text-cyan-400">
                                        {playbackState.playhead_position.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">beats</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">STATUS</div>
                                    <div
                                        className={cn(
                                            "text-sm font-semibold",
                                            playbackState.is_playing ? "text-green-400" : "text-gray-400"
                                        )}
                                    >
                                        {playbackState.is_playing ? "PLAYING" : "STOPPED"}
                                    </div>
                                    {playbackState.current_sequence && (
                                        <div className="text-xs text-muted-foreground truncate">
                                            {sequences.find((s) => s.id === playbackState.current_sequence)?.name}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </SubPanel>

                    <SubPanel title="TEMPO">
                        <div className="p-3">
                            <div className="flex items-center justify-center">
                                <Knob
                                    value={playbackState.tempo}
                                    onChange={handleTempoChange}
                                    label="BPM"
                                    min={20}
                                    max={300}
                                    format="default"
                                />
                            </div>
                            <div className="text-center mt-2">
                                <div className="text-3xl font-mono text-cyan-400">
                                    {playbackState.tempo.toFixed(1)}
                                </div>
                                <div className="text-xs text-muted-foreground">BPM</div>
                            </div>
                        </div>
                    </SubPanel>

                    {currentSequence && (
                        <SubPanel title="SEQUENCE INFO">
                            <div className="p-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs text-muted-foreground mb-1">TIME SIGNATURE</div>
                                        <div className="text-lg font-mono text-cyan-400">
                                            {currentSequence.time_signature[0]}/{currentSequence.time_signature[1]}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground mb-1">LOOP RANGE</div>
                                        <div className="text-sm font-mono text-cyan-400">
                                            {currentSequence.loop_start} - {currentSequence.loop_end}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {currentSequence.is_looping ? "Looping" : "One-shot"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SubPanel>
                    )}
                </div>
            </div>
        </Panel>
    );
}

