/**
 * SequencerPanelPianoRollGrid - Piano roll note grid with editing capabilities
 * 
 * Displays MIDI notes on a grid, handles note creation, movement, resizing, and deletion.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils.ts";
import type { MIDIEvent } from "../types.ts";

interface SequencerPanelPianoRollGridProps {
    notes: MIDIEvent[];
    selectedNotes: Set<number>;
    minPitch: number;
    maxPitch: number;
    clipStartTime: number; // beats - where clip starts in composition
    clipDuration: number; // beats - clip length
    totalBeats: number; // beats - total composition length
    beatWidth: number; // pixels per beat
    noteHeight: number; // pixels per note row
    snapEnabled: boolean;
    gridSize: number;
    onAddNote: (pitch: number, startTime: number) => void;
    onMoveNote: (index: number, newStartTime: number, newPitch: number) => void;
    onResizeNote: (index: number, newDuration: number) => void;
    onUpdateVelocity: (index: number, newVelocity: number) => void;
    onDeleteNote: (index: number) => void;
    onSelectNote: (index: number) => void;
    onToggleSelectNote: (index: number) => void;
}

export function SequencerPanelPianoRollGrid({
    notes,
    selectedNotes,
    minPitch,
    maxPitch,
    clipStartTime,
    clipDuration,
    totalBeats,
    beatWidth,
    noteHeight,
    snapEnabled,
    gridSize,
    onAddNote,
    onMoveNote,
    onResizeNote,
    onUpdateVelocity,
    onDeleteNote,
    onSelectNote,
    onToggleSelectNote,
}: SequencerPanelPianoRollGridProps) {
    const gridRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState<number | null>(null);
    const [isResizing, setIsResizing] = useState<number | null>(null);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragStartY, setDragStartY] = useState(0);
    const [dragStartTime, setDragStartTime] = useState(0);
    const [dragStartPitch, setDragStartPitch] = useState(0);
    const [dragStartDuration, setDragStartDuration] = useState(0);

    // Grid spans the full composition width (like timeline) - allows scrolling freely
    // Clip region is visually highlighted so user knows the clip boundaries
    const totalWidth = totalBeats * beatWidth;
    const totalHeight = (maxPitch - minPitch + 1) * noteHeight;

    // Clip region boundaries (for visual highlight)
    const clipStartX = clipStartTime * beatWidth;
    const clipEndX = (clipStartTime + clipDuration) * beatWidth;

    const isBlackKey = (pitch: number): boolean => {
        const note = pitch % 12;
        return [1, 3, 6, 8, 10].includes(note);
    };

    const pixelsToPitch = (y: number): number => {
        const pitchIndex = Math.floor(y / noteHeight);
        return maxPitch - pitchIndex;
    };

    const pixelsToBeats = (x: number): number => {
        return x / beatWidth;
    };

    const handleGridClick = (e: React.MouseEvent) => {
        if (isDragging !== null || isResizing !== null) return;

        const rect = gridRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Only allow adding notes within the clip region
        if (x < clipStartX || x >= clipEndX) return;

        const pitch = pixelsToPitch(y);
        const absoluteTime = pixelsToBeats(x);
        // Convert to clip-relative time
        const clipRelativeTime = absoluteTime - clipStartTime;

        onAddNote(pitch, clipRelativeTime);
    };

    const handleNoteMouseDown = (e: React.MouseEvent, index: number, action: "move" | "resize") => {
        e.stopPropagation();

        const note = notes[index];
        setDragStartX(e.clientX);
        setDragStartY(e.clientY);
        setDragStartTime(note.start_time);
        setDragStartPitch(note.note);
        setDragStartDuration(note.duration);

        if (action === "move") {
            setIsDragging(index);
            if (!e.shiftKey) {
                onSelectNote(index);
            } else {
                onToggleSelectNote(index);
            }
        } else {
            setIsResizing(index);
        }
    };

    // Global mouse event handlers for drag/resize
    useEffect(() => {
        if (isDragging === null && isResizing === null) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = gridRef.current?.getBoundingClientRect();
            if (!rect) return;

            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;

            if (isDragging !== null) {
                const deltaBeats = deltaX / beatWidth;
                const deltaPitch = -Math.round(deltaY / noteHeight);

                const newStartTime = Math.max(0, dragStartTime + deltaBeats);
                const newPitch = Math.max(minPitch, Math.min(maxPitch, dragStartPitch + deltaPitch));

                onMoveNote(isDragging, newStartTime, newPitch);
            } else if (isResizing !== null) {
                const deltaBeats = deltaX / beatWidth;
                const newDuration = Math.max(0.0625, dragStartDuration + deltaBeats);

                onResizeNote(isResizing, newDuration);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(null);
            setIsResizing(null);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, isResizing, dragStartX, dragStartY, dragStartTime, dragStartPitch, dragStartDuration, beatWidth, noteHeight, minPitch, maxPitch]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Delete" || e.key === "Backspace") {
                selectedNotes.forEach(index => onDeleteNote(index));
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [selectedNotes, onDeleteNote]);

    return (
        <div className="flex-1 overflow-auto">
            <div
                ref={gridRef}
                className="relative cursor-crosshair"
                style={{
                    width: `${totalWidth}px`,
                    height: `${totalHeight}px`,
                    // Use background-size for precise grid alignment (avoids gradient rounding issues)
                    backgroundImage: `
                        linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: `${beatWidth}px ${noteHeight}px`,
                    backgroundColor: '#0a0a0a'
                }}
                onClick={handleGridClick}
            >

                {/* Clip Region Highlight */}
                <div
                    className="absolute top-0 bottom-0 bg-cyan-500/5 border-l-2 border-r-2 border-cyan-500/30 pointer-events-none"
                    style={{
                        left: `${clipStartX}px`,
                        width: `${clipEndX - clipStartX}px`,
                    }}
                />

                {/* MIDI Notes - Positioned at absolute time */}
                {notes.map((note, index) => {
                    const y = (maxPitch - note.note) * noteHeight;
                    // Note times are clip-relative, convert to absolute
                    const x = (clipStartTime + note.start_time) * beatWidth;
                    const width = note.duration * beatWidth;
                    const isSelected = selectedNotes.has(index);

                    // Velocity determines color intensity (0-127 -> 0.3-1.0 opacity)
                    const velocityOpacity = 0.3 + (note.velocity / 127) * 0.7;

                    return (
                        <div
                            key={index}
                            className={cn(
                                "absolute rounded cursor-move transition-colors group",
                                isSelected
                                    ? "border-2 border-cyan-300 z-10"
                                    : "border border-cyan-500 hover:border-cyan-300"
                            )}
                            style={{
                                left: `${x}px`,
                                top: `${y}px`,
                                width: `${width}px`,
                                height: `${noteHeight}px`,
                                backgroundColor: isSelected
                                    ? `rgba(6, 182, 212, ${velocityOpacity})`
                                    : `rgba(8, 145, 178, ${velocityOpacity})`,
                            }}
                            onMouseDown={(e) => handleNoteMouseDown(e, index, "move")}
                            title={`Velocity: ${note.velocity}`}
                        >
                            {/* Velocity bar (bottom of note) */}
                            <div
                                className="absolute bottom-0 left-0 right-0 bg-cyan-300/40"
                                style={{ height: `${(note.velocity / 127) * 100}%` }}
                            />

                            {/* Resize handle (right edge) */}
                            <div
                                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-10"
                                onMouseDown={(e) => handleNoteMouseDown(e, index, "resize")}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

