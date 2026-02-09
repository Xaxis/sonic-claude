import { useState, useEffect } from "react";
import { Play, Square, Music, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAIStatus } from "@/hooks/use-ai-status";

const KEYS = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
const SCALES = [
    "Major",
    "Minor",
    "Dorian",
    "Phrygian",
    "Lydian",
    "Mixolydian",
    "Pentatonic",
    "Blues",
];

export function Controls() {
    const { status } = useAIStatus();
    const [isPlaying, setIsPlaying] = useState(false);
    const [bpm, setBPM] = useState(120);
    const [intensity, setIntensity] = useState(5);
    const [cutoff, setCutoff] = useState(100);
    const [reverb, setReverb] = useState(0.3);
    const [echo, setEcho] = useState(0.2);
    const [key, setKey] = useState("C");
    const [scale, setScale] = useState("Minor");

    // Sync state from backend on mount and when status updates
    useEffect(() => {
        if (status?.current_state) {
            setBPM(status.current_state.bpm ?? 120);
            setIntensity(status.current_state.intensity ?? 5);
            setKey(status.current_state.key ?? "C");
            setScale(status.current_state.scale ?? "Minor");
        }
        if (status?.is_playing !== undefined) {
            setIsPlaying(status.is_playing);
        }
    }, [status]);

    const handlePlay = async () => {
        try {
            await api.play();
            setIsPlaying(true);
        } catch (err) {
            console.error("Failed to play:", err);
        }
    };

    const handleStop = async () => {
        try {
            await api.stop();
            setIsPlaying(false);
        } catch (err) {
            console.error("Failed to stop:", err);
        }
    };

    const handleBPMChange = async (value: number) => {
        setBPM(value);
        try {
            await api.setBPM(value);
        } catch (err) {
            console.error("Failed to set BPM:", err);
        }
    };

    const handleIntensity = async (value: number) => {
        setIntensity(value);
        try {
            await api.setIntensity(value);
        } catch (err) {
            console.error("Failed to set intensity:", err);
        }
    };

    const handleCutoff = async (value: number) => {
        setCutoff(value);
        try {
            await api.setCutoff(value);
        } catch (err) {
            console.error("Failed to set cutoff:", err);
        }
    };

    const handleReverb = async (value: number) => {
        setReverb(value);
        try {
            await api.setReverb(value);
        } catch (err) {
            console.error("Failed to set reverb:", err);
        }
    };

    const handleEcho = async (value: number) => {
        setEcho(value);
        try {
            await api.setEcho(value);
        } catch (err) {
            console.error("Failed to set echo:", err);
        }
    };

    const handleKeyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newKey = e.target.value;
        setKey(newKey);
        try {
            await api.setKey(newKey.toLowerCase());
        } catch (err) {
            console.error("Failed to set key:", err);
        }
    };

    const handleScaleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newScale = e.target.value;
        setScale(newScale);
        try {
            await api.setScale(newScale.toLowerCase());
        } catch (err) {
            console.error("Failed to set scale:", err);
        }
    };

    return (
        <div className="flex flex-col space-y-5 overflow-y-auto p-4">
            {/* Transport Controls */}
            <div className="space-y-3">
                <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase">
                    <Play className="h-3.5 w-3.5" />
                    Transport
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant={isPlaying ? "default" : "primary"}
                        onClick={handlePlay}
                        disabled={isPlaying}
                        className="h-14 flex-col gap-1.5 font-bold tracking-wide"
                    >
                        <Play className="h-5 w-5" />
                        <span className="text-xs">PLAY</span>
                    </Button>
                    <Button
                        variant={!isPlaying ? "default" : "destructive"}
                        onClick={handleStop}
                        disabled={!isPlaying}
                        className="h-14 flex-col gap-1.5 font-bold tracking-wide"
                    >
                        <Square className="h-5 w-5" />
                        <span className="text-xs">STOP</span>
                    </Button>
                </div>
            </div>

            {/* BPM */}
            <div className="bg-primary/5 border-primary/10 space-y-2 rounded-lg border p-3">
                <label className="text-muted-foreground text-xs font-medium tracking-[0.15em] uppercase">
                    BPM
                </label>
                <Slider value={bpm} min={60} max={180} step={1} onChange={handleBPMChange} />
                <div className="text-primary text-center font-mono text-2xl font-bold tracking-wider">
                    {bpm}
                </div>
            </div>

            {/* Mix Controls */}
            <div className="space-y-3">
                <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase">
                    <Waves className="h-3.5 w-3.5" />
                    Mix
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-secondary/5 border-secondary/10 space-y-1.5 rounded-md border p-2">
                        <label className="text-muted-foreground text-xs tracking-wider uppercase">
                            Intensity
                        </label>
                        <Slider
                            value={intensity}
                            min={0}
                            max={10}
                            step={0.1}
                            onChange={handleIntensity}
                        />
                        <div className="text-secondary text-center font-mono text-sm font-bold">
                            {intensity.toFixed(1)}
                        </div>
                    </div>
                    <div className="bg-secondary/5 border-secondary/10 space-y-1.5 rounded-md border p-2">
                        <label className="text-muted-foreground text-xs tracking-wider uppercase">
                            Cutoff
                        </label>
                        <Slider
                            value={cutoff}
                            min={50}
                            max={130}
                            step={1}
                            onChange={handleCutoff}
                        />
                        <div className="text-secondary text-center font-mono text-sm font-bold">
                            {cutoff}
                        </div>
                    </div>
                    <div className="bg-secondary/5 border-secondary/10 space-y-1.5 rounded-md border p-2">
                        <label className="text-muted-foreground text-xs tracking-wider uppercase">
                            Reverb
                        </label>
                        <Slider
                            value={reverb}
                            min={0}
                            max={1}
                            step={0.01}
                            onChange={handleReverb}
                        />
                        <div className="text-secondary text-center font-mono text-sm font-bold">
                            {reverb.toFixed(2)}
                        </div>
                    </div>
                    <div className="bg-secondary/5 border-secondary/10 space-y-1.5 rounded-md border p-2">
                        <label className="text-muted-foreground text-xs tracking-wider uppercase">
                            Echo
                        </label>
                        <Slider value={echo} min={0} max={1} step={0.01} onChange={handleEcho} />
                        <div className="text-secondary text-center font-mono text-sm font-bold">
                            {echo.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Harmony */}
            <div className="space-y-3">
                <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase">
                    <Music className="h-3.5 w-3.5" />
                    Harmony
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                        <label className="text-muted-foreground text-xs tracking-wider uppercase">
                            Key
                        </label>
                        <Select
                            value={key}
                            onChange={handleKeyChange}
                            className="bg-accent/10 border-accent/30 text-accent font-bold"
                        >
                            {KEYS.map((k) => (
                                <option key={k} value={k}>
                                    {k}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-muted-foreground text-xs tracking-wider uppercase">
                            Scale
                        </label>
                        <Select
                            value={scale}
                            onChange={handleScaleChange}
                            className="bg-accent/10 border-accent/30 text-accent font-bold"
                        >
                            {SCALES.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    );
}
