/**
 * SampleEditorWrapper Component
 * 
 * Smart container for sample editor that handles:
 * 1. Auto-scroll to clip when sample editor opens
 * 2. Empty state when no clip is selected
 * 3. Proper clip data validation
 * 
 * This is the "glue" layer between SequencerSplitLayout and SequencerSampleEditor.
 */

import { SequencerSampleEditor } from "../components/SampleEditor/SequencerSampleEditor.tsx";
import { Music } from "lucide-react";
import type { Clip } from "@/types/sequencer";

interface SampleEditorWrapperProps {
    // Clip data
    clip: Clip | undefined;

    // Drag state (for real-time sync with timeline)
    clipDragState?: { startTime: number; duration: number } | null;

    // State (shared with timeline - Ableton pattern)
    zoom: number; // Timeline zoom (shared)
    snapEnabled: boolean;
    gridSize: number;
    totalBeats: number;
    currentPosition: number; // Playback position
    isPlaying: boolean; // Playback state
    isLooping: boolean;
    loopStart: number;
    loopEnd: number;

    // Scroll refs
    timelineScrollRef: React.RefObject<HTMLDivElement | null>;
    sampleEditorScrollRef: React.RefObject<HTMLDivElement | null>;
    onSampleEditorScroll: (e: React.UIEvent<HTMLDivElement>) => void;

    // Handlers
    onClose: () => void;
    onUpdateClip: (clipId: string, updates: { gain?: number; audio_offset?: number }) => Promise<void>;
    onToggleSnap: () => void;
    onSetGridSize: (size: number) => void;
    onSeek?: (position: number, triggerAudio?: boolean) => void;
    onLoopStartChange: (start: number) => void;
    onLoopEndChange: (end: number) => void;
}

export function SampleEditorWrapper(props: SampleEditorWrapperProps) {
    const {
        clip,
        clipDragState,
        zoom,
        snapEnabled,
        gridSize,
        totalBeats,
        currentPosition,
        isPlaying,
        isLooping,
        loopStart,
        loopEnd,
        timelineScrollRef,
        sampleEditorScrollRef,
        onSampleEditorScroll,
        onClose,
        onUpdateClip,
        onToggleSnap,
        onSetGridSize,
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
                    <div className="text-base font-medium mb-1">No Audio Clip Selected</div>
                    <div className="text-xs text-muted-foreground/70">
                        Double-click an audio clip in the timeline above to open it in the sample editor.
                    </div>
                </div>
            </div>
        );
    }

    // Validate clip type
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

    // Validate audio file path
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

    // Use drag state if available (for real-time sync with timeline)
    const effectiveStartTime = clipDragState?.startTime ?? clip.start_time;
    const effectiveDuration = clipDragState?.duration ?? clip.duration;

    // Force re-render when clip changes (to reset scroll position)
    const clipKey = `${clip.id}-${effectiveStartTime}-${effectiveDuration}`;

    return (
        <SequencerSampleEditor
            key={clipKey}
            clipId={clip.id}
            clipName={clip.name}
            clipDuration={effectiveDuration}
            clipStartTime={effectiveStartTime}
            audioFilePath={clip.audio_file_path}
            audioOffset={clip.audio_offset}
            gain={clip.gain}
            snapEnabled={snapEnabled}
            gridSize={gridSize}
            zoom={zoom}
            totalBeats={totalBeats}
            currentPosition={currentPosition}
            isPlaying={isPlaying}
            isLooping={isLooping}
            loopStart={loopStart}
            loopEnd={loopEnd}
            sampleEditorScrollRef={sampleEditorScrollRef}
            onSampleEditorScroll={onSampleEditorScroll}
            onClose={onClose}
            onUpdateClip={onUpdateClip}
            onToggleSnap={onToggleSnap}
            onSetGridSize={onSetGridSize}
            onSeek={onSeek}
            onLoopStartChange={onLoopStartChange}
            onLoopEndChange={onLoopEndChange}
        />
    );
}

