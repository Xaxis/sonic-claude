/**
 * SequencerPianoRollWrapper Component
 *
 * REFACTORED: Uses Zustand best practices
 * - Reads state directly from store (no prop drilling)
 * - Calls actions directly from store (no handler props)
 * - Only receives clip/track data, drag state, and scroll refs
 *
 * Smart container for piano roll that handles:
 * 1. Auto-scroll to clip when piano roll opens
 * 2. Empty state when no clip is selected
 * 3. Proper clip data validation
 *
 * This is the "glue" layer between SequencerSplitLayout and SequencerPianoRoll.
 */

import { SequencerPianoRoll } from "../components/PianoRoll/SequencerPianoRoll.tsx";
import { Music } from "lucide-react";
import { useDAWStore } from '@/stores/dawStore';
import type { SequencerClip, SequencerTrack } from "../types";
import type { ActiveNote } from "@/hooks/useTransportWebsocket.ts";

interface SequencerPianoRollWrapperProps {
    // Clip data
    clip: SequencerClip | undefined;
    track: SequencerTrack | undefined; // Track for instrument info

    // Drag state (for real-time sync with timeline)
    clipDragState?: { startTime: number; duration: number } | null;

    // State (shared with timeline - Ableton pattern)
    totalBeats: number;
    activeNotes?: ActiveNote[];

    // Playback state
    currentPosition: number;
    isPlaying: boolean;

    // Scroll ref
    pianoRollScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function SequencerPianoRollWrapper({
    clip,
    track,
    clipDragState,
    totalBeats,
    activeNotes,
    currentPosition,
    isPlaying,
    pianoRollScrollRef,
}: SequencerPianoRollWrapperProps) {
    // ========================================================================
    // ACTIONS: Get directly from Zustand store
    // ========================================================================
    const closePianoRoll = useDAWStore(state => state.closePianoRoll);
    const updateClip = useDAWStore(state => state.updateClip);
    const seek = useDAWStore(state => state.seek);
    const setLoopStart = useDAWStore(state => state.setLoopStart);
    const setLoopEnd = useDAWStore(state => state.setLoopEnd);
    const setPianoRollScrollLeft = useDAWStore(state => state.setPianoRollScrollLeft);

    // ========================================================================
    // HANDLERS: Adapt store actions to component callbacks
    // ========================================================================
    const handleUpdateNotes = async (clipId: string, notes: any[]) => {
        await updateClip(clipId, { midi_events: notes });
    };

    const handlePianoRollScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        setPianoRollScrollLeft(scrollLeft);
    };

    // Empty state - no clip selected
    if (!clip) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center overflow-hidden min-h-0 min-w-0">
                <div className="text-muted-foreground">
                    <Music size={48} className="mx-auto mb-4 opacity-20" />
                    <div className="text-base font-medium mb-1">No MIDI Clip Selected</div>
                    <div className="text-xs text-muted-foreground/70">
                        Double-click a MIDI clip in the timeline above to open it in the piano roll editor.
                    </div>
                </div>
            </div>
        );
    }

    // Invalid clip type
    if (clip.type !== "midi") {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center overflow-hidden min-h-0 min-w-0">
                <div className="text-muted-foreground">
                    <Music size={48} className="mx-auto mb-4 opacity-20" />
                    <div className="text-base font-medium mb-1">Audio Clip Selected</div>
                    <div className="text-xs text-muted-foreground/70">
                        Piano roll only works with MIDI clips. The selected clip is an audio clip.
                    </div>
                </div>
            </div>
        );
    }

    // Valid MIDI clip - render piano roll
    // Use drag state if available (for real-time sync with timeline), otherwise use clip props
    const effectiveStartTime = clipDragState?.startTime ?? clip.start_time;
    const effectiveDuration = clipDragState?.duration ?? clip.duration;

    // Use key to force re-render when clip data changes
    const clipKey = `${clip.id}-${effectiveDuration}-${effectiveStartTime}-${clip.midi_events?.length || 0}`;

    return (
        <SequencerPianoRoll
            key={clipKey}
            clipId={clip.id}
            clipName={clip.name}
            clipDuration={effectiveDuration}
            clipStartTime={effectiveStartTime}
            midiEvents={clip.midi_events || []}
            totalBeats={totalBeats}
            instrument={track?.instrument}
            activeNotes={activeNotes}
            currentPosition={currentPosition}
            isPlaying={isPlaying}
            pianoRollScrollRef={pianoRollScrollRef}
            onPianoRollScroll={handlePianoRollScroll}
            onClose={closePianoRoll}
            onUpdateNotes={handleUpdateNotes}
            onSeek={seek}
            onLoopStartChange={setLoopStart}
            onLoopEndChange={setLoopEnd}
        />
    );
}

