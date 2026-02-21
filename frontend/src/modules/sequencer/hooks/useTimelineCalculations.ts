/**
 * useTimelineCalculations Hook
 *
 * Shared calculation logic for timeline dimensions and ruler markers.
 * Used by both SequencerTimeline and SequencerTimelineSection to ensure consistency.
 */

import { useSequencer } from '@/contexts/SequencerContext';

export function useTimelineCalculations() {
    const { clips, zoom } = useSequencer();
    
    const pixelsPerBeat = 40;
    const beatsPerMeasure = 4;

    // Calculate timeline width dynamically based on clips
    const minBeats = 64; // Minimum 16 measures
    const maxClipEnd = clips.length > 0
        ? Math.max(...clips.map(c => c.start_time + c.duration))
        : 0;
    const totalBeats = Math.max(minBeats, Math.ceil(maxClipEnd) + 128); // Always add 128 beats (32 measures) padding after last clip
    const totalWidth = totalBeats * pixelsPerBeat * zoom + 1000;

    // Generate ruler markers - always show beats, not grid subdivisions
    const rulerMarkers = [];
    for (let beat = 0; beat <= totalBeats; beat++) {
        const x = beat * pixelsPerBeat * zoom;
        const isMeasure = beat % beatsPerMeasure === 0;
        const isBeat = true; // All markers are beat markers
        const measure = Math.floor(beat / beatsPerMeasure) + 1;

        rulerMarkers.push({
            beat,
            x,
            isMeasure,
            isBeat,
            label: isMeasure ? `${measure}` : "",
        });
    }

    return {
        pixelsPerBeat,
        beatsPerMeasure,
        totalBeats,
        totalWidth,
        rulerMarkers,
        zoom,
    };
}

