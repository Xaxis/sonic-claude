/**
 * SequencerTransport - Transport controls for sequencer
 *
 * REFACTORED: Uses Zustand best practices
 * - Reads state directly from store (no prop drilling)
 * - Calls actions directly from store (no handler props)
 * - Manages local tempo input state internally
 */

import { useState, useCallback, useEffect } from "react";
import { Play, Pause, SkipBack, Circle, Repeat, Music } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { cn } from "@/lib/utils.ts";
import { useDAWStore } from '@/stores/dawStore';
import { toast } from "sonner";

export function SequencerTransport() {
    // ========================================================================
    // STATE: Read directly from Zustand store
    // ========================================================================
    const activeComposition = useDAWStore(state => state.activeComposition);
    const tracks = useDAWStore(state => state.tracks);
    const clips = useDAWStore(state => state.clips);
    const transport = useDAWStore(state => state.transport);
    const isLooping = useDAWStore(state => state.isLooping);

    // ========================================================================
    // ACTIONS: Get directly from Zustand store
    // ========================================================================
    const play = useDAWStore(state => state.play);
    const pause = useDAWStore(state => state.pause);
    const resume = useDAWStore(state => state.resume);
    const stop = useDAWStore(state => state.stop);
    const setTempo = useDAWStore(state => state.setTempo);
    const toggleMetronome = useDAWStore(state => state.toggleMetronome);
    const setIsLooping = useDAWStore(state => state.setIsLooping);

    // ========================================================================
    // LOCAL UI STATE: Tempo input field
    // ========================================================================
    const [tempoInput, setTempoInput] = useState(activeComposition?.tempo?.toString() || "120");

    // ========================================================================
    // DERIVED STATE
    // ========================================================================
    const isPlaying = transport?.is_playing ?? false;
    const isPaused = transport?.is_paused ?? false;
    const isRecording = false; // TODO: Add is_recording to TransportMessage when backend supports it
    const tempo = activeComposition?.tempo ?? 120;
    const metronomeEnabled = transport?.metronome_enabled ?? false;
    const hasTracksOrClips = tracks.length > 0 || clips.length > 0;
    const canPlay = hasTracksOrClips;
    const playTooltip = canPlay
        ? (isPlaying ? "Pause" : (isPaused ? "Resume" : "Play"))
        : "Add tracks and clips to play";

    // ========================================================================
    // EFFECTS: Sync tempo input with composition tempo
    // ========================================================================
    useEffect(() => {
        if (activeComposition) {
            setTempoInput(activeComposition.tempo.toString());
        }
    }, [activeComposition?.tempo]);

    // ========================================================================
    // HANDLERS: Transport controls
    // ========================================================================
    const handlePlayPause = useCallback(async () => {
        if (!activeComposition) return;
        if (isPlaying) {
            await pause();
        } else if (isPaused) {
            await resume();
        } else {
            await play();
        }
    }, [isPlaying, isPaused, activeComposition, play, pause, resume]);

    const handleStop = useCallback(async () => {
        await stop();
    }, [stop]);

    const handleRecord = useCallback(() => {
        toast.info("Recording not yet implemented");
    }, []);

    const handleLoopToggle = useCallback(async () => {
        try {
            await setIsLooping(!isLooping);
        } catch (error) {
            console.error("Failed to toggle loop:", error);
            toast.error("Failed to toggle loop");
        }
    }, [isLooping, setIsLooping]);

    const handleTempoChange = useCallback((value: string) => {
        setTempoInput(value);
    }, []);

    const handleTempoBlur = useCallback(async () => {
        const newTempo = parseFloat(tempoInput);
        if (!isNaN(newTempo) && newTempo >= 20 && newTempo <= 300) {
            await setTempo(newTempo);
        } else {
            setTempoInput(tempo.toString());
        }
    }, [tempoInput, tempo, setTempo]);

    const handleTempoKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            await handleTempoBlur();
        }
    }, [handleTempoBlur]);

    return (
        <div className="flex items-center gap-4">
            {/* Transport Buttons */}
            <div className="flex items-center gap-1">
                <IconButton
                    icon={SkipBack}
                    tooltip="Stop and rewind to start"
                    onClick={handleStop}
                    variant="ghost"
                    size="icon-sm"
                />
                <IconButton
                    icon={isPlaying ? Pause : Play}
                    tooltip={playTooltip}
                    onClick={handlePlayPause}
                    variant={isPlaying || isPaused ? "default" : "ghost"}
                    size="icon-sm"
                    disabled={!canPlay}
                    className={cn((isPlaying || isPaused) && "bg-primary")}
                />
                <Button
                    onClick={handleRecord}
                    variant="ghost"
                    size="icon-sm"
                    className={cn(isRecording && "text-red-500")}
                    title="Record audio input"
                >
                    <Circle size={16} fill={isRecording ? "currentColor" : "none"} />
                </Button>
                <IconButton
                    icon={Repeat}
                    tooltip={isLooping ? "Loop enabled" : "Loop disabled"}
                    onClick={handleLoopToggle}
                    variant={isLooping ? "secondary" : "ghost"}
                    size="icon-sm"
                />
                <IconButton
                    icon={Music}
                    tooltip={metronomeEnabled ? "Metronome enabled" : "Metronome disabled"}
                    onClick={toggleMetronome}
                    variant={metronomeEnabled ? "secondary" : "ghost"}
                    size="icon-sm"
                />
            </div>

            {/* Tempo Control */}
            <div className="flex items-center gap-2">
                <Label htmlFor="tempo" className="text-xs text-muted-foreground">
                    BPM
                </Label>
                <Input
                    id="tempo"
                    type="number"
                    min="20"
                    max="300"
                    value={tempoInput}
                    onChange={(e) => handleTempoChange(e.target.value)}
                    onBlur={handleTempoBlur}
                    onKeyDown={handleTempoKeyDown}
                    className="w-16 h-7 text-sm"
                />
            </div>
        </div>
    );
}

