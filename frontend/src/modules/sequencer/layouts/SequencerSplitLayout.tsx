/**
 * SequencerSplitLayout Component
 * 
 * Layout for when piano roll is open.
 * Splits the view 50/50 between timeline (top) and piano roll (bottom).
 */

import React from "react";
import { SequencerTimelineSection } from "./SequencerTimelineSection.tsx";
import { SequencerPanelPianoRoll } from "../components/PianoRoll/SequencerPanelPianoRoll.tsx";
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
    onTimelineScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    
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
        onClosePianoRoll,
        onUpdateMIDINotes,
        ...timelineSectionProps
    } = props;

    // Find the clip for piano roll
    const clip = clips.find(c => c.id === pianoRollClipId);
    
    // Calculate totalBeats (same as timeline)
    const minBeats = 128;
    const maxClipEnd = clips.length > 0
        ? Math.max(...clips.map(c => c.start_time + c.duration))
        : 0;
    const totalBeats = Math.max(minBeats, Math.ceil(maxClipEnd) + 32);

    return (
        <div className="flex-1 min-h-0 flex flex-col">
            {/* Timeline Section - Top Half */}
            <div className="flex-1 min-h-0 flex relative">
                <SequencerTimelineSection
                    {...timelineSectionProps}
                    clips={clips}
                    zoom={zoom}
                    snapEnabled={snapEnabled}
                    gridSize={gridSize}
                    pianoRollClipId={pianoRollClipId}
                />
            </div>

            {/* Piano Roll Section - Bottom Half */}
            <div className="flex-1 min-h-0 border-t border-border">
                {clip && clip.type === "midi" && (
                    <div className="h-full flex flex-col bg-gray-950 overflow-hidden">
                        <SequencerPanelPianoRoll
                            isOpen={showPianoRoll}
                            clipId={clip.id}
                            clipName={clip.name}
                            clipDuration={clip.duration}
                            clipStartTime={clip.start_time}
                            midiEvents={clip.midi_events || []}
                            snapEnabled={snapEnabled}
                            gridSize={gridSize}
                            zoom={zoom}
                            totalBeats={totalBeats}
                            onClose={onClosePianoRoll}
                            onUpdateNotes={onUpdateMIDINotes}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

