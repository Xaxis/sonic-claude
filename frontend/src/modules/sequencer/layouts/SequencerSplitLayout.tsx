/**
 * SequencerSplitLayout Component
 *
 * Layout for when piano roll is open.
 * Features drag-resizable split between timeline (top) and piano roll (bottom).
 */

import React, { useState, useCallback, useEffect } from "react";
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
    isPlaying?: boolean;
    tempo?: number;
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

    // Resizable split state - percentage of height for timeline (0-100)
    const [timelineHeightPercent, setTimelineHeightPercent] = useState(() => {
        const saved = localStorage.getItem('sequencer-split-ratio');
        return saved ? parseFloat(saved) : 50;
    });
    const [isDragging, setIsDragging] = useState(false);

    // Track clip drag states for piano roll sync
    const [clipDragStates, setClipDragStates] = useState<Map<string, { startTime: number; duration: number } | null>>(new Map());

    // Handle clip drag state changes from timeline
    const handleClipDragStateChange = useCallback((clipId: string, dragState: { startTime: number; duration: number } | null) => {
        setClipDragStates(prev => {
            const next = new Map(prev);
            if (dragState === null) {
                next.delete(clipId);
            } else {
                next.set(clipId, dragState);
            }
            return next;
        });
    }, []);

    // Save split ratio to localStorage
    useEffect(() => {
        localStorage.setItem('sequencer-split-ratio', timelineHeightPercent.toString());
    }, [timelineHeightPercent]);

    // Handle divider drag
    const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    // Handle mouse move during drag
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const container = document.querySelector('.sequencer-split-container');
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const percent = (y / rect.height) * 100;

            // Constrain between 20% and 80%
            const constrainedPercent = Math.max(20, Math.min(80, percent));
            setTimelineHeightPercent(constrainedPercent);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Handle double-click to reset to 50/50
    const handleDividerDoubleClick = useCallback(() => {
        setTimelineHeightPercent(50);
    }, []);

    // Find the clip for piano roll
    const clip = clips.find(c => c.id === pianoRollClipId);

    // Get drag state for piano roll clip (if being dragged)
    const pianoRollClipDragState = pianoRollClipId ? clipDragStates.get(pianoRollClipId) : null;

    // Calculate totalBeats (same as timeline)
    const minBeats = 64; // Minimum 16 measures
    const maxClipEnd = clips.length > 0
        ? Math.max(...clips.map(c => c.start_time + c.duration))
        : 0;
    const totalBeats = Math.max(minBeats, Math.ceil(maxClipEnd) + 128); // Always add 128 beats (32 measures) padding after last clip

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden sequencer-split-container">
            {/* Timeline Section - Top (resizable) */}
            <div
                className="min-h-0 flex relative overflow-hidden"
                style={{ height: `${timelineHeightPercent}%` }}
            >
                <SequencerTimelineSection
                    {...timelineSectionProps}
                    clips={clips}
                    zoom={zoom}
                    snapEnabled={snapEnabled}
                    gridSize={gridSize}
                    pianoRollClipId={pianoRollClipId}
                    timelineScrollRef={timelineScrollRef}
                    isPlaying={props.isPlaying}
                    tempo={props.tempo}
                    onClipDragStateChange={handleClipDragStateChange}
                />
            </div>

            {/* Resizable Divider */}
            <div
                className={`h-1 border-t border-border bg-background hover:bg-accent cursor-row-resize flex items-center justify-center group ${isDragging ? 'bg-accent' : ''}`}
                onMouseDown={handleDividerMouseDown}
                onDoubleClick={handleDividerDoubleClick}
                title="Drag to resize, double-click to reset"
            >
                <div className="w-12 h-0.5 bg-border group-hover:bg-foreground/50 rounded-full" />
            </div>

            {/* Piano Roll Section - Bottom (resizable) */}
            <div
                className="min-h-0 overflow-hidden"
                style={{ height: `${100 - timelineHeightPercent}%` }}
            >
                <div className="h-full flex flex-col overflow-hidden">
                    <PianoRollWrapper
                        clip={clip}
                        clipDragState={pianoRollClipDragState}
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

