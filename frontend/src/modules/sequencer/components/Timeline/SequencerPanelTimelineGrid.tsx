/**
 * SequencerPanelTimelineGrid - Grid lines background
 * 
 * Displays vertical grid lines for beats and measures.
 */

interface RulerMarker {
    beat: number;
    x: number;
    isMeasure: boolean;
    isBeat?: boolean;
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
            {rulerMarkers.map((marker, index) => (
                <div
                    key={`${marker.beat}-${index}`}
                    className={
                        marker.isMeasure
                            ? "absolute top-0 bottom-0 w-px bg-border"
                            : "absolute top-0 bottom-0 w-px bg-border/20"
                    }
                    style={{ left: `${marker.x}px`, transform: 'translateX(-0.5px)' }}
                />
            ))}
        </div>
    );
}

