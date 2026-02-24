/**
 * SequencerSampleEditorWrapper Component
 *
 * REFACTORED: Minimal wrapper for sample editor
 * - SequencerSampleEditor now reads from Zustand directly (transport, etc.)
 * - This wrapper only handles empty states and clip validation
 * - No adapter layer needed - SequencerSampleEditor is self-contained
 *
 * Responsibilities:
 * 1. Empty state when no clip is selected
 * 2. Clip type validation (audio vs MIDI)
 * 3. Drag state sync with timeline (for real-time visual updates)
 */

import { SequencerSampleEditor } from "./SequencerSampleEditor.tsx";
import { Music } from "lucide-react";
import type { SequencerClip } from "../../types.ts";

interface SequencerSampleEditorWrapperProps {
    clip: SequencerClip | undefined;
    clipDragState?: { startTime: number; duration: number } | null;
    totalBeats: number;
    sampleEditorScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function SequencerSampleEditorWrapper({
    clip,
    clipDragState,
    totalBeats,
    sampleEditorScrollRef,
}: SequencerSampleEditorWrapperProps) {
    // No adapter layer needed - SequencerSampleEditor reads from Zustand directly
    // Suppress unused variable warnings - will be used when needed
    void totalBeats;

    // ========================================================================
    // VALIDATION: Empty state - no clip selected
    // ========================================================================
    if (!clip) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center overflow-hidden min-h-0 min-w-0">
                <div className="text-muted-foreground">
                    <Music size={48} className="mx-auto mb-4 opacity-20" />
                    <div className="text-base font-medium mb-1">No Audio Clip Selected</div>
                    <div className="text-xs text-muted-foreground/70">
                        Double-click an audio clip in the timeline above to open it in the sample editor.
                    </div>
                </div>
            </div>
        );
    }

    // ========================================================================
    // VALIDATION: Clip type must be audio
    // ========================================================================
    if (clip.type !== "audio") {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center overflow-hidden min-h-0 min-w-0">
                <div className="text-muted-foreground">
                    <Music size={48} className="mx-auto mb-4 opacity-20" />
                    <div className="text-base font-medium mb-1">Invalid Clip Type</div>
                    <div className="text-xs text-muted-foreground/70">
                        Sample editor can only edit audio clips. This is a {clip.type} clip.
                    </div>
                </div>
            </div>
        );
    }

    // ========================================================================
    // VALIDATION: Audio file path must exist
    // ========================================================================
    if (!clip.audio_file_path) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center overflow-hidden min-h-0 min-w-0">
                <div className="text-muted-foreground">
                    <Music size={48} className="mx-auto mb-4 opacity-20" />
                    <div className="text-base font-medium mb-1">No Audio File</div>
                    <div className="text-xs text-muted-foreground/70">
                        This audio clip has no associated audio file.
                    </div>
                </div>
            </div>
        );
    }

    // ========================================================================
    // RENDER: Force re-render when clip or drag state changes
    // ========================================================================
    // Use drag state if available (for real-time sync with timeline)
    const effectiveStartTime = clipDragState?.startTime ?? clip.start_time;
    const effectiveDuration = clipDragState?.duration ?? clip.duration;

    // Force re-render when clip changes (to reset scroll position)
    const clipKey = `${clip.id}-${effectiveStartTime}-${effectiveDuration}`;

    return (
        <SequencerSampleEditor
            key={clipKey}
            clipId={clip.id}
            sampleEditorScrollRef={sampleEditorScrollRef}
        />
    );
}

