import { useState, useEffect, useRef } from "react";
import {
    Mic,
    Square,
    Play,
    Pause,
    Trash2,
    Edit2,
    Sparkles,
    Activity,
    BarChart3,
    Volume2,
    Paperclip,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { useSpectralData } from "@/contexts/SpectralDataContext";
import type { Sample, SpectralFeatures, SynthesisParameters } from "@/types";

type DecompositionMode = "spectral" | "harmonics" | "envelope" | "perceptual";

export function SampleStudio() {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingName, setRecordingName] = useState("");
    const [samples, setSamples] = useState<Sample[]>([]);
    const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
    const [spectralFeatures, setSpectralFeatures] = useState<SpectralFeatures | null>(null);
    const [synthesisParams, setSynthesisParams] = useState<SynthesisParameters | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [decompositionMode, setDecompositionMode] = useState<DecompositionMode>("spectral");
    const [selectedFeatures, setSelectedFeatures] = useState({
        spectral: true,
        harmonics: true,
        envelope: true,
        perceptual: true,
        fullSpectrum: false,
    });
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { attachSpectralData, detachSpectralData, isAttached } = useSpectralData();

    // Load samples on mount
    useEffect(() => {
        loadSamples();
    }, []);

    const loadSamples = async () => {
        try {
            const sampleList = await api.listSamples();
            setSamples(sampleList);
        } catch (error) {
            console.error("Failed to load samples:", error);
        }
    };

    const handleStartRecording = async () => {
        try {
            await api.startRecording(recordingName || "Untitled");
            setIsRecording(true);
        } catch (error) {
            console.error("Failed to start recording:", error);
        }
    };

    const handleStopRecording = async () => {
        try {
            const result = await api.stopRecording();
            setIsRecording(false);
            setRecordingName("");
            await loadSamples();
            setSelectedSample(result.sample);
        } catch (error) {
            console.error("Failed to stop recording:", error);
        }
    };

    const handleDeleteSample = async (sampleId: string) => {
        try {
            await api.deleteSample(sampleId);
            await loadSamples();
            if (selectedSample?.id === sampleId) {
                setSelectedSample(null);
                setSpectralFeatures(null);
                setSynthesisParams(null);
            }
        } catch (error) {
            console.error("Failed to delete sample:", error);
        }
    };

    const handleAnalyzeSample = async () => {
        if (!selectedSample) return;

        setIsAnalyzing(true);
        try {
            const features = await api.analyzeSample(selectedSample.id);
            setSpectralFeatures(features);
        } catch (error) {
            console.error("Failed to analyze sample:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSynthesizeSample = async () => {
        if (!selectedSample) return;

        setIsSynthesizing(true);
        try {
            const params = await api.synthesizeSample(selectedSample.id);
            setSynthesisParams(params);
        } catch (error) {
            console.error("Failed to synthesize sample:", error);
        } finally {
            setIsSynthesizing(false);
        }
    };

    const handlePlaySample = async () => {
        if (!selectedSample) {
            console.log("❌ No sample selected");
            return;
        }

        console.log("🎵 handlePlaySample called for:", selectedSample.id, "isPlaying:", isPlaying);

        if (isPlaying && audioRef.current) {
            console.log("⏸️ Pausing audio");
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
            return;
        }

        try {
            const audioUrl = `http://localhost:8000/samples/${selectedSample.id}/audio`;
            console.log("📡 Loading audio from:", audioUrl);

            // Stop and cleanup existing audio
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.removeAttribute("src");
                audioRef.current.load();
                audioRef.current = null;
            }

            // Create new audio element
            const audio = new Audio();
            audio.crossOrigin = "anonymous";
            audio.preload = "auto";

            audio.addEventListener("loadeddata", () => {
                console.log("✅ Audio loaded successfully, duration:", audio.duration);
            });

            audio.addEventListener("ended", () => {
                console.log("🏁 Audio playback ended");
                setIsPlaying(false);
            });

            audio.addEventListener("error", (e) => {
                console.error("❌ Audio error event:", e);
                if (audio.error) {
                    console.error("Error code:", audio.error.code);
                    console.error("Error message:", audio.error.message);
                }
                setIsPlaying(false);
            });

            audio.addEventListener("canplay", () => {
                console.log("🎶 Audio can play");
            });

            audio.src = audioUrl;
            audioRef.current = audio;

            console.log("▶️ Attempting to play audio...");
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                await playPromise;
                console.log("✅ Audio playing!");
                setIsPlaying(true);
            }
        } catch (error: any) {
            console.error("❌ Failed to play audio:", error);
            console.error("Error name:", error.name);
            console.error("Error message:", error.message);
            setIsPlaying(false);
        }
    };

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handleTestTone = async () => {
        try {
            console.log("🔊 Playing test tone...");
            const audio = new Audio("http://localhost:8000/samples/test-tone");
            await audio.play();
            console.log("✅ Test tone playing");
        } catch (error) {
            console.error("❌ Test tone failed:", error);
        }
    };

    const handleAttachToChat = () => {
        if (!selectedSample || !spectralFeatures) {
            console.warn("⚠️ No sample or spectral features to attach");
            return;
        }

        attachSpectralData({
            sampleName: selectedSample.name,
            sampleId: selectedSample.id,
            features: spectralFeatures,
            selectedFeatures,
        });
    };

    const handleDetachFromChat = () => {
        detachSpectralData();
    };

    return (
        <div className="flex h-full flex-col gap-3 overflow-auto p-4">
            {/* Test Audio Button */}
            <Button onClick={handleTestTone} size="sm" variant="outline" className="h-7 gap-1.5">
                <Volume2 className="h-3.5 w-3.5" />
                TEST AUDIO (440Hz)
            </Button>

            {/* Recording Controls */}
            <div className="space-y-2">
                <div className="text-muted-foreground text-xs font-medium tracking-wider">
                    RECORDING
                </div>
                <div className="flex gap-2">
                    <Input
                        placeholder="Sample name..."
                        value={recordingName}
                        onChange={(e) => setRecordingName(e.target.value)}
                        disabled={isRecording}
                        className="h-8 flex-1 text-sm"
                    />
                    {!isRecording ? (
                        <Button onClick={handleStartRecording} size="sm" className="gap-1.5">
                            <Mic className="h-3.5 w-3.5" />
                            REC
                        </Button>
                    ) : (
                        <Button
                            onClick={handleStopRecording}
                            size="sm"
                            variant="destructive"
                            className="animate-pulse gap-1.5"
                        >
                            <Square className="h-3.5 w-3.5" />
                            STOP
                        </Button>
                    )}
                </div>
            </div>

            {/* Sample Library */}
            <div className="min-h-0 flex-1 space-y-2">
                <div className="text-muted-foreground text-xs font-medium tracking-wider">
                    SAMPLE LIBRARY ({samples.length})
                </div>
                <div className="max-h-[200px] space-y-1 overflow-auto pr-2">
                    {samples.map((sample) => (
                        <div
                            key={sample.id}
                            className={`cursor-pointer rounded border p-2 transition-colors ${
                                selectedSample?.id === sample.id
                                    ? "border-primary bg-primary/10"
                                    : "border-border/50 hover:border-primary/50"
                            }`}
                            onClick={() => setSelectedSample(sample)}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium">
                                        {sample.name}
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                        {sample.duration.toFixed(2)}s • {sample.sample_rate}Hz
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={async (e) => {
                                            e.stopPropagation();

                                            // If this sample is already selected and playing, pause it
                                            if (selectedSample?.id === sample.id && isPlaying) {
                                                handlePlaySample();
                                                return;
                                            }

                                            // Select the sample first
                                            setSelectedSample(sample);

                                            // Play directly without waiting for state update
                                            try {
                                                const audioUrl = `http://localhost:8000/samples/${sample.id}/audio`;
                                                console.log("🎵 Quick play:", audioUrl);

                                                // Stop existing audio
                                                if (audioRef.current) {
                                                    audioRef.current.pause();
                                                    audioRef.current.removeAttribute("src");
                                                    audioRef.current.load();
                                                }

                                                const audio = new Audio();
                                                audio.crossOrigin = "anonymous";
                                                audio.preload = "auto";
                                                audio.src = audioUrl;

                                                audio.addEventListener("ended", () => {
                                                    setIsPlaying(false);
                                                });

                                                audio.addEventListener("error", (e) => {
                                                    console.error("❌ Quick play error:", e);
                                                    setIsPlaying(false);
                                                });

                                                audioRef.current = audio;
                                                await audio.play();
                                                setIsPlaying(true);
                                                console.log("✅ Quick play started");
                                            } catch (error) {
                                                console.error("❌ Quick play failed:", error);
                                                setIsPlaying(false);
                                            }
                                        }}
                                        className="h-6 w-6 p-0"
                                    >
                                        {selectedSample?.id === sample.id && isPlaying ? (
                                            <Pause className="h-3 w-3" />
                                        ) : (
                                            <Play className="h-3 w-3" />
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSample(sample.id);
                                        }}
                                        className="h-6 w-6 p-0"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Selected Sample Analysis */}
            {selectedSample && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="text-muted-foreground text-xs font-medium tracking-wider">
                            SELECTED: {selectedSample.name}
                        </div>
                        <Button
                            onClick={handlePlaySample}
                            size="sm"
                            variant={isPlaying ? "default" : "outline"}
                            className="h-7 gap-1.5"
                        >
                            {isPlaying ? (
                                <Pause className="h-3 w-3" />
                            ) : (
                                <Play className="h-3 w-3" />
                            )}
                            {isPlaying ? "PAUSE" : "PLAY"}
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={handleAnalyzeSample}
                            size="sm"
                            disabled={isAnalyzing}
                            className="flex-1 gap-1.5"
                        >
                            <Activity className="h-3.5 w-3.5" />
                            {isAnalyzing ? "ANALYZING..." : "ANALYZE"}
                        </Button>
                        <Button
                            onClick={handleSynthesizeSample}
                            size="sm"
                            disabled={isSynthesizing || !spectralFeatures}
                            className="flex-1 gap-1.5"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            {isSynthesizing ? "SYNTHESIZING..." : "SYNTHESIZE"}
                        </Button>
                    </div>

                    {/* Decomposition Mode Selector */}
                    {spectralFeatures && (
                        <div className="space-y-2">
                            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wider">
                                <BarChart3 className="h-3.5 w-3.5" />
                                DECOMPOSITION VIEW
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                                <Button
                                    size="sm"
                                    variant={
                                        decompositionMode === "spectral" ? "default" : "outline"
                                    }
                                    onClick={() => setDecompositionMode("spectral")}
                                    className="h-7 text-xs"
                                >
                                    SPECTRUM
                                </Button>
                                <Button
                                    size="sm"
                                    variant={
                                        decompositionMode === "harmonics" ? "default" : "outline"
                                    }
                                    onClick={() => setDecompositionMode("harmonics")}
                                    className="h-7 text-xs"
                                >
                                    HARMONICS
                                </Button>
                                <Button
                                    size="sm"
                                    variant={
                                        decompositionMode === "envelope" ? "default" : "outline"
                                    }
                                    onClick={() => setDecompositionMode("envelope")}
                                    className="h-7 text-xs"
                                >
                                    ENVELOPE
                                </Button>
                                <Button
                                    size="sm"
                                    variant={
                                        decompositionMode === "perceptual" ? "default" : "outline"
                                    }
                                    onClick={() => setDecompositionMode("perceptual")}
                                    className="h-7 text-xs"
                                >
                                    PERCEPTUAL
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Decomposition Results */}
                    {spectralFeatures && (
                        <div className="border-primary/30 bg-primary/5 space-y-2 rounded border p-3">
                            {/* Spectral Mode */}
                            {decompositionMode === "spectral" && (
                                <>
                                    <div className="text-primary text-xs font-medium tracking-wider">
                                        FREQUENCY SPECTRUM
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <div className="text-muted-foreground">Centroid</div>
                                            <div className="font-mono">
                                                {spectralFeatures.spectral_centroid.toFixed(1)} Hz
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Rolloff</div>
                                            <div className="font-mono">
                                                {spectralFeatures.spectral_rolloff.toFixed(1)} Hz
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Bandwidth</div>
                                            <div className="font-mono">
                                                {spectralFeatures.spectral_bandwidth.toFixed(1)} Hz
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Flatness</div>
                                            <div className="font-mono">
                                                {(spectralFeatures.spectral_flatness * 100).toFixed(
                                                    0
                                                )}
                                                %
                                            </div>
                                        </div>
                                    </div>
                                    {/* Spectrum Visualization */}
                                    <div className="bg-background/50 relative h-24 overflow-hidden rounded">
                                        <div className="absolute inset-0 flex items-end gap-[1px] px-1 pb-1">
                                            {spectralFeatures.magnitude_spectrum
                                                .slice(0, 50)
                                                .map((mag, i) => {
                                                    const height = Math.max(2, mag * 100);
                                                    return (
                                                        <div
                                                            key={i}
                                                            className="from-primary to-primary/50 flex-1 rounded-sm bg-gradient-to-t"
                                                            style={{ height: `${height}%` }}
                                                        />
                                                    );
                                                })}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Harmonics Mode */}
                            {decompositionMode === "harmonics" && (
                                <>
                                    <div className="text-primary text-xs font-medium tracking-wider">
                                        HARMONIC SERIES
                                    </div>
                                    <div className="text-xs">
                                        <div className="text-muted-foreground">Fundamental</div>
                                        <div className="text-primary font-mono text-lg">
                                            {spectralFeatures.fundamental_frequency.toFixed(1)} Hz
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        {spectralFeatures.harmonics.slice(0, 8).map((freq, i) => {
                                            const amp =
                                                spectralFeatures.harmonic_amplitudes[i] || 0;
                                            const maxAmp = Math.max(
                                                ...spectralFeatures.harmonic_amplitudes
                                            );
                                            const normalizedAmp =
                                                maxAmp > 0 ? (amp / maxAmp) * 100 : 0;
                                            return (
                                                <div key={i} className="space-y-0.5">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">
                                                            H{i + 1}
                                                        </span>
                                                        <span className="font-mono">
                                                            {freq.toFixed(1)} Hz
                                                        </span>
                                                    </div>
                                                    <div className="bg-background/50 h-2 overflow-hidden rounded-full">
                                                        <div
                                                            className="to-primary h-full rounded-full bg-gradient-to-r from-cyan-500"
                                                            style={{ width: `${normalizedAmp}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {/* Envelope Mode */}
                            {decompositionMode === "envelope" && (
                                <>
                                    <div className="text-primary text-xs font-medium tracking-wider">
                                        ADSR ENVELOPE
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <div className="text-muted-foreground">Attack</div>
                                            <div className="font-mono text-lg">
                                                {(spectralFeatures.attack_time * 1000).toFixed(0)}ms
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Decay</div>
                                            <div className="font-mono text-lg">
                                                {(spectralFeatures.decay_time * 1000).toFixed(0)}ms
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Sustain</div>
                                            <div className="font-mono text-lg">
                                                {(spectralFeatures.sustain_level * 100).toFixed(0)}%
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Release</div>
                                            <div className="font-mono text-lg">
                                                {(spectralFeatures.release_time * 1000).toFixed(0)}
                                                ms
                                            </div>
                                        </div>
                                    </div>
                                    {/* ADSR Visualization */}
                                    <div className="bg-background/50 relative h-20 overflow-hidden rounded">
                                        <svg
                                            className="h-full w-full"
                                            viewBox="0 0 100 100"
                                            preserveAspectRatio="none"
                                        >
                                            <path
                                                d={`M 0,100 L ${spectralFeatures.attack_time * 100},0 L ${(spectralFeatures.attack_time + spectralFeatures.decay_time) * 100},${(1 - spectralFeatures.sustain_level) * 100} L 70,${(1 - spectralFeatures.sustain_level) * 100} L 100,100`}
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                className="text-primary"
                                            />
                                        </svg>
                                    </div>
                                </>
                            )}

                            {/* Perceptual Mode */}
                            {decompositionMode === "perceptual" && (
                                <>
                                    <div className="text-primary text-xs font-medium tracking-wider">
                                        PERCEPTUAL QUALITIES
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <div className="mb-1 flex justify-between text-xs">
                                                <span className="text-muted-foreground">
                                                    Brightness
                                                </span>
                                                <span className="font-mono">
                                                    {(spectralFeatures.brightness * 100).toFixed(0)}
                                                    %
                                                </span>
                                            </div>
                                            <div className="bg-background/50 h-3 overflow-hidden rounded-full">
                                                <div
                                                    className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300"
                                                    style={{
                                                        width: `${spectralFeatures.brightness * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="mb-1 flex justify-between text-xs">
                                                <span className="text-muted-foreground">
                                                    Warmth
                                                </span>
                                                <span className="font-mono">
                                                    {(spectralFeatures.warmth * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="bg-background/50 h-3 overflow-hidden rounded-full">
                                                <div
                                                    className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                                                    style={{
                                                        width: `${spectralFeatures.warmth * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="mb-1 flex justify-between text-xs">
                                                <span className="text-muted-foreground">
                                                    Roughness
                                                </span>
                                                <span className="font-mono">
                                                    {(spectralFeatures.roughness * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="bg-background/50 h-3 overflow-hidden rounded-full">
                                                <div
                                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                                    style={{
                                                        width: `${spectralFeatures.roughness * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Feature Selection & Attach to Chat */}
                    {spectralFeatures && (
                        <div className="space-y-2">
                            <div className="text-muted-foreground text-xs font-medium tracking-wider">
                                ATTACH TO CHAT
                            </div>

                            {/* Feature Selection Checkboxes */}
                            <div className="border-muted/30 bg-muted/5 space-y-2 rounded border p-3">
                                <div className="text-muted-foreground mb-2 text-xs">
                                    Select features to include:
                                </div>
                                <div className="space-y-1.5">
                                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                                        <Checkbox
                                            checked={selectedFeatures.spectral}
                                            onCheckedChange={(checked) =>
                                                setSelectedFeatures((prev) => ({
                                                    ...prev,
                                                    spectral: checked as boolean,
                                                }))
                                            }
                                        />
                                        <span>
                                            Spectral Features (centroid, rolloff, bandwidth,
                                            flatness)
                                        </span>
                                    </label>
                                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                                        <Checkbox
                                            checked={selectedFeatures.harmonics}
                                            onCheckedChange={(checked) =>
                                                setSelectedFeatures((prev) => ({
                                                    ...prev,
                                                    harmonics: checked as boolean,
                                                }))
                                            }
                                        />
                                        <span>Harmonic Data (fundamental, harmonics)</span>
                                    </label>
                                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                                        <Checkbox
                                            checked={selectedFeatures.envelope}
                                            onCheckedChange={(checked) =>
                                                setSelectedFeatures((prev) => ({
                                                    ...prev,
                                                    envelope: checked as boolean,
                                                }))
                                            }
                                        />
                                        <span>Envelope (ADSR)</span>
                                    </label>
                                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                                        <Checkbox
                                            checked={selectedFeatures.perceptual}
                                            onCheckedChange={(checked) =>
                                                setSelectedFeatures((prev) => ({
                                                    ...prev,
                                                    perceptual: checked as boolean,
                                                }))
                                            }
                                        />
                                        <span>
                                            Perceptual Features (brightness, warmth, roughness)
                                        </span>
                                    </label>
                                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                                        <Checkbox
                                            checked={selectedFeatures.fullSpectrum}
                                            onCheckedChange={(checked) =>
                                                setSelectedFeatures((prev) => ({
                                                    ...prev,
                                                    fullSpectrum: checked as boolean,
                                                }))
                                            }
                                        />
                                        <span>
                                            Full Magnitude Spectrum (detailed frequency data)
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Attach/Detach Button */}
                            {!isAttached ? (
                                <Button
                                    onClick={handleAttachToChat}
                                    size="sm"
                                    variant="default"
                                    className="w-full gap-2"
                                    disabled={!Object.values(selectedFeatures).some((v) => v)}
                                >
                                    <Paperclip className="h-3.5 w-3.5" />
                                    ATTACH TO CHAT
                                </Button>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 rounded border border-green-500/40 bg-green-500/20 p-2 text-xs text-green-400">
                                        <Paperclip className="h-3 w-3" />
                                        <span className="flex-1">
                                            Spectral data attached to chat
                                        </span>
                                    </div>
                                    <Button
                                        onClick={handleDetachFromChat}
                                        size="sm"
                                        variant="outline"
                                        className="w-full gap-2"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        DETACH FROM CHAT
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Synthesis Parameters Display */}
                    {synthesisParams && (
                        <div className="space-y-2 rounded border border-cyan-500/30 bg-cyan-500/5 p-3">
                            <div className="text-xs font-medium tracking-wider text-cyan-400">
                                SYNTHESIS PARAMETERS
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <div className="text-muted-foreground">Synth</div>
                                    <div className="font-mono text-cyan-400">
                                        {synthesisParams.synth_type}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Note</div>
                                    <div className="font-mono">{synthesisParams.note}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Cutoff</div>
                                    <div className="font-mono">
                                        {synthesisParams.cutoff.toFixed(0)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Confidence</div>
                                    <div className="font-mono">
                                        {(synthesisParams.confidence * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>
                            {synthesisParams.reasoning && (
                                <div className="text-xs">
                                    <div className="text-muted-foreground">Reasoning</div>
                                    <div className="text-cyan-300/80 italic">
                                        {synthesisParams.reasoning}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
