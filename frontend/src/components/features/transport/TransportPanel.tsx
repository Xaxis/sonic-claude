/**
 * Transport Panel
 *
 * Master playback controls - play, pause, stop, record.
 * Shows position, tempo, time signature, and loop controls.
 * Integrates with AudioEngineContext for real-time playback state.
 *
 * DOES NOT wrap in Panel - PanelGrid handles that!
 */

import { useState, useEffect } from "react";
import { Play, Pause, Square, SkipBack, Circle, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioEngine } from "@/contexts/AudioEngineContext";

export function TransportPanel() {
    const {
        isPlaying,
        currentPosition,
        tempo,
        activeSequenceId,
        sequences,
        playSequence,
        stopPlayback,
        pausePlayback,
        resumePlayback,
        setTempo,
        loadSequences,
    } = useAudioEngine();

    const [isRecording, setIsRecording] = useState(false);
    const [isLooping, setIsLooping] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [tempoInput, setTempoInput] = useState(tempo.toString());

    // Load sequences on mount
    useEffect(() => {
        loadSequences();
    }, [loadSequences]);

    // Handle play/pause/resume
    const handlePlayPause = async () => {
        if (isPlaying) {
            // Pause playback
            await pausePlayback();
            setIsPaused(true);
        } else if (isPaused) {
            // Resume from paused state
            await resumePlayback();
            setIsPaused(false);
        } else {
            // Start playback from beginning
            // Use first sequence if no active sequence
            const sequenceToPlay = activeSequenceId || (sequences.length > 0 ? sequences[0].id : null);
            if (!sequenceToPlay) {
                console.warn("No sequences available to play");
                return;
            }
            await playSequence(sequenceToPlay);
            setIsPaused(false);
        }
    };

    // Handle stop
    const handleStop = async () => {
        await stopPlayback();
        setIsPaused(false);
    };

    // Handle record
    const handleRecord = () => {
        setIsRecording(!isRecording);
        // TODO: Implement recording functionality
    };

    // Handle rewind
    const handleRewind = async () => {
        await stopPlayback();
        setIsPaused(false);
    };

    // Handle loop toggle
    const handleToggleLoop = () => {
        setIsLooping(!isLooping);
        // TODO: Update sequence loop setting via API
    };

    // Handle tempo change
    const handleTempoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTempoInput(e.target.value);
    };

    // Handle tempo blur (apply change)
    const handleTempoBlur = async () => {
        const newTempo = parseFloat(tempoInput);
        if (!isNaN(newTempo) && newTempo >= 20 && newTempo <= 300) {
            await setTempo(newTempo);
        } else {
            // Reset to current tempo if invalid
            setTempoInput(tempo.toString());
        }
    };

    // Handle tempo key press (Enter to apply)
    const handleTempoKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            await handleTempoBlur();
            e.currentTarget.blur();
        }
    };

    // Update tempo input when context tempo changes (from WebSocket)
    useEffect(() => {
        setTempoInput(tempo.toString());
    }, [tempo]);

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
                    onClick={handlePlayPause}
                    className={cn(
                        "p-3 rounded-lg transition-all",
                        isPlaying
                            ? "bg-primary/20 text-primary hover:bg-primary/30"
                            : "bg-muted hover:bg-muted/80 text-foreground"
                    )}
                    title={isPlaying ? "Pause" : isPaused ? "Resume" : "Play"}
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

                {/* Tempo (Editable) */}
                <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-0.5">TEMPO</div>
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            value={tempoInput}
                            onChange={handleTempoChange}
                            onBlur={handleTempoBlur}
                            onKeyPress={handleTempoKeyPress}
                            min="20"
                            max="300"
                            step="1"
                            className="w-16 text-xl font-mono text-primary font-bold bg-transparent border-b border-transparent hover:border-primary/30 focus:border-primary focus:outline-none text-center transition-colors"
                        />
                        <span className="text-sm text-muted-foreground">BPM</span>
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
                    isPlaying ? "bg-primary animate-pulse" : isPaused ? "bg-secondary" : "bg-muted-foreground"
                )} />
                <span className="text-xs text-muted-foreground font-mono">
                    {isPlaying ? "PLAYING" : isPaused ? "PAUSED" : "STOPPED"}
                </span>
            </div>
        </div>
    );
}

