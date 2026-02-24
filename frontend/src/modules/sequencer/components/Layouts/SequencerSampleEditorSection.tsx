/**
 * SequencerSampleEditorSection Component
 *
 * REFACTORED: Pure layout component matching SequencerPianoRollSection architecture
 * - Only receives clipId, waveformData, and scroll ref
 * - Reads clip data from Zustand store
 * - Calls Zustand actions directly
 *
 * Architecture:
 * - Left panel: Fixed width (w-64), absolutely positioned, empty placeholder
 * - Right grid: Flexible width, single scrollbar controls both
 * - Ruler at top with playhead indicator
 * - Waveform overlaid on grid
 */

import React from "react";
import { SampleEditorRuler } from "../SampleEditor/SampleEditorRuler.tsx";
import { WaveformDisplay } from "../../../../components/ui/waveform-display.tsx";
import { SequencerTimelineLoopRegion } from "../Timeline/SequencerTimelineLoopRegion.tsx";
import { useDAWStore } from '@/stores/dawStore.ts';
import { useTimelineCalculations } from "../../hooks/useTimelineCalculations.ts";
import { SequencerGridLayout } from "./SequencerGridLayout.tsx";

interface SequencerSampleEditorSectionProps {
    // Clip identifier
    clipId: string;

    // Waveform data
    waveformData: number[];
    waveformDataRight?: number[]; // Optional right channel for stereo

    // Scroll ref
    sampleEditorScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function SequencerSampleEditorSection({
    clipId,
    waveformData,
    waveformDataRight,
    sampleEditorScrollRef,
}: SequencerSampleEditorSectionProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const clips = useDAWStore(state => state.clips);
    const clipDragStates = useDAWStore(state => state.clipDragStates);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const setSampleEditorScrollLeft = useDAWStore(state => state.setSampleEditorScrollLeft);

    // ========================================================================
    // SHARED TIMELINE CALCULATIONS: Use the same hook as timeline for consistency!
    // ========================================================================
    const { pixelsPerBeat, totalWidth, zoom } = useTimelineCalculations();

    // ========================================================================
    // DERIVED STATE: Get clip data
    // ========================================================================
    const clip = clips.find(c => c.id === clipId);
    const clipDragState = clipDragStates.get(clipId);

    // Use drag state if available (for real-time sync with timeline)
    const clipStartTime = clipDragState?.startTime ?? clip?.start_time ?? 0;
    const clipDuration = clipDragState?.duration ?? clip?.duration ?? 0;

    const beatWidth = pixelsPerBeat * zoom;

    // ========================================================================
    // HANDLERS
    // ========================================================================
    const handleSampleEditorScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        setSampleEditorScrollLeft(scrollLeft);
    };

    return (
        <SequencerGridLayout
            cornerHeader={
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Waveform
                </span>
            }
            ruler={
                <SampleEditorRuler clipId={clipId} />
            }
            sidebar={
                <div className="flex-1 flex items-center justify-center text-muted-foreground/30 text-sm bg-background">
                    {/* Empty placeholder - could add controls here later */}
                </div>
            }
            mainContent={
                <div className="relative w-full" style={{ minHeight: '400px', height: '100%' }}>
                    {/* Grid background with beat lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                        {/* Beat lines - use percentage for y coordinates to fill height */}
                        {Array.from({ length: Math.ceil(totalWidth / beatWidth) + 1 }).map((_, i) => (
                            <line
                                key={`beat-${i}`}
                                x1={i * beatWidth}
                                y1="0%"
                                x2={i * beatWidth}
                                y2="100%"
                                stroke="hsl(220 15% 20%)"
                                strokeWidth={i % 4 === 0 ? 1.5 : 0.5}
                                opacity={i % 4 === 0 ? 0.6 : 0.3}
                                vectorEffect="non-scaling-stroke"
                            />
                        ))}
                        {/* Center line */}
                        <line
                            x1={0}
                            y1="50%"
                            x2={totalWidth}
                            y2="50%"
                            stroke="hsl(220 15% 25%)"
                            strokeWidth={1}
                            opacity={0.4}
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>

                    {/* Clip Region Highlight (matches piano roll pattern) */}
                    <div
                        className="absolute top-0 bottom-0 bg-cyan-500/5 border-l-2 border-r-2 border-cyan-500/30 pointer-events-none"
                        style={{
                            left: `${clipStartTime * beatWidth}px`,
                            width: `${clipDuration * beatWidth}px`,
                        }}
                    />

                    {/* Waveform overlay - positioned within clip region */}
                    <div
                        className="absolute top-0 bottom-0 w-full h-full"
                        style={{
                            left: `${clipStartTime * beatWidth}px`,
                            width: `${clipDuration * beatWidth}px`,
                        }}
                    >
                        <WaveformDisplay
                            data={waveformData}
                            rightData={waveformDataRight}
                            color="hsl(220 15% 50%)"
                            backgroundColor="transparent"
                            showGrid={false}
                            glowEffect={false}
                            className="w-full h-full"
                        />
                    </div>

                    {/* Loop Region - Overlaid on waveform */}
                    <SequencerTimelineLoopRegion />
                </div>
            }
            sidebarWidth={256}
            headerHeight={32}
            contentWidth={totalWidth}
            scrollRef={sampleEditorScrollRef}
            onScroll={handleSampleEditorScroll}
            rulerScrollDataAttr="data-sample-ruler-scroll"
            sidebarScrollDataAttr="data-sample-sidebar"
        />
    );
}

