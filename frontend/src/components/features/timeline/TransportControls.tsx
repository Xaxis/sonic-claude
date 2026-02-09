/**
 * Transport Controls Component
 * Play, pause, stop, rewind controls with tempo adjustment
 */
import { Play, Pause, Square, SkipBack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface TransportControlsProps {
    isPlaying: boolean;
    tempo: number;
    playheadPosition: number;
    onPlay: () => void;
    onPause: () => void;
    onStop: () => void;
    onRewind: () => void;
    onTempoChange: (tempo: number) => void;
}

export function TransportControls({
    isPlaying,
    tempo,
    playheadPosition,
    onPlay,
    onPause,
    onStop,
    onRewind,
    onTempoChange,
}: TransportControlsProps) {
    // Format playhead position as bars:beats
    const formatPosition = (beats: number) => {
        const bars = Math.floor(beats / 4) + 1;
        const beat = Math.floor(beats % 4) + 1;
        return `${bars}:${beat}`;
    };

    return (
        <div className="panel-glass flex items-center gap-4 rounded-lg p-3">
            {/* Transport Buttons */}
            <div className="flex items-center gap-2">
                <Button
                    onClick={onRewind}
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                >
                    <SkipBack className="h-4 w-4" />
                </Button>

                {isPlaying ? (
                    <Button
                        onClick={onPause}
                        size="sm"
                        className="bg-primary hover:bg-primary/90 h-8 w-8 p-0"
                    >
                        <Pause className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button
                        onClick={onPlay}
                        size="sm"
                        className="bg-primary hover:bg-primary/90 h-8 w-8 p-0"
                    >
                        <Play className="h-4 w-4" />
                    </Button>
                )}

                <Button
                    onClick={onStop}
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                >
                    <Square className="h-4 w-4" />
                </Button>
            </div>

            {/* Position Display */}
            <div className="border-primary/20 flex items-center gap-2 border-l pl-4">
                <span className="text-muted-foreground text-xs font-medium">POSITION</span>
                <span className="text-primary font-mono text-sm font-bold">
                    {formatPosition(playheadPosition)}
                </span>
            </div>

            {/* Tempo Control */}
            <div className="border-primary/20 flex flex-1 items-center gap-3 border-l pl-4">
                <span className="text-muted-foreground text-xs font-medium">TEMPO</span>
                <div className="flex flex-1 items-center gap-3">
                    <Slider
                        value={tempo}
                        onChange={(value) => onTempoChange(value)}
                        min={20}
                        max={300}
                        step={1}
                        className="flex-1"
                    />
                    <span className="text-primary w-16 font-mono text-sm font-bold">
                        {tempo} BPM
                    </span>
                </div>
            </div>
        </div>
    );
}

