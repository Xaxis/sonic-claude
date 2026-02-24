/**
 * SequencerSampleEditor - Sample/audio clip editor (bottom panel)
 *
 * REFACTORED: Uses Zustand best practices
 * - Reads state directly from store (no prop drilling)
 * - Calls actions directly from store (no handler props)
 * - Only receives clipId (identifier)
 * - Only receives scroll ref (local UI state)
 *
 * Shows when an audio clip is selected. Allows visual editing of sample properties.
 * Displays as a bottom panel in the sequencer (like Ableton's clip view for audio).
 */

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { SequencerSampleEditorSection } from "@/modules/sequencer/components/Layouts/SequencerSampleEditorSection.tsx";
import { useDAWStore } from '@/stores/dawStore';
import { useWaveformData } from "../../hooks/useWaveformData.ts";

interface SequencerSampleEditorProps {
    clipId: string; // ✅ Identifier - acceptable
    sampleEditorScrollRef: React.RefObject<HTMLDivElement | null>; // ✅ Scroll ref - acceptable
}

export function SequencerSampleEditor({
    clipId,
    sampleEditorScrollRef,
}: SequencerSampleEditorProps) {
    // ========================================================================
    // STATE: Read directly from Zustand store
    // ========================================================================
    const clips = useDAWStore(state => state.clips);
    const activeComposition = useDAWStore(state => state.activeComposition);
    const tempo = activeComposition?.tempo ?? 120;

    // Find clip by ID
    const clip = clips.find(c => c.id === clipId);

    // ========================================================================
    // ACTIONS: Get directly from Zustand store
    // ========================================================================
    const updateClip = useDAWStore(state => state.updateClip);
    const closeSampleEditor = useDAWStore(state => state.closeSampleEditor);

    // ========================================================================
    // LOCAL UI STATE: Gain slider
    // ========================================================================
    const [localGain, setLocalGain] = useState(clip?.gain ?? 1.0);

    // Sync local gain with clip gain when clip changes
    useEffect(() => {
        if (clip) {
            setLocalGain(clip.gain);
        }
    }, [clip?.gain]);

    // ========================================================================
    // VALIDATION: Clip must exist
    // ========================================================================
    if (!clip) {
        return null;
    }

    // Load waveform data using hook (2000 samples for detailed editor view)
    const { leftData: waveformData, rightData: waveformDataRight } = useWaveformData({
        sampleId: clip.audio_file_path || '',
        clipDuration: clip.duration,
        tempo,
        samplesPerLoop: 2000,
    });

    // ========================================================================
    // HANDLERS: Clip actions (call Zustand actions directly)
    // ========================================================================
    const handleGainChange = async (value: number[]) => {
        const newGain = value[0];
        setLocalGain(newGain);
        if (activeComposition) {
            await updateClip(activeComposition.id, clipId, { gain: newGain });
        }
    };

    const handleClose = () => {
        closeSampleEditor();
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
                        <span className="text-sm font-semibold">{clip.name}</span>
                        <span className="text-xs text-muted-foreground">
                            • Bar {Math.floor(clip.start_time / 4) + 1} • {clip.duration} beats
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
                        onClick={handleClose}
                        variant="ghost"
                        size="icon-sm"
                    />
                </div>
            </div>

            {/* Sample Editor Content - Use dedicated layout component */}
            {waveformData.length > 0 ? (
                <SequencerSampleEditorSection
                    clipId={clipId}
                    waveformData={waveformData}
                    waveformDataRight={waveformDataRight}
                    sampleEditorScrollRef={sampleEditorScrollRef}
                />
            ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    Loading waveform...
                </div>
            )}
        </div>
    );
}

