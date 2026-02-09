/**
 * Live Transcription Component
 * Real-time audio-to-Sonic-Pi transcription with stem separation
 */
import { useState, useEffect, useCallback } from "react";
import { Play, Square, Loader2, Music, Send, X, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import type { LiveTranscriptionResult, TranscriptionSettings, AudioDevice } from "@/types";

interface LiveTranscriptionProps {
    onSendToTimeline?: (result: LiveTranscriptionResult) => void;
}

interface TranscriptionHistoryItem {
    id: string;
    timestamp: number;
    result: LiveTranscriptionResult;
    deviceName: string;
    selected: boolean;
}

export function LiveTranscription({ onSendToTimeline }: LiveTranscriptionProps) {
    const [devices, setDevices] = useState<AudioDevice[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [status, setStatus] = useState<string>("idle");
    const [result, setResult] = useState<LiveTranscriptionResult | null>(null);
    const [history, setHistory] = useState<TranscriptionHistoryItem[]>([]);
    const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
    const [settings, setSettings] = useState<TranscriptionSettings>({
        sample_rate: 48000,
        chunk_duration: 5.0,
        enable_source_separation: true,
        enable_beat_detection: true,
        enable_key_detection: true,
        min_note_duration: 0.1,
        onset_threshold: 0.5,
    });

    // Load history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("transcription-history");
        if (saved) {
            try {
                setHistory(JSON.parse(saved));
            } catch (error) {
                console.error("Failed to load transcription history:", error);
            }
        }
    }, []);

    // Save history to localStorage
    useEffect(() => {
        if (history.length > 0) {
            localStorage.setItem("transcription-history", JSON.stringify(history));
        }
    }, [history]);

    // Load audio devices
    useEffect(() => {
        loadDevices();
    }, []);

    const loadDevices = async () => {
        try {
            const deviceList = await api.getAudioDevices();
            setDevices(deviceList);
            if (deviceList.length > 0 && selectedDevice === null) {
                setSelectedDevice(deviceList[0].index);
            }
        } catch (error) {
            console.error("Failed to load audio devices:", error);
            setDevices([]);
        }
    };

    const handleStart = async () => {
        if (selectedDevice === null) {
            alert("Please select an audio input device");
            return;
        }

        try {
            setIsTranscribing(true);
            setStatus("starting");

            console.log("🎤 Starting transcription with device:", selectedDevice, "duration:", settings.chunk_duration);

            const response = await api.startTranscription({
                device_index: selectedDevice,
                buffer_duration: settings.chunk_duration,
            });

            console.log("✅ Transcription started:", response);
            setStatus(response.status);

            // Poll for results
            pollTranscriptionStatus();
        } catch (error: any) {
            console.error("❌ Failed to start transcription:", error);
            console.error("Error details:", error.message, error.response);
            setIsTranscribing(false);
            setStatus("error");
            alert(`Failed to start transcription: ${error.message || "Unknown error"}`);
        }
    };

    const handleStop = async () => {
        try {
            await api.stopTranscription();
            setIsTranscribing(false);
            setStatus("stopped");
        } catch (error) {
            console.error("Failed to stop transcription:", error);
        }
    };

    const pollTranscriptionStatus = useCallback(() => {
        const interval = setInterval(async () => {
            try {
                const statusData = await api.getTranscriptionStatus();
                console.log("Transcription status:", statusData);
                setStatus(statusData.status);

                if (statusData.result) {
                    console.log("Got transcription result:", statusData.result);
                    setResult(statusData.result);

                    // Add to history
                    const deviceName = devices.find(d => d.index === selectedDevice)?.name || "Unknown Device";
                    const historyItem: TranscriptionHistoryItem = {
                        id: `trans-${Date.now()}`,
                        timestamp: Date.now(),
                        result: statusData.result,
                        deviceName,
                        selected: false,
                    };
                    setHistory(prev => [historyItem, ...prev]);
                    setSelectedHistoryId(historyItem.id);

                    clearInterval(interval);
                    setIsTranscribing(false);
                }

                if (statusData.status === "complete" || statusData.status === "error") {
                    clearInterval(interval);
                    setIsTranscribing(false);
                }
            } catch (error) {
                console.error("Failed to poll status:", error);
                clearInterval(interval);
                setIsTranscribing(false);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [devices, selectedDevice]);

    const handleSendToTimeline = () => {
        if (result && onSendToTimeline) {
            onSendToTimeline(result);
        }
    };

    const handleSendToSonicPi = async () => {
        if (result?.combined_code) {
            try {
                await api.sendCodeToSonicPi(result.combined_code);
                alert("Code sent to Sonic Pi!");
            } catch (error) {
                console.error("Failed to send to Sonic Pi:", error);
                alert("Failed to send to Sonic Pi");
            }
        }
    };

    const handleSelectHistoryItem = (id: string) => {
        const item = history.find(h => h.id === id);
        if (item) {
            setSelectedHistoryId(id);
            setResult(item.result);
        }
    };

    const handleToggleSelection = (id: string) => {
        setHistory(prev => prev.map(item =>
            item.id === id ? { ...item, selected: !item.selected } : item
        ));
    };

    const handleDeleteHistoryItem = (id: string) => {
        setHistory(prev => prev.filter(item => item.id !== id));
        if (selectedHistoryId === id) {
            setSelectedHistoryId(null);
            setResult(null);
        }
    };

    const handleClearHistory = () => {
        if (confirm("Clear all transcription history?")) {
            setHistory([]);
            setSelectedHistoryId(null);
            setResult(null);
            localStorage.removeItem("transcription-history");
        }
    };

    const handleSendSelectedToTimeline = () => {
        const selectedItems = history.filter(item => item.selected);
        if (selectedItems.length === 0) {
            alert("No transcriptions selected");
            return;
        }

        // For now, send each selected transcription separately
        // TODO: Merge multiple transcriptions into one timeline
        selectedItems.forEach(item => {
            if (onSendToTimeline) {
                onSendToTimeline(item.result);
            }
        });
    };

    return (
        <div className="flex h-full gap-4 p-4">
            {/* Left Panel - History */}
            <div className="flex w-80 flex-col gap-4">
                {/* Header */}
                <div className="from-primary/5 to-secondary/5 rounded-lg border border-primary/10 bg-gradient-to-r p-4">
                    <h2 className="text-primary mb-2 text-lg font-bold">Live Audio Transcription</h2>
                    <p className="text-muted-foreground text-sm">
                        Capture audio, separate into stems, detect notes
                    </p>
                </div>

                {/* Controls */}
                <div className="panel-glass flex flex-col gap-4 rounded-lg p-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex-1">
                            <label className="text-primary mb-2 block text-sm font-medium">Audio Input Device</label>
                            <Select
                                value={selectedDevice?.toString() || ""}
                                onChange={(e) => setSelectedDevice(parseInt(e.target.value))}
                            >
                                <option value="">Select device...</option>
                                {devices.map((device) => (
                                    <option key={device.index} value={device.index}>
                                        {device.name}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <div className="flex gap-2">
                            {!isTranscribing ? (
                                <Button onClick={handleStart} disabled={!selectedDevice} className="flex-1">
                                    <Play className="mr-2 h-4 w-4" />
                                    Start
                                </Button>
                            ) : (
                                <Button onClick={handleStop} variant="destructive" className="flex-1">
                                    <Square className="mr-2 h-4 w-4" />
                                    Stop
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Status */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            {isTranscribing && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                            <span className="text-xs text-muted-foreground">
                                Status: <span className="text-primary font-medium capitalize">{status}</span>
                            </span>
                        </div>
                        {isTranscribing && (
                            <div className="text-xs text-muted-foreground">
                                {status === "listening" && "🎤 Capturing audio..."}
                                {status === "analyzing" && "🔍 Analyzing..."}
                                {status === "separating" && "🎵 Separating stems..."}
                                {status === "transcribing" && "📝 Detecting notes..."}
                                {status === "complete" && "✅ Complete!"}
                            </div>
                        )}
                    </div>
                </div>

                {/* History List */}
                <div className="panel-glass flex flex-1 flex-col overflow-hidden rounded-lg">
                    <div className="flex items-center justify-between border-b border-primary/10 p-3">
                        <h3 className="text-primary text-sm font-bold">History ({history.length})</h3>
                        <div className="flex gap-1">
                            {history.some(h => h.selected) && (
                                <Button onClick={handleSendSelectedToTimeline} size="sm" variant="outline">
                                    <Send className="h-3 w-3" />
                                </Button>
                            )}
                            <Button onClick={handleClearHistory} size="sm" variant="outline" disabled={history.length === 0}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-2">
                        {history.length === 0 ? (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-muted-foreground text-xs">No transcriptions yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {history.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                                            selectedHistoryId === item.id
                                                ? "border-primary bg-primary/10"
                                                : "border-primary/10 bg-primary/5 hover:bg-primary/10"
                                        }`}
                                        onClick={() => handleSelectHistoryItem(item.id)}
                                    >
                                        <div className="mb-2 flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="text-primary text-xs font-medium">
                                                    {new Date(item.timestamp).toLocaleTimeString()}
                                                </p>
                                                <p className="text-muted-foreground text-xs">{item.deviceName}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleSelection(item.id);
                                                    }}
                                                    className={`rounded p-1 transition-colors ${
                                                        item.selected
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-primary/20 text-primary hover:bg-primary/30"
                                                    }`}
                                                >
                                                    <Check className="h-3 w-3" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteHistoryItem(item.id);
                                                    }}
                                                    className="rounded bg-destructive/20 p-1 text-destructive transition-colors hover:bg-destructive/30"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {item.result.stems.map((stem, i) => (
                                                <span key={i} className="rounded bg-primary/20 px-2 py-0.5 text-xs text-primary">
                                                    {stem.stem_type}: {stem.notes.length}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel - Results */}
            <div className="flex flex-1 flex-col gap-4">

            {/* Results */}
            {result && (
                <div className="panel-glass flex-1 overflow-auto rounded-lg p-4">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-primary text-lg font-bold">Transcription Results</h3>
                        <div className="flex gap-2">
                            <Button onClick={handleSendToTimeline} size="sm">
                                <Send className="mr-2 h-4 w-4" />
                                Send to Timeline
                            </Button>
                            <Button onClick={handleSendToSonicPi} size="sm" variant="outline">
                                <Music className="mr-2 h-4 w-4" />
                                Play in Sonic Pi
                            </Button>

                        </div>
                    </div>

                    {/* Stems */}
                    <div className="space-y-4">
                        {result.stems.map((stem, index) => (
                            <div key={index} className="rounded-lg border border-primary/10 bg-primary/5 p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <h4 className="text-primary font-bold">{stem.stem_type.toUpperCase()}</h4>
                                    <span className="text-muted-foreground text-sm">
                                        {stem.notes.length} notes detected
                                    </span>
                                </div>

                                {stem.tempo && (
                                    <p className="text-muted-foreground text-sm">
                                        Tempo: {stem.tempo.toFixed(1)} BPM
                                    </p>
                                )}

                                {stem.key && (
                                    <p className="text-muted-foreground text-sm">
                                        Key: {stem.key}
                                    </p>
                                )}

                                {stem.notes.length > 0 && (
                                    <div className="mt-2 max-h-32 overflow-auto">
                                        <div className="flex flex-wrap gap-1">
                                            {stem.notes.slice(0, 20).map((note, i) => (
                                                <span
                                                    key={i}
                                                    className="rounded bg-primary/20 px-2 py-1 text-xs text-primary"
                                                >
                                                    {note.note_name}
                                                </span>
                                            ))}
                                            {stem.notes.length > 20 && (
                                                <span className="text-muted-foreground px-2 py-1 text-xs">
                                                    +{stem.notes.length - 20} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Generated Code Preview */}
                    {result.combined_code && (
                        <div className="mt-4 rounded-lg border border-primary/10 bg-primary/5 p-4">
                            <h4 className="text-primary mb-2 font-bold">Generated Sonic Pi Code</h4>
                            <pre className="max-h-64 overflow-auto rounded bg-background/50 p-3 text-xs">
                                <code>{result.combined_code}</code>
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!result && !isTranscribing && (
                <div className="panel-glass flex flex-1 items-center justify-center rounded-lg">
                    <div className="text-center">
                        <Music className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
                        <p className="text-muted-foreground text-sm">
                            {history.length > 0
                                ? "Select a transcription from history to view details"
                                : "Start a transcription to begin"}
                        </p>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

