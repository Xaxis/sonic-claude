/**
 * SequencerSampleEditorWrapper Component
 *
 * REFACTORED: Uses Zustand best practices
 * - Receives clip, clipDragState, totalBeats, and scroll ref from parent
 * - Handles validation and empty states
 * - Force re-render when clip changes
 *
 * This is the "glue" layer between SequencerSplitLayout and SequencerSampleEditor.
 */

import { SequencerSampleEditor } from "./SequencerSampleEditor.tsx";
import { Music } from "lucide-react";
import type { Clip } from '@/types/daw.types';

interface ClipDragState {
    startTime: number;
    duration: number;
}

interface SequencerSampleEditorWrapperProps {
    clip: Clip | undefined; // ✅ Data from parent - acceptable
    clipDragState: ClipDragState | null; // ✅ Data from parent - acceptable
    totalBeats: number; // ✅ Calculation from parent - acceptable
    sampleEditorScrollRef: React.RefObject<HTMLDivElement | null>; // ✅ Scroll ref - acceptable
}

export function SequencerSampleEditorWrapper({
    clip,
    clipDragState,
    totalBeats,
    sampleEditorScrollRef,
}: SequencerSampleEditorWrapperProps) {
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

