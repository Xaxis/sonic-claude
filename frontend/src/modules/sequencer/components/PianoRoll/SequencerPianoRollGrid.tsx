/**
 * SequencerPianoRollGrid - Piano roll note grid with editing capabilities
 * 
 * Displays MIDI notes on a grid, handles note creation, movement, resizing, and deletion.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils.ts";
import type { MIDIEvent } from "../types.ts";
import type { ActiveNote } from "@/hooks/useTransportWebsocket.ts";

interface SequencerPianoRollGridProps {
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
    clipId: string; // Clip ID for matching active notes
    activeNotes?: ActiveNote[]; // Currently playing notes for visual feedback
    onAddNote: (pitch: number, startTime: number) => void;
    onMoveNote: (index: number, newStartTime: number, newPitch: number) => void;
    onResizeNote: (index: number, newDuration: number) => void;
    onUpdateVelocity: (index: number, newVelocity: number) => void;
    onDeleteNote: (index: number) => void;
    onSelectNote: (index: number) => void;
    onToggleSelectNote: (index: number) => void;
}

export function SequencerPianoRollGrid({
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
    clipId,
    activeNotes,
    onAddNote,
    onMoveNote,
    onResizeNote,
    onUpdateVelocity,
    onDeleteNote,
    onSelectNote,
    onToggleSelectNote,
}: SequencerPianoRollGridProps) {
    const gridRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState<number | null>(null);
    const [isResizing, setIsResizing] = useState<number | null>(null);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragStartY, setDragStartY] = useState(0);
    const [dragStartTime, setDragStartTime] = useState(0);
    const [dragStartPitch, setDragStartPitch] = useState(0);
    const [dragStartDuration, setDragStartDuration] = useState(0);
    const [hasDragged, setHasDragged] = useState(false); // Track if mouse moved during mousedown

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
        // Don't add notes if we just finished dragging/resizing
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

        // Check if there's already a note at this position
        const clickedNoteIndex = findNoteAtPosition(pitch, clipRelativeTime);

        if (clickedNoteIndex !== -1) {
            // Note exists - delete it (toggle behavior like FL Studio/Ableton)
            onDeleteNote(clickedNoteIndex);
        } else {
            // No note - add one
            onAddNote(pitch, clipRelativeTime);
        }
    };

    // Helper function to find if a note exists at a given position
    const findNoteAtPosition = (pitch: number, time: number): number => {
        // Calculate tolerance based on grid size for click detection
        const timeTolerance = snapEnabled ? (1 / gridSize) * 0.5 : 0.1;

        return notes.findIndex(note => {
            const noteAbsoluteTime = note.start_time;
            const noteEndTime = noteAbsoluteTime + note.duration;

            return (
                note.note === pitch &&
                time >= noteAbsoluteTime - timeTolerance &&
                time <= noteEndTime + timeTolerance
            );
        });
    };

    const handleNoteMouseDown = (e: React.MouseEvent, index: number, action: "move" | "resize") => {
        e.stopPropagation();

        const note = notes[index];
        setDragStartX(e.clientX);
        setDragStartY(e.clientY);
        setDragStartTime(note.start_time);
        setDragStartPitch(note.note);
        setDragStartDuration(note.duration);
        setHasDragged(false); // Reset drag flag

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

            // Detect if mouse has moved significantly (more than 3 pixels)
            const dragThreshold = 3;
            if (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold) {
                setHasDragged(true);
            }

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
            // Click-to-delete: Only delete if we clicked a note (isDragging) without moving the mouse
            // Don't delete if we were resizing (isResizing) - resizing always involves dragging
            if (!hasDragged && isDragging !== null && isResizing === null) {
                onDeleteNote(isDragging);
            }

            setIsDragging(null);
            setIsResizing(null);
            setHasDragged(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, isResizing, dragStartX, dragStartY, dragStartTime, dragStartPitch, dragStartDuration, beatWidth, noteHeight, minPitch, maxPitch, hasDragged, onDeleteNote, onMoveNote, onResizeNote]);

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

                    // Check if this note is currently playing
                    const isPlaying = activeNotes?.some(
                        an => an.clip_id === clipId && an.note === note.note
                    ) ?? false;

                    // Velocity determines color intensity (0-127 -> 0.3-1.0 opacity)
                    const velocityOpacity = 0.3 + (note.velocity / 127) * 0.7;

                    return (
                        <div
                            key={index}
                            className={cn(
                                "absolute rounded cursor-move transition-colors group",
                                isSelected
                                    ? "border-2 border-cyan-300 z-10"
                                    : "border border-cyan-500 hover:border-cyan-300",
                                isPlaying && "animate-pulse ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/50"
                            )}
                            style={{
                                left: `${x}px`,
                                top: `${y}px`,
                                width: `${width}px`,
                                height: `${noteHeight}px`,
                                backgroundColor: isSelected
                                    ? `rgba(6, 182, 212, ${velocityOpacity})`
                                    : `rgba(8, 145, 178, ${velocityOpacity})`,
                                boxShadow: isPlaying ? '0 0 20px rgba(6, 182, 212, 0.8)' : undefined,
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

