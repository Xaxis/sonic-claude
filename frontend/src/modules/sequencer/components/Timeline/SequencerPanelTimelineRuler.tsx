/**
 * SequencerPanelTimelineRuler - Time ruler with measure markers
 * 
 * Displays measure numbers and beat markers at the top of the timeline.
 * Supports click-to-seek functionality.
 */

interface RulerMarker {
    beat: number;
    x: number;
    isMeasure: boolean;
    isBeat?: boolean;
    label: string;
}

interface SequencerPanelTimelineRulerProps {
    rulerMarkers: RulerMarker[];
    totalWidth: number;
    onSeek?: (position: number, triggerAudio?: boolean) => void;
    pixelsPerBeat: number;
    zoom: number;
    snapEnabled: boolean;
    gridSize: number;
}

export function SequencerPanelTimelineRuler({
    rulerMarkers,
    totalWidth,
    onSeek,
    pixelsPerBeat,
    zoom,
    snapEnabled,
    gridSize,
}: SequencerPanelTimelineRulerProps) {
    const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onSeek) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickedBeat = clickX / (pixelsPerBeat * zoom);

        // Apply snap if enabled
        const snappedBeat = snapEnabled
            ? Math.round(clickedBeat * gridSize) / gridSize
            : clickedBeat;

        // Click to seek - trigger audio once at the clicked position
        onSeek(Math.max(0, snappedBeat), true);
    };

    return (
        <div
            className="h-8 border-b border-border bg-muted/30 flex-shrink-0 sticky top-0 z-20 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={handleRulerClick}
            title="Click to seek"
        >
            <div className="relative h-full pointer-events-none" style={{ width: `${totalWidth}px` }}>
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
        </div>
    );
}

