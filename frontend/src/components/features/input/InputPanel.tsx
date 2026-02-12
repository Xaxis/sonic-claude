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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { Upload, Search, Folder, Music, Mic, Piano, Edit2, Trash2, Play } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import * as sampleApi from "@/services/sampleApi";
import type { SampleMetadata } from "@/services/sampleApi";
import { useAudioEngine } from "@/contexts/AudioEngineContext";
import * as audioInputApi from "@/services/audioInputApi";

interface AudioDeviceInfo {
    deviceId: string;
    label: string;
    kind: string;
}

// Use SampleMetadata from API, but extend with cached audio URL
interface Sample extends SampleMetadata {
    audioUrl?: string;
}

const SAMPLE_CATEGORIES = [
    "All",
    "Drums",
    "Bass",
    "Synth",
    "Vocals",
    "FX",
    "Loops",
    "Uncategorized",
];

export function InputPanel() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<"audio" | "midi" | "library">("audio");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    // Sample library state
    const [samples, setSamples] = useState<Sample[]>([]);
    const [isLoadingSamples, setIsLoadingSamples] = useState(false);
    const [editingSampleId, setEditingSampleId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [editingCategory, setEditingCategory] = useState("");

    // Audio input state
    const [audioInputDevices, setAudioInputDevices] = useState<AudioDeviceInfo[]>([]);
    const [selectedInputDevice, setSelectedInputDevice] = useState<string>("");
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

    // Recording refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const recordingStartTimeRef = useRef<number>(0);

    // MIDI state
    const [midiDevice, setMidiDevice] = useState("No MIDI Devices");
    const [midiThruEnabled, setMidiThruEnabled] = useState(true);
    const [quantizeEnabled, setQuantizeEnabled] = useState(false);

    // Enumerate audio input devices
    useEffect(() => {
        const enumerateDevices = async () => {
            try {
                // First request permission to get device labels
                const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // Now enumerate with labels
                const devices = await navigator.mediaDevices.enumerateDevices();

                const audioInputs = devices
                    .filter((device) => device.kind === "audioinput")
                    .map((device) => ({
                        deviceId: device.deviceId,
                        label: device.label || `Audio Input ${device.deviceId.slice(0, 5)}`,
                        kind: device.kind,
                    }));

                // Stop temp stream
                tempStream.getTracks().forEach((track) => track.stop());

                setAudioInputDevices(audioInputs);

                if (audioInputs.length > 0 && !selectedInputDevice) {
                    setSelectedInputDevice(audioInputs[0].deviceId);
                }

                console.log("Audio input devices detected:", audioInputs);
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

    // Load samples from backend on mount
    useEffect(() => {
        const loadSamples = async () => {
            setIsLoadingSamples(true);
            try {
                const samplesData = await sampleApi.getAllSamples();
                setSamples(samplesData.map(s => ({ ...s, audioUrl: undefined })));
                console.log(`✅ Loaded ${samplesData.length} samples from backend`);
            } catch (error) {
                console.error("Failed to load samples:", error);
                // Don't show error toast - samples might not be uploaded yet, which is fine
            } finally {
                setIsLoadingSamples(false);
            }
        };

        loadSamples();
    }, []);

    // Map device label to SuperCollider device index
    const getSupercolliderDeviceIndex = (deviceLabel: string): number => {
        // Map known devices to SuperCollider indices
        // SuperCollider device indices are based on the order shown in scsynth log
        if (deviceLabel.includes("BlackHole")) return 0;
        if (deviceLabel.includes("Microphone")) return 1;
        if (deviceLabel.includes("Speakers")) return 2;
        if (deviceLabel.includes("Multi-Output")) return 3;
        return 0; // Default to first device
    };

    // Start/stop audio input monitoring
    useEffect(() => {
        console.log("Audio monitoring effect triggered:", { isMonitoring, selectedInputDevice });

        if (!isMonitoring || !selectedInputDevice) {
            console.log(
                "Stopping audio input - monitoring:",
                isMonitoring,
                "device:",
                selectedInputDevice
            );
            stopAudioInput();
            stopSupercolliderInput();
            return;
        }

        console.log("Starting audio input...");
        startAudioInput();
        startSupercolliderInput();

        return () => {
            // Stop recording if active
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
            }
            stopAudioInput();
            stopSupercolliderInput();
        };
    }, [isMonitoring, selectedInputDevice]);

    const startAudioInput = async () => {
        try {
            console.log("startAudioInput called with input:", selectedInputDevice);

            // Create audio context
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
                console.log("Created new AudioContext");
            }

            console.log("Requesting getUserMedia...");
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedInputDevice ? { exact: selectedInputDevice } : undefined,
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

            const deviceLabel =
                audioInputDevices.find((d) => d.deviceId === selectedInputDevice)?.label || "Unknown";
            console.log("Audio input started successfully:", deviceLabel);
            toast.success(`Audio input started: ${deviceLabel}`);
        } catch (error) {
            console.error("Failed to start audio input:", error);
            toast.error("Failed to start audio input. Check permissions.");
        }
    };

    const startSupercolliderInput = async () => {
        try {
            const deviceLabel =
                audioInputDevices.find((d) => d.deviceId === selectedInputDevice)?.label || "";
            const scDeviceIndex = getSupercolliderDeviceIndex(deviceLabel);
            const ampLinear = Math.pow(10, gain / 20); // Convert dB to linear

            await audioInputApi.setInputDevice(scDeviceIndex, ampLinear);
            console.log(`✅ SuperCollider input set to device ${scDeviceIndex} (${deviceLabel})`);
        } catch (error) {
            // Silently ignore - backend may not be ready yet
        }
    };

    const stopSupercolliderInput = async () => {
        try {
            await audioInputApi.stopInput();
            console.log("✅ SuperCollider input stopped");
        } catch (error) {
            // Silently ignore - input may not be running, which is fine
            // This happens on mount when monitoring is not active
        }
    };

    const stopAudioInput = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
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

    const handleGainChange = async (value: number) => {
        setGain(value);
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = Math.pow(10, value / 20);
        }
        // Also update SuperCollider gain
        if (isMonitoring && selectedInputDevice) {
            try {
                const ampLinear = Math.pow(10, value / 20);
                await audioInputApi.setInputGain(ampLinear);
            } catch (error) {
                console.error("Failed to update SuperCollider gain:", error);
            }
        }
    };

    const handleStartRecording = async () => {
        if (!mediaStreamRef.current) {
            toast.error("No audio input active");
            return;
        }

        if (!isRecording) {
            // Start recording
            try {
                recordedChunksRef.current = [];
                recordingStartTimeRef.current = Date.now();

                const mediaRecorder = new MediaRecorder(mediaStreamRef.current, {
                    mimeType: MediaRecorder.isTypeSupported("audio/webm")
                        ? "audio/webm"
                        : "audio/ogg",
                });

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        recordedChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    const blob = new Blob(recordedChunksRef.current, {
                        type: mediaRecorder.mimeType,
                    });
                    const duration = (Date.now() - recordingStartTimeRef.current) / 1000;

                    // Create a File from the Blob
                    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
                    const fileName = `recording-${timestamp}.webm`;
                    const file = new File([blob], fileName, { type: blob.type });

                    const name = `Recording ${new Date().toLocaleTimeString()}`;

                    try {
                        // Upload to backend
                        toast.info("Saving recording...");
                        const metadata = await sampleApi.uploadSample(file, name, "Uncategorized");

                        // Update duration on backend
                        await sampleApi.updateSampleDuration(metadata.id, duration);

                        // Add to local state
                        setSamples((prev) => [{ ...metadata, duration, audioUrl: undefined }, ...prev]);
                        toast.success(`Recording saved: ${name}`);

                        // Switch to library tab to show the new recording
                        setActiveTab("library");
                    } catch (error) {
                        console.error("Failed to save recording:", error);
                        toast.error("Failed to save recording to server");
                    }
                };

                mediaRecorder.start(100); // Collect data every 100ms
                mediaRecorderRef.current = mediaRecorder;
                setIsRecording(true);
                toast.success("Recording started");
            } catch (error) {
                console.error("Failed to start recording:", error);
                toast.error("Failed to start recording");
            }
        } else {
            // Stop recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current = null;
                setIsRecording(false);
                toast.info("Recording stopped, processing...");
            }
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

            const name = file.name.replace(/\.[^/.]+$/, ""); // Remove extension

            try {
                // Upload to backend
                toast.info(`Uploading ${file.name}...`);
                const metadata = await sampleApi.uploadSample(file, name, "Uncategorized");

                // Try to get duration
                let duration = 0;
                try {
                    const tempContext = new AudioContext();
                    const arrayBuffer = await file.arrayBuffer();
                    const audioBuffer = await tempContext.decodeAudioData(arrayBuffer);
                    duration = audioBuffer.duration;
                    await tempContext.close();

                    // Update duration on backend
                    await sampleApi.updateSampleDuration(metadata.id, duration);
                } catch (error) {
                    console.warn("Could not decode audio duration:", error);
                }

                // Add to local state
                setSamples((prev) => [...prev, { ...metadata, duration, audioUrl: undefined }]);
                toast.success(`Added ${file.name}`);
            } catch (error) {
                console.error("Failed to upload sample:", error);
                toast.error(`Failed to upload ${file.name}`);
            }
        }

        // Reset input
        event.target.value = "";
    };

    const handleSampleDragStart = (sampleId: string) => {
        console.log("Drag sample:", sampleId);
        // TODO: Implement drag to sequencer/loop
    };

    const handlePlaySample = async (sample: Sample) => {
        try {
            // Create a temporary audio context for playback
            const playbackContext = new AudioContext();

            // Fetch audio from backend
            const audioUrl = sampleApi.getSampleDownloadUrl(sample.id);
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();

            // Decode the audio data
            const audioBuffer = await playbackContext.decodeAudioData(arrayBuffer);

            // Create a buffer source
            const source = playbackContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(playbackContext.destination);

            // Play the sample
            source.start(0);
            toast.success(`Playing ${sample.name}`);

            // Clean up when done
            source.onended = () => {
                playbackContext.close();
            };
        } catch (error) {
            console.error("Failed to play sample:", error);
            toast.error("Failed to play sample");
        }
    };

    const handleEditSample = (sample: Sample) => {
        setEditingSampleId(sample.id);
        setEditingName(sample.name);
        setEditingCategory(sample.category);
    };

    const handleSaveEdit = async () => {
        if (!editingSampleId) return;

        try {
            // Update on backend
            await sampleApi.updateSample(editingSampleId, {
                name: editingName,
                category: editingCategory,
            });

            // Update local state
            setSamples((prev) =>
                prev.map((s) =>
                    s.id === editingSampleId
                        ? { ...s, name: editingName, category: editingCategory }
                        : s
                )
            );

            setEditingSampleId(null);
            toast.success("Sample updated");
        } catch (error) {
            console.error("Failed to update sample:", error);
            toast.error("Failed to update sample");
        }
    };

    const handleCancelEdit = () => {
        setEditingSampleId(null);
    };

    const handleDeleteSample = async (sampleId: string) => {
        try {
            // Delete from backend
            await sampleApi.deleteSample(sampleId);

            // Remove from local state
            setSamples((prev) => prev.filter((s) => s.id !== sampleId));
            toast.success("Sample deleted");
        } catch (error) {
            console.error("Failed to delete sample:", error);
            toast.error("Failed to delete sample");
        }
    };

    // Filter samples
    const filteredSamples = samples.filter((sample) => {
        const matchesCategory = selectedCategory === "All" || sample.category === selectedCategory;
        const matchesSearch = sample.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="flex h-full flex-1 flex-col overflow-hidden">
            {/* Tab Buttons */}
            <div className="border-border flex gap-1 border-b p-2">
                <Button
                    onClick={() => setActiveTab("audio")}
                    variant={activeTab === "audio" ? "default" : "ghost"}
                    size="xs"
                >
                    <Mic size={12} />
                    AUDIO IN
                </Button>
                <Button
                    onClick={() => setActiveTab("midi")}
                    variant={activeTab === "midi" ? "default" : "ghost"}
                    size="xs"
                >
                    <Piano size={12} />
                    MIDI IN
                </Button>
                <Button
                    onClick={() => setActiveTab("library")}
                    variant={activeTab === "library" ? "default" : "ghost"}
                    size="xs"
                >
                    <Folder size={12} />
                    LIBRARY
                </Button>
            </div>

            {/* Content Area */}
            <div className="flex-1 space-y-2 overflow-auto p-2">
                {activeTab === "library" && (
                    <>
                        <SubPanel title="Search" collapsible>
                            <div className="space-y-2 p-2">
                                <div className="relative">
                                    <Search
                                        className="text-muted-foreground absolute top-1/2 left-2 z-10 -translate-y-1/2"
                                        size={14}
                                    />
                                    <Input
                                        type="text"
                                        placeholder="Search samples..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-8 w-full pl-8 text-xs"
                                    />
                                </div>
                                <Button
                                    onClick={() => document.getElementById('file-upload-input')?.click()}
                                    variant="default"
                                    size="sm"
                                    className="w-full"
                                >
                                    <Upload size={12} />
                                    UPLOAD FILES
                                </Button>
                                <input
                                    id="file-upload-input"
                                    type="file"
                                    multiple
                                    accept="audio/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </div>
                        </SubPanel>

                        <SubPanel title="Categories" collapsible>
                            <div className="flex flex-wrap gap-1 p-2">
                                {SAMPLE_CATEGORIES.map((cat) => (
                                    <Button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        variant={selectedCategory === cat ? "default" : "ghost"}
                                        size="xs"
                                    >
                                        {cat}
                                    </Button>
                                ))}
                            </div>
                        </SubPanel>

                        <SubPanel title={`Samples (${filteredSamples.length})`} collapsible>
                            <div className="divide-border divide-y">
                                {filteredSamples.length === 0 && (
                                    <div className="text-muted-foreground p-4 text-center text-xs">
                                        No samples. Upload audio files to get started.
                                    </div>
                                )}
                                {filteredSamples.map((sample) => (
                                    <div
                                        key={sample.id}
                                        className="hover:bg-muted/50 group p-2 transition-colors"
                                    >
                                        {editingSampleId === sample.id ? (
                                            // Edit mode
                                            <div className="space-y-2">
                                                <Input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    className="w-full"
                                                    placeholder="Sample name"
                                                />
                                                <Select
                                                    value={editingCategory}
                                                    onValueChange={setEditingCategory}
                                                >
                                                    <SelectTrigger className="h-8 w-full text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {SAMPLE_CATEGORIES.filter(
                                                            (c) => c !== "All"
                                                        ).map((cat) => (
                                                            <SelectItem key={cat} value={cat}>
                                                                {cat}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <div className="flex gap-1">
                                                    <Button
                                                        onClick={handleSaveEdit}
                                                        variant="default"
                                                        size="xs"
                                                        className="flex-1"
                                                    >
                                                        Save
                                                    </Button>
                                                    <Button
                                                        onClick={handleCancelEdit}
                                                        variant="ghost"
                                                        size="xs"
                                                        className="flex-1"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            // View mode
                                            <div className="flex items-center gap-2">
                                                <Music
                                                    size={14}
                                                    className="text-muted-foreground flex-shrink-0"
                                                />
                                                <div
                                                    className="min-w-0 flex-1 cursor-move"
                                                    draggable
                                                    onDragStart={() =>
                                                        handleSampleDragStart(sample.id)
                                                    }
                                                >
                                                    <div className="truncate text-xs">
                                                        {sample.name}
                                                    </div>
                                                    <div className="text-muted-foreground text-[10px]">
                                                        {sample.category} •{" "}
                                                        {sample.duration > 0
                                                            ? `${sample.duration.toFixed(1)}s`
                                                            : ""}
                                                        {sample.duration > 0 ? " • " : ""}
                                                        {(sample.size / 1024 / 1024).toFixed(2)} MB
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <Button
                                                        onClick={() => handlePlaySample(sample)}
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        title="Play"
                                                    >
                                                        <Play
                                                            size={12}
                                                            className="text-muted-foreground"
                                                        />
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleEditSample(sample)}
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        title="Edit"
                                                    >
                                                        <Edit2
                                                            size={12}
                                                            className="text-muted-foreground"
                                                        />
                                                    </Button>
                                                    <Button
                                                        onClick={() =>
                                                            handleDeleteSample(sample.id)
                                                        }
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        title="Delete"
                                                    >
                                                        <Trash2
                                                            size={12}
                                                            className="text-red-500"
                                                        />
                                                    </Button>
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
                        <SubPanel title="Input Device" collapsible>
                            <div className="p-2">
                                <Select
                                    value={selectedInputDevice}
                                    onValueChange={setSelectedInputDevice}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue
                                            placeholder={
                                                audioInputDevices.length === 0
                                                    ? "No input devices"
                                                    : "Select input device..."
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {audioInputDevices.map((device) => (
                                            <SelectItem
                                                key={device.deviceId}
                                                value={device.deviceId}
                                            >
                                                {device.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </SubPanel>

                        <SubPanel title="Spectrum" collapsible>
                            <div className="p-2">
                                <div className="flex h-16 items-end gap-0.5">
                                    {spectrumData.map((value, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 rounded-t transition-all duration-75"
                                            style={{
                                                height: `${value * 100}%`,
                                                backgroundColor:
                                                    value > 0.8
                                                        ? "hsl(0 85% 60%)"
                                                        : value > 0.5
                                                          ? "hsl(45 95% 60%)"
                                                          : "hsl(187 85% 55%)",
                                                boxShadow:
                                                    value > 0.5
                                                        ? `0 0 8px ${value > 0.8 ? "rgba(239, 68, 68, 0.5)" : "rgba(250, 204, 21, 0.5)"}`
                                                        : "0 0 6px rgba(0, 245, 255, 0.3)",
                                                minHeight: "2px",
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </SubPanel>

                        <SubPanel title="Input Level" collapsible>
                            <div className="space-y-2 p-2">
                                <div className="flex items-center gap-2">
                                    <div className="bg-background border-border h-4 flex-1 overflow-hidden rounded border">
                                        {/* Level meter - cyan to yellow to red */}
                                        <div
                                            className="h-full transition-all duration-75"
                                            style={{
                                                width: `${Math.max(0, Math.min(100, ((inputLevel + 60) / 60) * 100))}%`,
                                                backgroundColor:
                                                    inputLevel > -6
                                                        ? "hsl(0 85% 60%)"
                                                        : inputLevel > -12
                                                          ? "hsl(45 95% 60%)"
                                                          : "hsl(187 85% 55%)",
                                                boxShadow:
                                                    inputLevel > -12
                                                        ? `0 0 10px ${inputLevel > -6 ? "rgba(239, 68, 68, 0.5)" : "rgba(250, 204, 21, 0.5)"}`
                                                        : "0 0 8px rgba(0, 245, 255, 0.3)",
                                            }}
                                        />
                                    </div>
                                    <Label className="w-14 text-right text-xs">
                                        {inputLevel.toFixed(1)} dB
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label className="w-10 text-xs">
                                        Gain:
                                    </Label>
                                    <Slider
                                        min={-20}
                                        max={20}
                                        step={0.5}
                                        value={[gain]}
                                        onValueChange={(values) => handleGainChange(values[0])}
                                        className="flex-1"
                                    />
                                    <Label className="w-14 text-right text-xs">
                                        {gain > 0 ? "+" : ""}
                                        {gain.toFixed(1)} dB
                                    </Label>
                                </div>
                            </div>
                        </SubPanel>

                        <SubPanel title="Controls" collapsible>
                            <div className="space-y-2 p-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">MONITOR</Label>
                                    <Toggle
                                        checked={isMonitoring}
                                        onCheckedChange={setIsMonitoring}
                                    />
                                </div>
                                <Button
                                    onClick={handleStartRecording}
                                    variant={isRecording ? "destructive" : "default"}
                                    size="sm"
                                    className="w-full"
                                >
                                    <div
                                        className={`h-2 w-2 rounded-full ${isRecording ? "animate-pulse bg-white" : "bg-red-500"}`}
                                    />
                                    {isRecording ? "STOP" : "REC"}
                                </Button>
                            </div>
                        </SubPanel>
                    </>
                )}

                {activeTab === "midi" && (
                    <>
                        <SubPanel title="MIDI Device" collapsible>
                            <div className="space-y-2 p-2">
                                <Select value={midiDevice} onValueChange={setMidiDevice}>
                                    <SelectTrigger className="h-8 w-full text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No MIDI Devices</SelectItem>
                                        <SelectItem value="usb">USB MIDI Keyboard</SelectItem>
                                        <SelectItem value="virtual">Virtual MIDI Bus</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </SubPanel>

                        <SubPanel title="MIDI Activity" collapsible>
                            <div className="space-y-2 p-2">
                                <div className="flex items-center justify-between text-xs">
                                    <Label className="text-xs">Last Note:</Label>
                                    <Label className="text-xs">C4 (60)</Label>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <Label className="text-xs">Velocity:</Label>
                                    <Label className="text-xs">87</Label>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <Label className="text-xs">Channel:</Label>
                                    <Label className="text-xs">1</Label>
                                </div>
                                <div className="bg-background border-border flex h-8 items-center justify-center rounded border">
                                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                                </div>
                            </div>
                        </SubPanel>

                        <SubPanel title="Settings" collapsible>
                            <div className="space-y-2 p-2">
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs">Channel:</Label>
                                    <Select defaultValue="all">
                                        <SelectTrigger className="flex-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Channels</SelectItem>
                                            {Array.from({ length: 16 }, (_, i) => (
                                                <SelectItem key={i + 1} value={String(i + 1)}>
                                                    Channel {i + 1}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">Enable MIDI thru</Label>
                                    <Toggle
                                        checked={midiThruEnabled}
                                        onCheckedChange={setMidiThruEnabled}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">Quantize input</Label>
                                    <Toggle
                                        checked={quantizeEnabled}
                                        onCheckedChange={setQuantizeEnabled}
                                    />
                                </div>
                            </div>
                        </SubPanel>
                    </>
                )}
            </div>
        </div>
    );
}
