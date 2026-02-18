/**
 * SequencerPianoRollRuler - Timeline ruler for piano roll
 * 
 * Displays beat/measure markers and playhead position.
 * Follows the same pattern as SequencerTimelineRuler and SampleEditorRuler.
 */

import { useEffect, useRef } from "react";

interface RulerMarker {
    beat: number;
    x: number;
    isMeasure: boolean;
    label: string;
}

interface SequencerPianoRollRulerProps {
    totalBeats: number; // Total composition length in beats
    currentPosition: number; // Current playback position in beats
    isPlaying: boolean;
    zoom: number;
    pixelsPerBeat: number;
    totalWidth: number;
    snapEnabled: boolean;
    gridSize: number;
    onSeek?: (position: number, triggerAudio?: boolean) => void;
}

export function SequencerPianoRollRuler({
    totalBeats,
    currentPosition,
    isPlaying,
    zoom,
    pixelsPerBeat,
    totalWidth,
    snapEnabled,
    gridSize,
    onSeek,
}: SequencerPianoRollRulerProps) {
    const playheadRef = useRef<HTMLDivElement>(null);
    const beatsPerMeasure = 4;
    const beatWidth = pixelsPerBeat * zoom;

    // Generate ruler markers
    const rulerMarkers: RulerMarker[] = [];
    const totalBeatsToShow = Math.ceil(totalBeats) + 1;

    for (let beat = 0; beat <= totalBeatsToShow; beat++) {
        const x = beat * beatWidth;
        const isMeasure = beat % beatsPerMeasure === 0;
        const measure = Math.floor(beat / beatsPerMeasure) + 1;

        rulerMarkers.push({
            beat,
            x,
            isMeasure,
            label: isMeasure ? `${measure}` : "",
        });
    }

    // Calculate playhead position
    const playheadX = currentPosition * beatWidth;

    // Smooth playhead animation using requestAnimationFrame
    useEffect(() => {
        if (!playheadRef.current || !isPlaying) return;

        let animationFrameId: number;
        const animate = () => {
            if (playheadRef.current) {
                playheadRef.current.style.transform = `translateX(${playheadX}px)`;
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isPlaying, playheadX]);

    const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onSeek) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickedBeat = clickX / beatWidth;

        // Apply snap if enabled
        const snappedBeat = snapEnabled
            ? Math.round(clickedBeat * gridSize) / gridSize
            : clickedBeat;

        // Click to seek - trigger audio once at the clicked position
        onSeek(Math.max(0, snappedBeat), true);
    };

    return (
        <div
            className="relative h-8 border-b border-border bg-muted/30 flex-shrink-0 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={handleRulerClick}
            title="Click to seek"
            style={{ width: totalWidth }}
        >
            {/* Ruler markers */}
            <div className="relative h-full pointer-events-none">
                {rulerMarkers.map((marker, index) => (
                    <div
                        key={`${marker.beat}-${index}`}
                        className="absolute top-0 bottom-0 flex flex-col"
                        style={{ left: `${marker.x}px`, transform: 'translateX(-0.5px)' }}
                    >
                        {marker.isMeasure ? (
                            <>
                                <div className="text-xs text-muted-foreground px-1">
                                    {marker.label}
                                </div>
                                <div className="flex-1 w-px bg-border" />
                            </>
                        ) : (
                            <div className="flex-1 w-px bg-border/40 mt-4" />
                        )}
                    </div>
                ))}
            </div>

            {/* Playhead indicator */}
            <div
                ref={playheadRef}
                className="absolute top-0 bottom-0 w-1 bg-red-500 z-50 pointer-events-none"
                style={{
                    transform: `translateX(${playheadX}px)`,
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)',
                    willChange: 'transform',
                }}
            >
                {/* Playhead triangle at top */}
                <div
                    className="absolute -top-3 -left-2.5 w-0 h-0"
                    style={{
                        borderLeft: '10px solid transparent',
                        borderRight: '10px solid transparent',
                        borderTop: '12px solid #ef4444',
                    }}
                />
            </div>
        </div>
    );
}

