/**
 * Input Panel
 *
 * Unified input sources for the LOOP:
 * - Sample Library Browser
 * - Live Audio Input (Web Audio API)
 * - MIDI Input
 * - File Upload
 *
 * Everything that FEEDS the loop comes through here.
 */

import { SubPanel } from "@/components/ui/sub-panel";
import { Toggle } from "@/components/ui/toggle";
import { useState, useEffect, useRef } from "react";
import { Upload, Search, Folder, Music, Mic, Piano, Edit2, Trash2, Play } from "lucide-react";
import { useToast, ToastContainer } from "@/components/ui/toast";

interface AudioDeviceInfo {
    deviceId: string;
    label: string;
    kind: string;
}

interface Sample {
    id: string;
    name: string;
    category: string;
    duration: number; // seconds
    size: number; // bytes
    file: File;
    audioBuffer?: AudioBuffer;
}

const SAMPLE_CATEGORIES = ["All", "Drums", "Bass", "Synth", "Vocals", "FX", "Loops", "Uncategorized"];

export function InputPanel() {
    const { toasts, toast, removeToast } = useToast();
    const [activeTab, setActiveTab] = useState<"audio" | "midi" | "library">("audio");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    // Sample library state
    const [samples, setSamples] = useState<Sample[]>([]);
    const [editingSampleId, setEditingSampleId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [editingCategory, setEditingCategory] = useState("");

    // Audio input state
    const [audioInputDevices, setAudioInputDevices] = useState<AudioDeviceInfo[]>([]);
    const [audioOutputDevices, setAudioOutputDevices] = useState<AudioDeviceInfo[]>([]);
    const [selectedInputDevice, setSelectedInputDevice] = useState<string>("");
    const [selectedOutputDevice, setSelectedOutputDevice] = useState<string>("");
    const [isRecording, setIsRecording] = useState(false);
    const [inputLevel, setInputLevel] = useState(0);
    const [gain, setGain] = useState(0); // dB
    const [isMonitoring, setIsMonitoring] = useState(true); // Auto-start monitoring
    const [spectrumData, setSpectrumData] = useState<number[]>(new Array(32).fill(0));

    // Web Audio API refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // MIDI state
    const [midiDevice, setMidiDevice] = useState("No MIDI Devices");

    // Enumerate audio devices - both inputs and outputs
    useEffect(() => {
        const enumerateDevices = async () => {
            try {
                // First request permission to get device labels
                const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // Now enumerate with labels
                const devices = await navigator.mediaDevices.enumerateDevices();

                const audioInputs = devices
                    .filter(device => device.kind === "audioinput")
                    .map(device => ({
                        deviceId: device.deviceId,
                        label: device.label || `Audio Input ${device.deviceId.slice(0, 5)}`,
                        kind: device.kind,
                    }));

                const audioOutputs = devices
                    .filter(device => device.kind === "audiooutput")
                    .map(device => ({
                        deviceId: device.deviceId,
                        label: device.label || `Audio Output ${device.deviceId.slice(0, 5)}`,
                        kind: device.kind,
                    }));

                // Stop temp stream
                tempStream.getTracks().forEach(track => track.stop());

                setAudioInputDevices(audioInputs);
                setAudioOutputDevices(audioOutputs);

                if (audioInputs.length > 0 && !selectedInputDevice) {
                    setSelectedInputDevice(audioInputs[0].deviceId);
                }
                if (audioOutputs.length > 0 && !selectedOutputDevice) {
                    setSelectedOutputDevice(audioOutputs[0].deviceId);
                }

                console.log("Audio devices detected:", { inputs: audioInputs, outputs: audioOutputs });
            } catch (error) {
                console.error("Failed to enumerate audio devices:", error);
                toast.error("Failed to access audio devices. Grant microphone permission.");
            }
        };

        enumerateDevices();

        // Listen for device changes
        navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);
        return () => {
            navigator.mediaDevices.removeEventListener("devicechange", enumerateDevices);
        };
    }, []);

    // Start/stop audio input monitoring
    useEffect(() => {
        console.log("Audio monitoring effect triggered:", { isMonitoring, selectedInputDevice });

        if (!isMonitoring || !selectedInputDevice) {
            console.log("Stopping audio input - monitoring:", isMonitoring, "device:", selectedInputDevice);
            stopAudioInput();
            return;
        }

        console.log("Starting audio input...");
        startAudioInput();

        return () => {
            stopAudioInput();
        };
    }, [isMonitoring, selectedInputDevice, selectedOutputDevice]);

    const startAudioInput = async () => {
        try {
            console.log("startAudioInput called with input:", selectedInputDevice, "output:", selectedOutputDevice);

            // Create audio context
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
                console.log("Created new AudioContext");
            }

            // Determine which device to capture from
            // If output device is selected, try to capture from it (system audio)
            // Otherwise use input device (microphone)
            const deviceId = selectedOutputDevice || selectedInputDevice;

            console.log("Requesting getUserMedia...");
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: deviceId ? { exact: deviceId } : undefined,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });

            console.log("Got media stream:", stream, "tracks:", stream.getAudioTracks());
            mediaStreamRef.current = stream;

            // Create audio nodes
            const source = audioContextRef.current.createMediaStreamSource(stream);
            const analyser = audioContextRef.current.createAnalyser();
            const gainNode = audioContextRef.current.createGain();

            analyser.fftSize = 128; // Smaller FFT for mini spectrum (64 bins)
            analyser.smoothingTimeConstant = 0.8;

            // Set gain from dB
            gainNode.gain.value = Math.pow(10, gain / 20);

            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(analyser);

            analyserRef.current = analyser;
            gainNodeRef.current = gainNode;

            console.log("Audio nodes created and connected");

            // Start level monitoring and spectrum analysis
            updateInputLevel();

            const deviceLabel = audioInputDevices.find(d => d.deviceId === selectedInputDevice)?.label ||
                              audioOutputDevices.find(d => d.deviceId === selectedOutputDevice)?.label ||
                              "Unknown";
            console.log("Audio input started successfully:", deviceLabel);
            toast.success(`Audio input started: ${deviceLabel}`);
        } catch (error) {
            console.error("Failed to start audio input:", error);
            toast.error("Failed to start audio input. Check permissions.");
        }
    };

    const stopAudioInput = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        analyserRef.current = null;
        gainNodeRef.current = null;
        setInputLevel(0);
    };

    const updateInputLevel = () => {
        if (!analyserRef.current) return;

        // Get time domain data for level meter
        const timeData = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(timeData);

        // Calculate RMS level
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
            const normalized = (timeData[i] - 128) / 128;
            sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / timeData.length);
        const db = 20 * Math.log10(rms + 0.0001);

        setInputLevel(Math.max(-60, Math.min(0, db)));

        // Get frequency data for spectrum
        const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(freqData);

        // Downsample to 32 bars for mini spectrum
        const bars = 32;
        const barData: number[] = [];
        const samplesPerBar = Math.floor(freqData.length / bars);

        for (let i = 0; i < bars; i++) {
            let sum = 0;
            for (let j = 0; j < samplesPerBar; j++) {
                sum += freqData[i * samplesPerBar + j];
            }
            barData.push(sum / samplesPerBar / 255); // Normalize to 0-1
        }

        setSpectrumData(barData);

        animationFrameRef.current = requestAnimationFrame(updateInputLevel);
    };

    const handleGainChange = (value: number) => {
        setGain(value);
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = Math.pow(10, value / 20);
        }
    };

    const handleStartRecording = () => {
        if (!mediaStreamRef.current) {
            toast.error("No audio input active");
            return;
        }

        setIsRecording(!isRecording);

        if (!isRecording) {
            toast.success("Recording started");
            // TODO: Implement actual recording to backend
        } else {
            toast.success("Recording stopped");
            // TODO: Stop recording and save
        }
    };

    // Sample management functions
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith("audio/")) {
                toast.error(`${file.name} is not an audio file`);
                continue;
            }

            const sample: Sample = {
                id: `${Date.now()}-${i}`,
                name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                category: "Uncategorized",
                duration: 0, // Will be calculated when loaded
                size: file.size,
                file: file,
            };

            setSamples(prev => [...prev, sample]);
            toast.success(`Added ${file.name}`);
        }

        // Reset input
        event.target.value = "";
    };

    const handleSampleDragStart = (sampleId: string) => {
        console.log("Drag sample:", sampleId);
        // TODO: Implement drag to sequencer/loop
    };

    const handlePlaySample = async (sample: Sample) => {
        // TODO: Play sample preview
        toast.info(`Playing ${sample.name}`);
    };

    const handleEditSample = (sample: Sample) => {
        setEditingSampleId(sample.id);
        setEditingName(sample.name);
        setEditingCategory(sample.category);
    };

    const handleSaveEdit = () => {
        if (!editingSampleId) return;

        setSamples(prev => prev.map(s =>
            s.id === editingSampleId
                ? { ...s, name: editingName, category: editingCategory }
                : s
        ));

        setEditingSampleId(null);
        toast.success("Sample updated");
    };

    const handleCancelEdit = () => {
        setEditingSampleId(null);
    };

    const handleDeleteSample = (sampleId: string) => {
        setSamples(prev => prev.filter(s => s.id !== sampleId));
        toast.success("Sample deleted");
    };

    // Filter samples
    const filteredSamples = samples.filter(sample => {
        const matchesCategory = selectedCategory === "All" || sample.category === selectedCategory;
        const matchesSearch = sample.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="flex-1 flex flex-col overflow-hidden h-full">
                {/* Tab Buttons */}
                <div className="flex gap-1 p-2 border-b border-border">
                    <button
                        onClick={() => setActiveTab("audio")}
                        className={`flex items-center gap-1 px-3 py-1 text-xs font-mono rounded transition-colors ${
                            activeTab === "audio"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                        <Mic size={12} />
                        AUDIO IN
                    </button>
                    <button
                        onClick={() => setActiveTab("midi")}
                        className={`flex items-center gap-1 px-3 py-1 text-xs font-mono rounded transition-colors ${
                            activeTab === "midi"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                        <Piano size={12} />
                        MIDI IN
                    </button>
                    <button
                        onClick={() => setActiveTab("library")}
                        className={`flex items-center gap-1 px-3 py-1 text-xs font-mono rounded transition-colors ${
                            activeTab === "library"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                        <Folder size={12} />
                        LIBRARY
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-2 space-y-2">
                    {activeTab === "library" && (
                        <>
                            {/* Search and Upload */}
                            <SubPanel title="Search">
                                <div className="p-2 space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Search samples..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-background border border-border rounded pl-8 pr-2 py-1 text-xs"
                                        />
                                    </div>
                                    <label className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-mono hover:bg-primary/90 cursor-pointer">
                                        <Upload size={12} />
                                        UPLOAD FILES
                                        <input
                                            type="file"
                                            multiple
                                            accept="audio/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </SubPanel>

                            {/* Categories */}
                            <SubPanel title="Categories">
                                <div className="p-2 flex flex-wrap gap-1">
                                    {SAMPLE_CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                                selectedCategory === cat
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </SubPanel>

                            {/* Sample List */}
                            <SubPanel title={`Samples (${filteredSamples.length})`}>
                                <div className="divide-y divide-border">
                                    {filteredSamples.length === 0 && (
                                        <div className="p-4 text-center text-xs text-muted-foreground">
                                            No samples. Upload audio files to get started.
                                        </div>
                                    )}
                                    {filteredSamples.map(sample => (
                                        <div
                                            key={sample.id}
                                            className="p-2 hover:bg-muted/50 transition-colors group"
                                        >
                                            {editingSampleId === sample.id ? (
                                                // Edit mode
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono"
                                                        placeholder="Sample name"
                                                    />
                                                    <select
                                                        value={editingCategory}
                                                        onChange={(e) => setEditingCategory(e.target.value)}
                                                        className="w-full bg-background border border-border rounded px-2 py-1 text-xs"
                                                    >
                                                        {SAMPLE_CATEGORIES.filter(c => c !== "All").map(cat => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={handleSaveEdit}
                                                            className="flex-1 bg-primary text-primary-foreground px-2 py-1 rounded text-xs hover:bg-primary/90"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="flex-1 bg-muted text-muted-foreground px-2 py-1 rounded text-xs hover:bg-muted/80"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                // View mode
                                                <div className="flex items-center gap-2">
                                                    <Music size={14} className="text-muted-foreground flex-shrink-0" />
                                                    <div
                                                        className="flex-1 min-w-0 cursor-move"
                                                        draggable
                                                        onDragStart={() => handleSampleDragStart(sample.id)}
                                                    >
                                                        <div className="text-xs font-mono truncate">{sample.name}</div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {sample.category} • {(sample.size / 1024 / 1024).toFixed(2)} MB
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handlePlaySample(sample)}
                                                            className="p-1 hover:bg-background rounded"
                                                            title="Play"
                                                        >
                                                            <Play size={12} className="text-muted-foreground" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditSample(sample)}
                                                            className="p-1 hover:bg-background rounded"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={12} className="text-muted-foreground" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSample(sample.id)}
                                                            className="p-1 hover:bg-background rounded"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={12} className="text-red-500" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SubPanel>
                        </>
                    )}

                    {activeTab === "audio" && (
                        <>
                            {/* Input Device Selection */}
                            <SubPanel title="Input Device">
                                <div className="p-2">
                                    <select
                                        value={selectedInputDevice}
                                        onChange={(e) => setSelectedInputDevice(e.target.value)}
                                        className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono"
                                    >
                                        {audioInputDevices.length === 0 && (
                                            <option value="">No input devices</option>
                                        )}
                                        {audioInputDevices.map(device => (
                                            <option key={device.deviceId} value={device.deviceId}>
                                                {device.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </SubPanel>

                            {/* Output Device Selection (for system audio capture) */}
                            <SubPanel title="Output Device">
                                <div className="p-2">
                                    <select
                                        value={selectedOutputDevice}
                                        onChange={(e) => setSelectedOutputDevice(e.target.value)}
                                        className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono"
                                    >
                                        <option value="">None</option>
                                        {audioOutputDevices.map(device => (
                                            <option key={device.deviceId} value={device.deviceId}>
                                                {device.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </SubPanel>

                            {/* Mini Spectrum Analyzer */}
                            <SubPanel title="Spectrum">
                                <div className="p-2">
                                    <div className="h-16 flex items-end gap-0.5">
                                        {spectrumData.map((value, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 rounded-t transition-all duration-75"
                                                style={{
                                                    height: `${value * 100}%`,
                                                    backgroundColor: value > 0.8 ? "#ef4444" : value > 0.5 ? "#eab308" : "#22c55e",
                                                    minHeight: "2px"
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </SubPanel>

                            {/* Input Level */}
                            <SubPanel title="Input Level">
                                <div className="p-2 space-y-2">
                                    <div className="flex gap-2 items-center">
                                        <div className="flex-1 h-4 bg-background border border-border rounded overflow-hidden">
                                            {/* Level meter - green to yellow to red */}
                                            <div
                                                className="h-full transition-all duration-75"
                                                style={{
                                                    width: `${Math.max(0, Math.min(100, ((inputLevel + 60) / 60) * 100))}%`,
                                                    backgroundColor: inputLevel > -6 ? "#ef4444" : inputLevel > -12 ? "#eab308" : "#22c55e"
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono text-muted-foreground w-14 text-right">
                                            {inputLevel.toFixed(1)} dB
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-10">Gain:</span>
                                        <input
                                            type="range"
                                            min="-20"
                                            max="20"
                                            step="0.5"
                                            value={gain}
                                            onChange={(e) => handleGainChange(parseFloat(e.target.value))}
                                            className="flex-1"
                                        />
                                        <span className="text-xs font-mono w-14 text-right">
                                            {gain > 0 ? "+" : ""}{gain.toFixed(1)} dB
                                        </span>
                                    </div>
                                </div>
                            </SubPanel>

                            {/* Controls */}
                            <SubPanel title="Controls">
                                <div className="p-2 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono text-muted-foreground">MONITOR</span>
                                        <Toggle
                                            checked={isMonitoring}
                                            onCheckedChange={setIsMonitoring}
                                        />
                                    </div>
                                    <button
                                        onClick={handleStartRecording}
                                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-mono transition-colors ${
                                            isRecording
                                                ? "bg-red-500 text-white hover:bg-red-600"
                                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                                        }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${isRecording ? "bg-white animate-pulse" : "bg-red-500"}`} />
                                        {isRecording ? "STOP" : "REC"}
                                    </button>
                                </div>
                            </SubPanel>
                        </>
                    )}

                    {activeTab === "midi" && (
                        <>
                            {/* Device Selection */}
                            <SubPanel title="MIDI Device">
                                <div className="p-2 space-y-2">
                                    <select
                                        value={midiDevice}
                                        onChange={(e) => setMidiDevice(e.target.value)}
                                        className="w-full bg-background border border-border rounded px-2 py-1 text-xs"
                                    >
                                        <option>No MIDI Devices</option>
                                        <option>USB MIDI Keyboard</option>
                                        <option>Virtual MIDI Bus</option>
                                    </select>
                                </div>
                            </SubPanel>

                            {/* MIDI Activity */}
                            <SubPanel title="MIDI Activity">
                                <div className="p-2 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Last Note:</span>
                                        <span className="font-mono">C4 (60)</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Velocity:</span>
                                        <span className="font-mono">87</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Channel:</span>
                                        <span className="font-mono">1</span>
                                    </div>
                                    <div className="h-8 bg-background border border-border rounded flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    </div>
                                </div>
                            </SubPanel>

                            {/* MIDI Settings */}
                            <SubPanel title="Settings">
                                <div className="p-2 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Channel:</span>
                                        <select className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs">
                                            <option>All Channels</option>
                                            {Array.from({ length: 16 }, (_, i) => (
                                                <option key={i + 1} value={i + 1}>
                                                    Channel {i + 1}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <label className="flex items-center gap-2 text-xs">
                                        <input type="checkbox" defaultChecked />
                                        <span>Enable MIDI thru</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs">
                                        <input type="checkbox" />
                                        <span>Quantize input</span>
                                    </label>
                                </div>
                            </SubPanel>
                        </>
                    )}
                </div>
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
    );
}
