/**
 * SequencerSampleEditorSection Component
 *
 * Shared layout component for sample editor left panel + grid.
 * Matches the architecture of SequencerPianoRollSection.
 * Uses SequencerContext for state management.
 *
 * Architecture:
 * - Left panel: Fixed width (w-64), absolutely positioned, empty placeholder
 * - Right grid: Flexible width, single scrollbar controls both
 * - Ruler at top with playhead indicator
 * - Waveform overlaid on grid
 */

import React from "react";
import { SampleEditorRuler } from "../components/SampleEditor/SampleEditorRuler.tsx";
import { WaveformDisplay } from "../../../components/ui/waveform-display.tsx";
import { SequencerTimelineLoopRegion } from "../components/Timeline/SequencerTimelineLoopRegion.tsx";
import { useDAWStore } from '@/stores/dawStore';
import { SequencerGridLayout } from "./SequencerGridLayout.tsx";

interface SequencerSampleEditorSectionProps {
    // Waveform data
    waveformData: number[];
    waveformDataRight?: number[]; // Optional right channel for stereo

    // Clip info
    clipDuration: number; // beats
    clipStartTime: number; // beats - position in sequence
    totalBeats: number;

    // Playback (from WebSocket/AudioEngine, not from Context)
    currentPosition: number;
    isPlaying: boolean;
    pixelsPerBeat: number;

    // Scroll
    sampleEditorScrollRef: React.RefObject<HTMLDivElement | null>;
    onSampleEditorScroll: (e: React.UIEvent<HTMLDivElement>) => void;

    // Handlers
    onSeek?: (position: number, triggerAudio?: boolean) => void;
}

export function SequencerSampleEditorSection({
    waveformData,
    waveformDataRight,
    clipDuration,
    clipStartTime,
    totalBeats,
    currentPosition,
    isPlaying,
    pixelsPerBeat,
    sampleEditorScrollRef,
    onSampleEditorScroll,
    onSeek,
}: SequencerSampleEditorSectionProps) {
    // Get state from Zustand store
    const zoom = useDAWStore(state => state.zoom);
    const snapEnabled = useDAWStore(state => state.snapEnabled);
    const gridSize = useDAWStore(state => state.gridSize);

    const beatWidth = pixelsPerBeat * zoom;
    // Add extra width to ensure content extends beyond viewport for smooth scrolling
    const waveformWidth = totalBeats * beatWidth + 1000;

    return (
        <SequencerGridLayout
            cornerHeader={
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Waveform
                </span>
            }
            ruler={
                <SampleEditorRuler
                    totalBeats={totalBeats}
                    clipDuration={clipDuration}
                    clipStartTime={clipStartTime}
                    currentPosition={currentPosition}
                    isPlaying={isPlaying}
                    zoom={zoom}
                    pixelsPerBeat={pixelsPerBeat}
                    totalWidth={waveformWidth}
                    snapEnabled={snapEnabled}
                    gridSize={gridSize}
                    onSeek={onSeek}
                />
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
                        {Array.from({ length: Math.ceil(totalBeats) + 1 }).map((_, i) => (
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
                            x2={waveformWidth}
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
            contentWidth={waveformWidth}
            scrollRef={sampleEditorScrollRef}
            onScroll={onSampleEditorScroll}
            rulerScrollDataAttr="data-sample-ruler-scroll"
            sidebarScrollDataAttr="data-sample-sidebar"
        />
    );
}

