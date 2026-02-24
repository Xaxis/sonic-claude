/**
 * SequencerTimelineRuler - Time ruler with measure markers
 *
 * REFACTORED: Uses Zustand best practices
 * - Reads zoom, snapEnabled, gridSize from store
 * - Calls seek action directly from store
 * - Only receives calculated values (rulerMarkers, totalWidth, pixelsPerBeat)
 *
 * Displays measure numbers and beat markers at the top of the timeline.
 * Supports click-to-seek functionality.
 */

import { useDAWStore } from '@/stores/dawStore';

interface RulerMarker {
    beat: number;
    x: number;
    isMeasure: boolean;
    isBeat?: boolean;
    label: string;
}

interface SequencerTimelineRulerProps {
    rulerMarkers: RulerMarker[];
    totalWidth: number;
    pixelsPerBeat: number;
}

export function SequencerTimelineRuler({
    rulerMarkers,
    totalWidth,
    pixelsPerBeat,
}: SequencerTimelineRulerProps) {
    // ========================================================================
    // STATE: Read directly from Zustand store
    // ========================================================================
    const zoom = useDAWStore(state => state.zoom);
    const snapEnabled = useDAWStore(state => state.snapEnabled);
    const gridSize = useDAWStore(state => state.gridSize);

    // ========================================================================
    // ACTIONS: Get directly from Zustand store
    // ========================================================================
    const seek = useDAWStore(state => state.seek);

    const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickedBeat = clickX / (pixelsPerBeat * zoom);

        // Apply snap if enabled
        const snappedBeat = snapEnabled
            ? Math.round(clickedBeat * gridSize) / gridSize
            : clickedBeat;

        // Click to seek - trigger audio once at the clicked position
        seek(Math.max(0, snappedBeat), true);
    };

    return (
        <div
            className="h-8 cursor-pointer hover:bg-muted/30 transition-colors"
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

