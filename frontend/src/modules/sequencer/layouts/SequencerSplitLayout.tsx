/**
 * SequencerSplitLayout Component
 * 
 * Layout for when piano roll is open.
 * Splits the view 50/50 between timeline (top) and piano roll (bottom).
 */

import React from "react";
import { SequencerTimelineSection } from "./SequencerTimelineSection.tsx";
import { PianoRollWrapper } from "./PianoRollWrapper.tsx";
import type { SequencerTrack, Clip } from "@/types/sequencer";
import type { MIDIEvent } from "../types.ts";

interface SequencerSplitLayoutProps {
    // Data
    tracks: SequencerTrack[];
    clips: Clip[];
    pianoRollClipId: string | null;
    
    // State
    zoom: number;
    currentPosition: number;
    isLooping: boolean;
    loopStart: number;
    loopEnd: number;
    snapEnabled: boolean;
    gridSize: number;
    selectedClip: string | null;
    showPianoRoll: boolean;
    
    // Scroll
    timelineScrollRef: React.RefObject<HTMLDivElement | null>;
    pianoRollScrollRef: React.RefObject<HTMLDivElement | null>;
    onTimelineScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    onPianoRollScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    
    // Track handlers
    onToggleMute: (trackId: string) => Promise<void>;
    onToggleSolo: (trackId: string) => Promise<void>;
    onDeleteTrack: (trackId: string) => Promise<void>;
    onRenameTrack: (trackId: string, name: string) => Promise<void>;
    onUpdateTrack: (trackId: string, updates: { volume?: number; pan?: number }) => Promise<void>;
    
    // Clip handlers
    onSelectClip: (clipId: string | null) => void;
    onDuplicateClip: (clipId: string) => Promise<void>;
    onDeleteClip: (clipId: string) => Promise<void>;
    onAddClipToTrack: (trackId: string, startBeat: number) => Promise<void>;
    onMoveClip: (clipId: string, newStartTime: number) => Promise<void>;
    onResizeClip: (clipId: string, newDuration: number) => Promise<void>;
    onUpdateClip: (clipId: string, updates: { gain?: number; audio_offset?: number }) => Promise<void>;
    onOpenPianoRoll: (clipId: string) => void;
    
    // Loop handlers
    onLoopStartChange: (start: number) => void;
    onLoopEndChange: (end: number) => void;
    onSeek: (position: number, triggerAudio?: boolean) => Promise<void>;

    // Timeline controls (shared with piano roll)
    onToggleSnap: () => void;
    onSetGridSize: (size: number) => void;

    // Piano roll handlers
    onClosePianoRoll: () => void;
    onUpdateMIDINotes: (clipId: string, notes: MIDIEvent[]) => Promise<void>;
}

export function SequencerSplitLayout(props: SequencerSplitLayoutProps) {
    const {
        clips,
        pianoRollClipId,
        showPianoRoll,
        zoom,
        snapEnabled,
        gridSize,
        pianoRollScrollRef,
        onPianoRollScroll,
        onClosePianoRoll,
        onUpdateMIDINotes,
        onToggleSnap,
        onSetGridSize,
        timelineScrollRef,
        ...timelineSectionProps
    } = props;

    // Find the clip for piano roll
    const clip = clips.find(c => c.id === pianoRollClipId);

    // Calculate totalBeats (same as timeline)
    const minBeats = 64; // Minimum 16 measures
    const maxClipEnd = clips.length > 0
        ? Math.max(...clips.map(c => c.start_time + c.duration))
        : 0;
    const totalBeats = Math.max(minBeats, Math.ceil(maxClipEnd) + 128); // Always add 128 beats (32 measures) padding after last clip

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Timeline Section - Top Half (50%) */}
            <div className="flex-1 min-h-0 flex relative overflow-hidden">
                <SequencerTimelineSection
                    {...timelineSectionProps}
                    clips={clips}
                    zoom={zoom}
                    snapEnabled={snapEnabled}
                    gridSize={gridSize}
                    pianoRollClipId={pianoRollClipId}
                    timelineScrollRef={timelineScrollRef}
                />
            </div>

            {/* Piano Roll Section - Bottom Half (50%) */}
            <div className="flex-1 min-h-0 border-t border-border overflow-hidden">
                <div className="h-full flex flex-col overflow-hidden">
                    <PianoRollWrapper
                        clip={clip}
                        zoom={zoom}
                        snapEnabled={snapEnabled}
                        gridSize={gridSize}
                        totalBeats={totalBeats}
                        timelineScrollRef={timelineScrollRef}
                        pianoRollScrollRef={pianoRollScrollRef}
                        onPianoRollScroll={onPianoRollScroll}
                        onClose={onClosePianoRoll}
                        onUpdateNotes={onUpdateMIDINotes}
                        onToggleSnap={onToggleSnap}
                        onSetGridSize={onSetGridSize}
                    />
                </div>
            </div>
        </div>
    );
}

