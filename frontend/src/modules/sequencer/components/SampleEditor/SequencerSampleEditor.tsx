/**
 * SequencerSampleEditor - Sample/audio clip editor (bottom panel)
 *
 * Shows when an audio clip is selected. Allows visual editing of sample properties.
 * Displays as a bottom panel in the sequencer (like Ableton's clip view for audio).
 */

import { useState, useEffect } from "react";
import { X, Grid3x3 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { SequencerSampleEditorSection } from "../../layouts/SequencerSampleEditorSection.tsx";

interface SequencerSampleEditorProps {
    clipId: string;
    clipName: string;
    clipDuration: number; // beats
    clipStartTime: number; // beats - position in sequence
    audioFilePath: string;
    audioOffset?: number; // seconds
    gain: number; // 0.0-2.0
    snapEnabled: boolean; // Controlled from parent
    gridSize: number; // Controlled from parent
    zoom: number; // SHARED with timeline (Ableton pattern)
    totalBeats: number; // Total composition length in beats
    currentPosition: number; // Playback position
    isPlaying: boolean; // Playback state
    isLooping: boolean;
    loopStart: number;
    loopEnd: number;
    sampleEditorScrollRef: React.RefObject<HTMLDivElement | null>;
    onSampleEditorScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    onClose: () => void;
    onUpdateClip: (clipId: string, updates: { gain?: number; audio_offset?: number }) => Promise<void>;
    onToggleSnap: () => void;
    onSetGridSize: (size: number) => void;
    onSeek?: (position: number, triggerAudio?: boolean) => void;
    onLoopStartChange: (start: number) => void;
    onLoopEndChange: (end: number) => void;
}

export function SequencerSampleEditor({
    clipId,
    clipName,
    clipDuration,
    clipStartTime,
    audioFilePath,
    audioOffset = 0,
    gain,
    snapEnabled,
    gridSize,
    zoom,
    totalBeats,
    currentPosition,
    isPlaying,
    isLooping,
    loopStart,
    loopEnd,
    sampleEditorScrollRef,
    onSampleEditorScroll,
    onClose,
    onUpdateClip,
    onToggleSnap,
    onSetGridSize,
    onSeek,
    onLoopStartChange,
    onLoopEndChange,
}: SequencerSampleEditorProps) {
    // Local UI state
    const [localGain, setLocalGain] = useState(gain);
    const [waveformData, setWaveformData] = useState<number[]>([]);
    const [waveformDataRight, setWaveformDataRight] = useState<number[]>([]);

    // Sample editor settings
    const pixelsPerBeat = 40; // Base pixels per beat (matches piano roll and timeline)

    // Load waveform data for audio file
    useEffect(() => {
        if (audioFilePath) {
            loadWaveform(audioFilePath);
        }
    }, [audioFilePath]);

    const loadWaveform = async (sampleId: string) => {
        try {
            // Fetch audio file using sample ID
            const url = `http://localhost:8000/api/samples/${sampleId}/download`;
            const response = await fetch(url);

            if (!response.ok) {
                console.error(`Failed to fetch audio file: ${response.statusText}`);
                return;
            }

            const arrayBuffer = await response.arrayBuffer();

            // Decode audio
            const audioContext = new AudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            await audioContext.close();

            // Extract waveform data from the complete audio file
            // Use a fixed number of samples for good resolution (2000 samples = good detail)
            // WaveformDisplay will automatically stretch this to fit the clip duration width
            const targetSamples = 2000; // Fixed sample count for consistent quality

            // Extract left channel (or mono)
            const leftChannelData = audioBuffer.getChannelData(0);
            const blockSize = Math.floor(leftChannelData.length / targetSamples);
            const leftWaveform: number[] = [];

            for (let i = 0; i < targetSamples; i++) {
                const start = i * blockSize;
                const end = start + blockSize;
                let max = 0;

                for (let j = start; j < end; j++) {
                    const abs = Math.abs(leftChannelData[j]);
                    if (abs > max) max = abs;
                }

                leftWaveform.push(max);
            }

            setWaveformData(leftWaveform);

            // Extract right channel if stereo
            if (audioBuffer.numberOfChannels > 1) {
                const rightChannelData = audioBuffer.getChannelData(1);
                const rightWaveform: number[] = [];

                for (let i = 0; i < targetSamples; i++) {
                    const start = i * blockSize;
                    const end = start + blockSize;
                    let max = 0;

                    for (let j = start; j < end; j++) {
                        const abs = Math.abs(rightChannelData[j]);
                        if (abs > max) max = abs;
                    }

                    rightWaveform.push(max);
                }

                setWaveformDataRight(rightWaveform);
            } else {
                // Mono file - clear right channel
                setWaveformDataRight([]);
            }
        } catch (error) {
            console.error("Failed to load waveform:", error);
        }
    };

    const handleGainChange = async (value: number[]) => {
        const newGain = value[0];
        setLocalGain(newGain);
        await onUpdateClip(clipId, { gain: newGain });
    };

    const gridSizeOptions = [
        { value: 4, label: "1/4" },
        { value: 8, label: "1/8" },
        { value: 16, label: "1/16" },
        { value: 32, label: "1/32" },
    ];

    return (
        <div className="h-full flex flex-col bg-background border-t border-border overflow-hidden">
            {/* Header - Matches piano roll header structure */}
            <div className="border-b border-border bg-muted/20 flex items-center flex-shrink-0 relative">
                {/* Left Column - Fixed (matches left panel width) */}
                <div className="w-64 px-3 py-2 border-r border-border flex-shrink-0 bg-background absolute left-0 top-0 bottom-0 z-10">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Sample Editor
                    </span>
                </div>

                {/* Right Column - Scrollable content area (matches grid) */}
                <div className="flex-1 px-4 py-2 pl-[17rem] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{clipName}</span>
                        <span className="text-xs text-muted-foreground">
                            • Bar {Math.floor(clipStartTime / 4) + 1} • {clipDuration} beats
                        </span>

                        {/* Snap Toggle */}
                        <button
                            onClick={onToggleSnap}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                                snapEnabled
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                        >
                            <Grid3x3 size={14} />
                            Snap
                        </button>

                        {/* Grid Size Selector */}
                        <div className="flex items-center gap-2">
                            <Label htmlFor="grid-size" className="text-xs text-muted-foreground">
                                Grid
                            </Label>
                            <Select
                                value={gridSize.toString()}
                                onValueChange={(value) => onSetGridSize(parseInt(value))}
                            >
                                <SelectTrigger id="grid-size" className="w-20 h-7 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {gridSizeOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value.toString()}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Gain Control */}
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Gain</Label>
                            <Slider
                                value={[localGain]}
                                onValueChange={handleGainChange}
                                min={0}
                                max={2}
                                step={0.01}
                                className="w-32"
                            />
                            <span className="text-xs text-muted-foreground w-12 text-right">
                                {(localGain * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>

                    {/* Close Button */}
                    <IconButton
                        icon={X}
                        tooltip="Close sample editor"
                        onClick={onClose}
                        variant="ghost"
                        size="icon-sm"
                    />
                </div>
            </div>

            {/* Sample Editor Content - Use dedicated layout component */}
            {waveformData.length > 0 ? (
                <SequencerSampleEditorSection
                    waveformData={waveformData}
                    waveformDataRight={waveformDataRight}
                    clipDuration={clipDuration}
                    clipStartTime={clipStartTime}
                    totalBeats={totalBeats}
                    currentPosition={currentPosition}
                    isPlaying={isPlaying}
                    isLooping={isLooping}
                    loopStart={loopStart}
                    loopEnd={loopEnd}
                    zoom={zoom}
                    pixelsPerBeat={pixelsPerBeat}
                    snapEnabled={snapEnabled}
                    gridSize={gridSize}
                    sampleEditorScrollRef={sampleEditorScrollRef}
                    onSampleEditorScroll={onSampleEditorScroll}
                    onSeek={onSeek}
                    onLoopStartChange={onLoopStartChange}
                    onLoopEndChange={onLoopEndChange}
                />
            ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    Loading waveform...
                </div>
            )}
        </div>
    );
}

