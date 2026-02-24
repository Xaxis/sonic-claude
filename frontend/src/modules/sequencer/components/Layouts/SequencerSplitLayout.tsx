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
import { SequencerTimelineSection } from "../Timeline/SequencerTimelineSection.tsx";
import { SequencerPianoRoll } from "../PianoRoll/SequencerPianoRoll.tsx";
import { SequencerSampleEditor } from "../SampleEditor/SequencerSampleEditor.tsx";
import { useDAWStore } from '@/stores/dawStore.ts';

const SPLIT_RATIO_KEY = 'sonic-claude-sequencer-split-ratio';

interface SequencerSplitLayoutProps {
    // Scroll refs for auto-scroll functionality
    timelineScrollRef: React.RefObject<HTMLDivElement | null>;
    pianoRollScrollRef: React.RefObject<HTMLDivElement | null>;
    sampleEditorScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function SequencerSplitLayout({
    timelineScrollRef,
    pianoRollScrollRef,
    sampleEditorScrollRef,
}: SequencerSplitLayoutProps) {
    // ========================================================================
    // STATE: Read directly from Zustand store
    // ========================================================================
    const showPianoRoll = useDAWStore(state => state.showPianoRoll);
    const showSampleEditor = useDAWStore(state => state.showSampleEditor);

    // ========================================================================
    // LOCAL UI STATE: Split ratio and drag states
    // ========================================================================
    const [timelineHeightPercent, setTimelineHeightPercent] = useState(() => {
        const stored = localStorage.getItem(SPLIT_RATIO_KEY);
        return stored ? parseFloat(stored) : 60; // Default 60%
    });
    const [isDragging, setIsDragging] = useState(false);

    // Save split ratio to localStorage
    useEffect(() => {
        localStorage.setItem(SPLIT_RATIO_KEY, timelineHeightPercent.toString());
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

    // No derived state needed - components read from Zustand directly!

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden sequencer-split-container">
            {/* Timeline Section - Top (resizable) */}
            <div
                className="min-h-0 flex flex-col overflow-hidden"
                style={{ flexGrow: timelineHeightPercent, flexShrink: 1, flexBasis: 0 }}
            >
                <SequencerTimelineSection
                    timelineScrollRef={timelineScrollRef}
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
                        <SequencerPianoRoll
                            pianoRollScrollRef={pianoRollScrollRef}
                        />
                    ) : showSampleEditor ? (
                        <SequencerSampleEditor
                            sampleEditorScrollRef={sampleEditorScrollRef}
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
                </div>
            </div>
        </div>
    );
}

