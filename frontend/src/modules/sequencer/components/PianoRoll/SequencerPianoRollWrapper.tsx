/**
 * SequencerPianoRollWrapper Component
 *
 * REFACTORED: Minimal wrapper for piano roll
 * - SequencerPianoRoll now reads from Zustand directly (transport, activeNotes, etc.)
 * - This wrapper only handles empty states and clip validation
 * - No adapter layer needed - SequencerPianoRoll is self-contained
 *
 * Responsibilities:
 * 1. Empty state when no clip is selected
 * 2. Clip type validation (MIDI vs audio)
 * 3. Drag state sync with timeline (for real-time visual updates)
 */

import { SequencerPianoRoll } from "./SequencerPianoRoll.tsx";
import { Music } from "lucide-react";
import type { SequencerClip, SequencerTrack } from "../../types.ts";

interface SequencerPianoRollWrapperProps {
    clip: SequencerClip | undefined;
    track: SequencerTrack | undefined;
    clipDragState?: { startTime: number; duration: number } | null;
    totalBeats: number;
    pianoRollScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function SequencerPianoRollWrapper({
    clip,
    track,
    clipDragState,
    totalBeats,
    pianoRollScrollRef,
}: SequencerPianoRollWrapperProps) {
    // No adapter layer needed - SequencerPianoRoll reads from Zustand directly

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
            pianoRollScrollRef={pianoRollScrollRef}
        />
    );
}

