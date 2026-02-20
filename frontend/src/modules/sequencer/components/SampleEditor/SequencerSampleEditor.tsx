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
import { useSequencerContext } from '@/contexts/SequencerContext';
import { useWaveformData } from "../../hooks/useWaveformData.ts";

interface SequencerSampleEditorProps {
    clipId: string;
    clipName: string;
    clipDuration: number; // beats
    clipStartTime: number; // beats - position in sequence
    audioFilePath: string;
    audioOffset?: number; // seconds
    gain: number; // 0.0-2.0
    totalBeats: number; // Total composition length in beats
    currentPosition: number; // Playback position
    isPlaying: boolean; // Playback state
    sampleEditorScrollRef: React.RefObject<HTMLDivElement | null>;
    onSampleEditorScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    onClose: () => void;
    onUpdateClip: (clipId: string, updates: { gain?: number; audio_offset?: number }) => Promise<void>;
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
    totalBeats,
    currentPosition,
    isPlaying,
    sampleEditorScrollRef,
    onSampleEditorScroll,
    onClose,
    onUpdateClip,
    onSeek,
    onLoopStartChange,
    onLoopEndChange,
}: SequencerSampleEditorProps) {
    // Get tempo from context
    const { tempo } = useSequencerContext();

    // Local UI state
    const [localGain, setLocalGain] = useState(gain);

    // Load waveform data using hook (2000 samples for detailed editor view)
    const { leftData: waveformData, rightData: waveformDataRight } = useWaveformData({
        sampleId: audioFilePath,
        clipDuration,
        tempo,
        samplesPerLoop: 2000,
    });

    // Sample editor settings
    const pixelsPerBeat = 40; // Base pixels per beat (matches piano roll and timeline)

    const handleGainChange = async (value: number[]) => {
        const newGain = value[0];
        setLocalGain(newGain);
        await onUpdateClip(clipId, { gain: newGain });
    };

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
                    pixelsPerBeat={pixelsPerBeat}
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

