/**
 * SequencerPanelTimelineGrid - Grid lines background
 * 
 * Displays vertical grid lines for beats and measures.
 */

interface RulerMarker {
    beat: number;
    x: number;
    isMeasure: boolean;
    label: string;
}

interface SequencerPanelTimelineGridProps {
    rulerMarkers: RulerMarker[];
}

export function SequencerPanelTimelineGrid({
    rulerMarkers,
}: SequencerPanelTimelineGridProps) {
    return (
        <div className="absolute inset-0 pointer-events-none">
            {rulerMarkers.map((marker) => (
                <div
                    key={marker.beat}
                    className={
                        marker.isMeasure
                            ? "absolute top-0 bottom-0 w-px bg-border"
                            : "absolute top-0 bottom-0 w-px bg-border/20"
                    }
                    style={{ left: `${marker.x}px` }}
                />
            ))}
        </div>
    );
}

