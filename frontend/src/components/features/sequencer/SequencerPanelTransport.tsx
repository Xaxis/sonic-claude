/**
 * SequencerPanelTransport - Transport controls for sequencer
 *
 * Handles play/pause/stop/record/loop controls and tempo
 */

import { Play, Pause, SkipBack, Circle, Repeat } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SequencerPanelTransportProps {
    isPlaying: boolean;
    isPaused: boolean;
    isRecording: boolean;
    isLooping: boolean;
    tempo: number;
    tempoInput: string;
    hasTracksOrClips: boolean; // NEW: Disable play if no tracks/clips
    onPlayPause: () => void;
    onStop: () => void;
    onRecord: () => void;
    onLoop: () => void;
    onTempoChange: (value: string) => void;
    onTempoBlur: () => void;
    onTempoKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function SequencerPanelTransport({
    isPlaying,
    isPaused,
    isRecording,
    isLooping,
    tempoInput,
    hasTracksOrClips,
    onPlayPause,
    onStop,
    onRecord,
    onLoop,
    onTempoChange,
    onTempoBlur,
    onTempoKeyDown,
}: SequencerPanelTransportProps) {
    const canPlay = hasTracksOrClips;
    const playTooltip = canPlay
        ? (isPlaying ? "Pause" : isPaused ? "Resume" : "Play")
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
                    onChange={(e) => onTempoChange(e.target.value)}
                    onBlur={onTempoBlur}
                    onKeyDown={onTempoKeyDown}
                    className="w-16 h-7 text-sm"
                />
            </div>
        </div>
    );
}

