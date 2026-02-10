/**
 * Transport Panel
 *
 * Master playback controls - play, pause, stop, record.
 * Shows position, tempo, time signature, and loop controls.
 * Integrates with AudioEngineContext for real-time playback state.
 */

import { useState } from "react";
import { Play, Pause, Square, SkipBack, Circle, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioEngine } from "@/contexts/AudioEngineContext";

export function TransportPanel() {
    const {
        isPlaying,
        currentPosition,
        tempo,
        activeSequenceId,
        playSequence,
        stopPlayback,
        setCurrentPosition,
    } = useAudioEngine();

    const [isRecording, setIsRecording] = useState(false);
    const [isLooping, setIsLooping] = useState(true);

    // Handle play/pause
    const handlePlay = async () => {
        if (isPlaying) {
            await stopPlayback();
        } else {
            // If no sequence is active, we can't play
            if (!activeSequenceId) {
                console.warn("No active sequence to play");
                return;
            }
            await playSequence(activeSequenceId);
        }
    };

    // Handle stop
    const handleStop = async () => {
        await stopPlayback();
        setCurrentPosition(0);
    };

    // Handle record
    const handleRecord = () => {
        setIsRecording(!isRecording);
        // TODO: Implement recording functionality
    };

    // Handle rewind
    const handleRewind = () => {
        setCurrentPosition(0);
    };

    // Handle loop toggle
    const handleToggleLoop = () => {
        setIsLooping(!isLooping);
        // TODO: Update sequence loop setting via API
    };

    // Calculate position in seconds from beats and tempo
    // Formula: seconds = (beats / tempo) * 60
    const positionSeconds = (currentPosition / tempo) * 60;

    // Format time as MM:SS.ms
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10);
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
    };

    // Format position as bars.beats.ticks
    const formatPosition = (beats: number) => {
        const bars = Math.floor(beats / 4) + 1;
        const beat = Math.floor(beats % 4) + 1;
        const ticks = Math.floor((beats % 1) * 960);
        return `${bars}.${beat}.${ticks.toString().padStart(3, "0")}`;
    };

    return (
        <div className="flex items-center justify-between px-4 py-2 h-full bg-gradient-to-r from-muted/20 to-muted/10">
            {/* Transport Controls */}
            <div className="flex items-center gap-2">
                <button
                    onClick={handleRewind}
                    className="p-2 hover:bg-muted rounded transition-colors"
                    title="Rewind to start"
                >
                    <SkipBack size={18} className="text-muted-foreground" />
                </button>
                <button
                    onClick={handlePlay}
                    className={cn(
                        "p-3 rounded-lg transition-all",
                        isPlaying
                            ? "bg-primary/20 text-primary hover:bg-primary/30"
                            : "bg-muted hover:bg-muted/80 text-foreground"
                    )}
                    title={isPlaying ? "Pause" : "Play"}
                >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button
                    onClick={handleStop}
                    className="p-2 hover:bg-destructive/20 text-destructive rounded transition-colors"
                    title="Stop"
                >
                    <Square size={18} />
                </button>
                <button
                    onClick={handleRecord}
                    className={cn(
                        "p-2 rounded transition-colors",
                        isRecording
                            ? "bg-destructive/30 text-destructive animate-pulse"
                            : "hover:bg-muted text-muted-foreground"
                    )}
                    title={isRecording ? "Stop recording" : "Record"}
                >
                    <Circle size={18} fill={isRecording ? "currentColor" : "none"} />
                </button>
                <button
                    onClick={handleToggleLoop}
                    className={cn(
                        "p-2 rounded transition-colors",
                        isLooping
                            ? "bg-secondary/30 text-secondary"
                            : "hover:bg-muted text-muted-foreground"
                    )}
                    title={isLooping ? "Loop enabled" : "Loop disabled"}
                >
                    <Repeat size={18} />
                </button>
            </div>

            {/* Position Display */}
            <div className="flex items-center gap-6">
                {/* Time */}
                <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-0.5">TIME</div>
                    <div className="text-xl font-mono text-primary font-bold">
                        {formatTime(positionSeconds)}
                    </div>
                </div>

                {/* Position (Bars.Beats.Ticks) */}
                <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-0.5">POSITION</div>
                    <div className="text-xl font-mono text-secondary font-bold">
                        {formatPosition(currentPosition)}
                    </div>
                </div>

                {/* Tempo */}
                <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-0.5">TEMPO</div>
                    <div className="text-xl font-mono text-primary font-bold">
                        {tempo} <span className="text-sm text-muted-foreground">BPM</span>
                    </div>
                </div>

                {/* Time Signature */}
                <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-0.5">TIME SIG</div>
                    <div className="text-xl font-mono text-secondary font-bold">
                        4/4
                    </div>
                </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-2">
                <div className={cn(
                    "h-2 w-2 rounded-full",
                    isPlaying ? "bg-primary animate-pulse" : "bg-muted-foreground"
                )} />
                <span className="text-xs text-muted-foreground font-mono">
                    {isPlaying ? "PLAYING" : "STOPPED"}
                </span>
            </div>
        </div>
    );
}

