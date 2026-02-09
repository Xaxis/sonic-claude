import { BarChart3, Zap, Music, Radio } from "lucide-react";
import type { AudioAnalysis, MusicalState } from "@/types";

interface AnalyticsProps {
    audioAnalysis: AudioAnalysis;
    musicalState: MusicalState;
}

export function Analytics({ audioAnalysis, musicalState }: AnalyticsProps) {
    return (
        <div className="flex flex-col space-y-5 overflow-y-auto p-4">
            {/* Audio Analysis */}
            <div className="space-y-3">
                <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Audio Analysis
                </div>
                <div className="space-y-2">
                    {/* Energy */}
                    <div className="bg-primary/5 border-primary/10 space-y-1.5 rounded-md border p-2">
                        <div className="flex items-center justify-between">
                            <label className="text-muted-foreground flex items-center gap-1.5 text-xs tracking-wider uppercase">
                                <Zap className="h-3.5 w-3.5" />
                                Energy
                            </label>
                            <span className="text-primary font-mono text-sm font-bold">
                                {audioAnalysis.energy.toFixed(2)}
                            </span>
                        </div>
                        <div className="bg-background/50 h-2 overflow-hidden rounded-full">
                            <div
                                className="bg-primary h-full transition-all duration-300"
                                style={{ width: `${Math.min(100, audioAnalysis.energy * 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Rhythm */}
                    <div className="bg-secondary/5 border-secondary/10 space-y-1.5 rounded-md border p-2">
                        <div className="flex items-center justify-between">
                            <label className="text-muted-foreground flex items-center gap-1.5 text-xs tracking-wider uppercase">
                                <Radio className="h-3.5 w-3.5" />
                                Rhythm
                            </label>
                            <span className="text-secondary font-mono text-sm font-bold">
                                {audioAnalysis.rhythm.toFixed(2)}
                            </span>
                        </div>
                        <div className="bg-background/50 h-2 overflow-hidden rounded-full">
                            <div
                                className="bg-secondary h-full transition-all duration-300"
                                style={{ width: `${Math.min(100, audioAnalysis.rhythm * 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Brightness */}
                    <div className="bg-accent/5 border-accent/10 space-y-1.5 rounded-md border p-2">
                        <div className="flex items-center justify-between">
                            <label className="text-muted-foreground flex items-center gap-1.5 text-xs tracking-wider uppercase">
                                <Music className="h-3.5 w-3.5" />
                                Brightness
                            </label>
                            <span className="text-accent font-mono text-sm font-bold">
                                {audioAnalysis.brightness.toFixed(0)}
                            </span>
                        </div>
                        <div className="bg-background/50 h-2 overflow-hidden rounded-full">
                            <div
                                className="bg-accent h-full transition-all duration-300"
                                style={{
                                    width: `${Math.min(100, (audioAnalysis.brightness / 5000) * 100)}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Musical State */}
            <div className="space-y-3">
                <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase">
                    <Music className="h-3.5 w-3.5" />
                    Musical State
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-primary/5 border-primary/10 space-y-1.5 rounded-md border p-2">
                        <label className="text-muted-foreground text-xs tracking-wider uppercase">
                            BPM
                        </label>
                        <div className="text-primary text-center font-mono text-xl font-bold">
                            {musicalState.bpm}
                        </div>
                    </div>
                    <div className="bg-secondary/5 border-secondary/10 space-y-1.5 rounded-md border p-2">
                        <label className="text-muted-foreground text-xs tracking-wider uppercase">
                            Intensity
                        </label>
                        <div className="text-secondary text-center font-mono text-xl font-bold">
                            {musicalState.intensity.toFixed(1)}
                        </div>
                    </div>
                    <div className="bg-accent/5 border-accent/10 space-y-1.5 rounded-md border p-2">
                        <label className="text-muted-foreground text-xs tracking-wider uppercase">
                            Key
                        </label>
                        <div className="text-accent text-center font-mono text-xl font-bold">
                            {musicalState.key || "C"}
                        </div>
                    </div>
                    <div className="bg-primary/5 border-primary/10 space-y-1.5 rounded-md border p-2">
                        <label className="text-muted-foreground text-xs tracking-wider uppercase">
                            Scale
                        </label>
                        <div className="text-primary text-center font-mono text-xl font-bold">
                            {musicalState.scale || "minor"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Dominant Frequency */}
            {audioAnalysis.dominant_frequency > 0 && (
                <div className="bg-primary/5 border-primary/10 space-y-2 rounded-lg border p-3">
                    <label className="text-muted-foreground text-xs font-medium tracking-[0.15em] uppercase">
                        Dominant Frequency
                    </label>
                    <div className="text-primary text-center font-mono text-2xl font-bold tracking-wider">
                        {audioAnalysis.dominant_frequency.toFixed(1)}
                        <span className="text-primary/70 ml-1 text-sm">Hz</span>
                    </div>
                </div>
            )}
        </div>
    );
}
