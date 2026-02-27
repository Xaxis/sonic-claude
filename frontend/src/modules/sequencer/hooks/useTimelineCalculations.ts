/**
 * useTimelineCalculations Hook
 *
 * Shared calculation logic for timeline dimensions and ruler markers.
 * Used by both SequencerTimeline and SequencerTimelineSection to ensure consistency.
 */

import { useDAWStore } from '@/stores/dawStore';
import {
    TIMELINE_PIXELS_PER_BEAT,
    TIMELINE_BEATS_PER_MEASURE,
    TIMELINE_MIN_BEATS,
    TIMELINE_PADDING_BEATS,
} from '@/config/daw.constants';

export function useTimelineCalculations() {
    const clips = useDAWStore(state => state.clips);
    const zoom = useDAWStore(state => state.zoom);

    const pixelsPerBeat = TIMELINE_PIXELS_PER_BEAT;
    const beatsPerMeasure = TIMELINE_BEATS_PER_MEASURE;

    // Calculate timeline width dynamically based on clips
    const maxClipEnd = clips.length > 0
        ? Math.max(...clips.map(c => c.start_time + c.duration))
        : 0;
    const totalBeats = Math.max(TIMELINE_MIN_BEATS, Math.ceil(maxClipEnd) + TIMELINE_PADDING_BEATS);
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

