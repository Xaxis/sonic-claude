/**
 * SequencerTransport - Transport controls for sequencer
 *
 * Handles play/pause/stop/record/loop controls and tempo
 * Uses SequencerContext for state management
 */

import { Play, Pause, SkipBack, Circle, Repeat, Music } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { cn } from "@/lib/utils.ts";
import { useSequencer } from '@/contexts/SequencerContext';

interface SequencerTransportProps {
    isPlaying: boolean;
    metronomeEnabled: boolean;
    tempo: number;
    hasTracksOrClips: boolean;
    onPlayPause: () => void;
    onStop: () => void;
    onRecord: () => void;
    onLoop: () => void;
    onMetronomeToggle: () => void;
    onTempoChange: (value: string) => void;
    onTempoBlur: () => void;
    onTempoKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function SequencerTransport({
    isPlaying,
    metronomeEnabled,
    tempo,
    hasTracksOrClips,
    onPlayPause,
    onStop,
    onRecord,
    onLoop,
    onMetronomeToggle,
    onTempoChange,
    onTempoBlur,
    onTempoKeyDown,
}: SequencerTransportProps) {
    // Get state from global context
    const { isRecording, isLooping } = useSequencer();
    const canPlay = hasTracksOrClips;
    const playTooltip = canPlay
        ? (isPlaying ? "Pause" : "Play")
        : "Add tracks and clips to play";

    return (
        <div className="flex items-center gap-4">
            {/* Transport Buttons */}
            <div className="flex items-center gap-1">
                <IconButton
                    icon={SkipBack}
                    tooltip="Stop and rewind to start"
                    onClick={onStop}
                    variant="ghost"
                    size="icon-sm"
                />
                <IconButton
                    icon={isPlaying ? Pause : Play}
                    tooltip={playTooltip}
                    onClick={onPlayPause}
                    variant={isPlaying ? "default" : "ghost"}
                    size="icon-sm"
                    disabled={!canPlay}
                    className={cn(isPlaying && "bg-primary")}
                />
                <Button
                    onClick={onRecord}
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
                    onClick={onLoop}
                    variant={isLooping ? "secondary" : "ghost"}
                    size="icon-sm"
                />
                <IconButton
                    icon={Music}
                    tooltip={metronomeEnabled ? "Metronome enabled" : "Metronome disabled"}
                    onClick={onMetronomeToggle}
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
                    value={tempo}
                    onChange={(e) => onTempoChange(e.target.value)}
                    onBlur={onTempoBlur}
                    onKeyDown={onTempoKeyDown}
                    className="w-16 h-7 text-sm"
                />
            </div>
        </div>
    );
}

