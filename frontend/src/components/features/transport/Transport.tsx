import { useState } from "react";
import { Play, Square } from "lucide-react";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";

interface TransportProps {
    bpm: number;
    onBPMChange: (bpm: number) => void;
}

export function Transport({ bpm, onBPMChange }: TransportProps) {
    const [isPlaying, setIsPlaying] = useState(false);

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
        onBPMChange(value);
        try {
            await api.setBPM(value);
        } catch (err) {
            console.error("Failed to set BPM:", err);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>TRANSPORT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Play/Stop Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        variant={isPlaying ? "default" : "primary"}
                        onClick={handlePlay}
                        disabled={isPlaying}
                        className="h-20 flex-col gap-2"
                    >
                        <Play className="h-6 w-6" />
                        <span>PLAY</span>
                    </Button>

                    <Button
                        variant={!isPlaying ? "default" : "destructive"}
                        onClick={handleStop}
                        disabled={!isPlaying}
                        className="h-20 flex-col gap-2"
                    >
                        <Square className="h-6 w-6" />
                        <span>STOP</span>
                    </Button>
                </div>

                {/* BPM Control */}
                <div className="space-y-2">
                    <label className="text-muted-foreground text-xs tracking-[0.15em]">BPM</label>
                    <Slider value={bpm} min={60} max={180} step={1} onChange={handleBPMChange} />
                    <div className="text-primary text-center text-2xl font-bold tracking-wider">
                        {bpm}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
