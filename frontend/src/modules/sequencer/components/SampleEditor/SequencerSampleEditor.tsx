/**
 * SequencerSampleEditor - Sample/audio clip editor (bottom panel)
 *
 * REFACTORED: Self-contained component following Zustand best practices
 * - Reads sampleEditorClipId directly from Zustand (no prop drilling)
 * - Handles empty states internally (no clip selected, invalid clip type, no audio file)
 * - Loads waveform data using useWaveformData hook
 * - Renders header UI (clip info, gain slider, close button)
 * - Composes SequencerGridLayout with ruler, sidebar, and SampleEditorGrid
 * - Only receives sampleEditorScrollRef prop
 *
 * Shows when an audio clip is selected. Allows visual editing of sample properties.
 * Displays as a bottom panel in the sequencer (like Ableton's clip view for audio).
 */

import { useState, useEffect } from "react";
import { Music, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { SampleEditorRuler } from "./SampleEditorRuler.tsx";
import { SampleEditorGrid } from "./SampleEditorGrid.tsx";
import { SequencerGridLayout } from "../Layouts/SequencerGridLayout.tsx";
import { useDAWStore } from '@/stores/dawStore';
import { useWaveformData } from "../../hooks/useWaveformData.ts";
import { useTimelineCalculations } from "../../hooks/useTimelineCalculations.ts";

interface SequencerSampleEditorProps {
    sampleEditorScrollRef: React.RefObject<HTMLDivElement | null>; // ✅ Scroll ref - acceptable
}

export function SequencerSampleEditor({
    sampleEditorScrollRef,
}: SequencerSampleEditorProps) {
    // ========================================================================
    // STATE: Read directly from Zustand store
    // ========================================================================
    const sampleEditorClipId = useDAWStore(state => state.sampleEditorClipId);
    const clips = useDAWStore(state => state.clips);
    const activeComposition = useDAWStore(state => state.activeComposition);
    const tempo = activeComposition?.tempo ?? 120;

    // ========================================================================
    // ACTIONS: Get directly from Zustand store
    // ========================================================================
    const updateClip = useDAWStore(state => state.updateClip);
    const closeSampleEditor = useDAWStore(state => state.closeSampleEditor);
    const setSampleEditorScrollLeft = useDAWStore(state => state.setSampleEditorScrollLeft);

    // ========================================================================
    // SHARED TIMELINE CALCULATIONS
    // ========================================================================
    const { totalWidth } = useTimelineCalculations();

    // ========================================================================
    // DERIVED STATE: Find clip by ID
    // ========================================================================
    const clip = sampleEditorClipId ? clips.find(c => c.id === sampleEditorClipId) : undefined;

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
    // VALIDATION: Empty state - no clip selected
    // ========================================================================
    if (!clip) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center overflow-hidden min-h-0 min-w-0">
                <div className="text-muted-foreground">
                    <Music size={48} className="mx-auto mb-4 opacity-20" />
                    <div className="text-base font-medium mb-1">No Audio Clip Selected</div>
                    <div className="text-xs text-muted-foreground/70">
                        Double-click an audio clip in the timeline above to open it in the sample editor.
                    </div>
                </div>
            </div>
        );
    }

    // ========================================================================
    // VALIDATION: Clip type must be audio
    // ========================================================================
    if (clip.type !== "audio") {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center overflow-hidden min-h-0 min-w-0">
                <div className="text-muted-foreground">
                    <Music size={48} className="mx-auto mb-4 opacity-20" />
                    <div className="text-base font-medium mb-1">Invalid Clip Type</div>
                    <div className="text-xs text-muted-foreground/70">
                        Sample editor can only edit audio clips. This is a {clip.type} clip.
                    </div>
                </div>
            </div>
        );
    }

    // ========================================================================
    // VALIDATION: Audio file path must exist
    // ========================================================================
    if (!clip.audio_file_path) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center overflow-hidden min-h-0 min-w-0">
                <div className="text-muted-foreground">
                    <Music size={48} className="mx-auto mb-4 opacity-20" />
                    <div className="text-base font-medium mb-1">No Audio File</div>
                    <div className="text-xs text-muted-foreground/70">
                        This audio clip has no associated audio file.
                    </div>
                </div>
            </div>
        );
    }

    // ========================================================================
    // LOAD WAVEFORM DATA: Use hook (2000 samples for detailed editor view)
    // ========================================================================
    const { leftData: waveformData, rightData: waveformDataRight } = useWaveformData({
        sampleId: clip.audio_file_path,
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
        await updateClip(clip.id, { gain: newGain });
    };

    const handleClose = () => {
        closeSampleEditor();
    };

    const handleSampleEditorScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        setSampleEditorScrollLeft(scrollLeft);
    };

    // ========================================================================
    // RENDER: Header + SequencerGridLayout with SampleEditorGrid
    // ========================================================================
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

            {/* Sample Editor Content - Use SequencerGridLayout */}
            {waveformData.length > 0 ? (
                <SequencerGridLayout
                    cornerHeader={
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                            Waveform
                        </span>
                    }
                    ruler={<SampleEditorRuler clipId={clip.id} />}
                    sidebar={
                        <div className="flex-1 flex items-center justify-center text-muted-foreground/30 text-sm bg-background">
                            {/* Empty placeholder - could add controls here later */}
                        </div>
                    }
                    mainContent={
                        <SampleEditorGrid
                            clipId={clip.id}
                            waveformData={waveformData}
                            waveformDataRight={waveformDataRight}
                        />
                    }
                    sidebarWidth={256}
                    headerHeight={32}
                    contentWidth={totalWidth}
                    scrollRef={sampleEditorScrollRef}
                    onScroll={handleSampleEditorScroll}
                    rulerScrollDataAttr="data-sample-ruler-scroll"
                    sidebarScrollDataAttr="data-sample-sidebar"
                />
            ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    Loading waveform...
                </div>
            )}
        </div>
    );
}

