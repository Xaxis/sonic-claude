/**
 * SequencerSplitLayout Component
 *
 * REFACTORED: Pure layout component using Zustand best practices
 * - No prop drilling - child components read from store directly
 * - Only manages local UI state (split ratio, drag states)
 * - Only receives scroll refs and active notes
 *
 * Layout for when piano roll or sample editor is open.
 * Features drag-resizable split between timeline (top) and editor (bottom).
 */

import React, { useState, useCallback, useEffect } from "react";
import { Music } from "lucide-react";
import { SequencerTimelineSection } from "./SequencerTimelineSection.tsx";
import { SequencerPianoRollWrapper } from "./SequencerPianoRollWrapper.tsx";
import { useDAWStore } from '@/stores/dawStore';
import { statePersistence } from "@/services/state-persistence/state-persistence.service";
import type { ActiveNote } from "@/hooks/useTransportWebsocket.ts";

interface SequencerSplitLayoutProps {
    // Scroll refs for auto-scroll functionality
    timelineScrollRef: React.RefObject<HTMLDivElement | null>;
    pianoRollScrollRef: React.RefObject<HTMLDivElement | null>;
    sampleEditorScrollRef: React.RefObject<HTMLDivElement | null>;

    // Active notes for visual feedback
    activeNotes?: ActiveNote[];
}

export function SequencerSplitLayout({
    timelineScrollRef,
    pianoRollScrollRef,
    sampleEditorScrollRef,
    activeNotes,
}: SequencerSplitLayoutProps) {

    // ========================================================================
    // STATE: Read directly from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);
    const clips = useDAWStore(state => state.clips);
    const transport = useDAWStore(state => state.transport);
    const currentPosition = transport?.position_beats ?? 0;
    const isPlaying = transport?.is_playing ?? false;
    const pianoRollClipId = useDAWStore(state => state.pianoRollClipId);
    const showPianoRoll = useDAWStore(state => state.showPianoRoll);

    // ========================================================================
    // LOCAL UI STATE: Split ratio and drag states
    // ========================================================================
    const [timelineHeightPercent, setTimelineHeightPercent] = useState(() => {
        return statePersistence.getSequencerSplitRatio();
    });
    const [isDragging, setIsDragging] = useState(false);

    // Track clip drag states for piano roll sync
    const [clipDragStates, setClipDragStates] = useState<Map<string, { startTime: number; duration: number } | null>>(new Map());

    // ========================================================================
    // HANDLERS: Clip drag state sync
    // ========================================================================
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
        statePersistence.setSequencerSplitRatio(timelineHeightPercent);
    }, [timelineHeightPercent]);

    // Handle divider drag
    const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
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
    const pianoRollClip = clips.find(c => c.id === pianoRollClipId);

    // Find the track for the clip (to get instrument)
    const pianoRollTrack = pianoRollClip ? tracks.find(t => t.id === pianoRollClip.track_id) : undefined;

    // Get drag state for active editor clips (if being dragged)
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
                className="min-h-0 flex flex-col overflow-hidden"
                style={{ flexGrow: timelineHeightPercent, flexShrink: 1, flexBasis: 0 }}
            >
                <SequencerTimelineSection
                    timelineScrollRef={timelineScrollRef}
                    onClipDragStateChange={handleClipDragStateChange}
                />
            </div>

            {/* Resizable Divider */}
            <div
                className={`h-1 flex-shrink-0 border-t border-border bg-background hover:bg-accent cursor-row-resize flex items-center justify-center group ${isDragging ? 'bg-accent' : ''}`}
                onMouseDown={handleDividerMouseDown}
                onDoubleClick={handleDividerDoubleClick}
                title="Drag to resize, double-click to reset"
            >
                <div className="w-12 h-0.5 bg-border group-hover:bg-foreground/50 rounded-full" />
            </div>

            {/* Editor Section - Bottom (resizable) - Piano Roll or Sample Editor */}
            <div
                className="min-h-0 overflow-hidden"
                style={{ flexGrow: 100 - timelineHeightPercent, flexShrink: 1, flexBasis: 0 }}
            >
                <div className="h-full flex flex-col overflow-hidden">
                    {showPianoRoll ? (
                        <SequencerPianoRollWrapper
                            clip={pianoRollClip}
                            track={pianoRollTrack}
                            clipDragState={pianoRollClipDragState}
                            totalBeats={totalBeats}
                            activeNotes={activeNotes}
                            currentPosition={currentPosition}
                            isPlaying={isPlaying ?? false}
                            pianoRollScrollRef={pianoRollScrollRef}
                        />
                    ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-muted/20">
                            <div className="text-muted-foreground">
                                <Music size={48} className="mx-auto mb-4 opacity-20" />
                                <div className="text-base font-medium mb-1">No Editor Open</div>
                                <div className="text-xs text-muted-foreground/70">
                                    Double-click a clip in the timeline above to open it in the editor.
                                </div>
                            </div>
                        </div>
                    )}
                    {/* TODO: Implement sample editor */}
                </div>
            </div>
        </div>
    );
}

