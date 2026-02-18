/**
 * SequencerSampleEditorSection Component
 * 
 * Shared layout component for sample editor left panel + grid.
 * Matches the architecture of SequencerPianoRollSection.
 * 
 * Architecture:
 * - Left panel: Fixed width (w-64), absolutely positioned, empty placeholder
 * - Right grid: Flexible width, single scrollbar controls both
 * - Ruler at top with playhead indicator
 * - Waveform overlaid on grid
 */

import React from "react";
import { SampleEditorRuler } from "../components/SampleEditor/SampleEditorRuler.tsx";
import { WaveformDisplay } from "../components/Shared/WaveformDisplay.tsx";
import { SequencerTimelineLoopRegion } from "../components/Timeline/SequencerTimelineLoopRegion.tsx";

interface SequencerSampleEditorSectionProps {
    // Waveform data
    waveformData: number[];
    waveformDataRight?: number[]; // Optional right channel for stereo

    // Clip info
    clipDuration: number; // beats
    clipStartTime: number; // beats - position in sequence
    totalBeats: number;
    
    // Playback
    currentPosition: number;
    isPlaying: boolean;
    
    // Display settings
    zoom: number;
    pixelsPerBeat: number;
    snapEnabled: boolean;
    gridSize: number;
    
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
    zoom,
    pixelsPerBeat,
    snapEnabled,
    gridSize,
    sampleEditorScrollRef,
    onSampleEditorScroll,
    onSeek,
}: SequencerSampleEditorSectionProps) {
    const beatWidth = pixelsPerBeat * zoom;
    // Add extra width to ensure content extends beyond viewport for smooth scrolling
    const waveformWidth = totalBeats * beatWidth + 1000;

    return (
        <div className="flex flex-1 min-h-0 relative">
            {/* Left Panel - Fixed width, empty placeholder (matches piano roll keyboard width) */}
            <div className="w-64 border-r border-border flex flex-col flex-shrink-0 bg-background absolute left-0 top-0 bottom-0 z-10">
                {/* Empty placeholder - could add controls here later */}
                <div className="flex-1 flex items-center justify-center text-muted-foreground/30 text-sm">
                    {/* Intentionally empty */}
                </div>
            </div>

            {/* Right Grid - ONLY scrollbar, controls everything */}
            <div
                ref={sampleEditorScrollRef}
                className="flex-1 min-w-0 min-h-0 overflow-auto"
                onScroll={onSampleEditorScroll}
                style={{ paddingLeft: '256px' }}
            >
                <div className="flex flex-col h-full">
                    {/* Ruler - Sticky at top, z-index lower than left panel so it scrolls underneath */}
                    <div className="sticky top-0 z-[5] bg-background">
                        <SampleEditorRuler
                            totalBeats={totalBeats}
                            clipDuration={clipDuration}
                            clipStartTime={clipStartTime}
                            currentPosition={currentPosition}
                            isPlaying={isPlaying}
                            zoom={zoom}
                            pixelsPerBeat={pixelsPerBeat}
                            totalWidth={waveformWidth}
                            onSeek={onSeek}
                        />
                    </div>

                    {/* Waveform Grid - fills remaining height */}
                    <div className="relative flex-1 min-h-0" style={{ width: waveformWidth }}>
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
                                className="absolute top-0 bottom-0"
                                style={{
                                    left: `${clipStartTime * beatWidth}px`,
                                    width: `${clipDuration * beatWidth}px`,
                                }}
                            >
                                <WaveformDisplay
                                    data={waveformData}
                                    rightData={waveformDataRight}
                                    width={clipDuration * beatWidth}
                                    color="hsl(220 15% 50%)"
                                    backgroundColor="transparent"
                                    showGrid={false}
                                    glowEffect={false}
                                />
                            </div>
                        </div>
                </div>
            </div>
        </div>
    );
}

