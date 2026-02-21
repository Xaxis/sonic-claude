/**
 * PianoRollWrapper Component
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
import type { SequencerClip, SequencerTrack } from "../types";
import type { MIDIEvent } from "../types";
import type { ActiveNote } from "@/hooks/useTransportWebsocket.ts";

interface PianoRollWrapperProps {
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

    // Scroll refs
    timelineScrollRef: React.RefObject<HTMLDivElement | null>;
    pianoRollScrollRef: React.RefObject<HTMLDivElement | null>;
    onPianoRollScroll: (e: React.UIEvent<HTMLDivElement>) => void;

    // Handlers
    onClose: () => void;
    onUpdateNotes: (clipId: string, notes: MIDIEvent[]) => Promise<void>;
    onSeek?: (position: number, triggerAudio?: boolean) => void;
    onLoopStartChange: (start: number) => void;
    onLoopEndChange: (end: number) => void;
}

export function PianoRollWrapper(props: PianoRollWrapperProps) {
    const {
        clip,
        track,
        clipDragState,
        totalBeats,
        currentPosition,
        isPlaying,
        pianoRollScrollRef,
        onPianoRollScroll,
        onClose,
        onUpdateNotes,
        onSeek,
        onLoopStartChange,
        onLoopEndChange,
    } = props;

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
            activeNotes={props.activeNotes}
            currentPosition={currentPosition}
            isPlaying={isPlaying}
            pianoRollScrollRef={pianoRollScrollRef}
            onPianoRollScroll={onPianoRollScroll}
            onClose={onClose}
            onUpdateNotes={onUpdateNotes}
            onSeek={onSeek}
            onLoopStartChange={onLoopStartChange}
            onLoopEndChange={onLoopEndChange}
        />
    );
}

