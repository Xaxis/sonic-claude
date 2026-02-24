/**
 * SequencerTransport - Transport controls for sequencer
 *
 * REFACTORED: Uses Zustand best practices
 * - Reads state directly from store (no prop drilling)
 * - Calls actions directly from store (no handler props)
 * - Manages local tempo input state internally
 */

import { useCallback } from "react";
import { Play, Pause, SkipBack, Circle, Repeat, Music } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { useDAWStore } from '@/stores/dawStore';
import { toast } from "sonner";
import { SequencerTempoControl } from './SequencerTempoControl.tsx';

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
    const toggleMetronome = useDAWStore(state => state.toggleMetronome);
    const setIsLooping = useDAWStore(state => state.setIsLooping);

    // ========================================================================
    // DERIVED STATE
    // ========================================================================
    const isPlaying = transport?.is_playing ?? false;
    const isPaused = transport?.is_paused ?? false;
    const isRecording = false; // TODO: Add is_recording to TransportMessage when backend supports it
    const metronomeEnabled = transport?.metronome_enabled ?? false;
    const hasTracksOrClips = tracks.length > 0 || clips.length > 0;
    const canPlay = hasTracksOrClips;
    const playTooltip = canPlay
        ? (isPlaying ? "Pause" : (isPaused ? "Resume" : "Play"))
        : "Add tracks and clips to play";

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
            <SequencerTempoControl />
        </div>
    );
}

