/**
 * SequencerPianoRollGrid - Piano roll note grid with editing capabilities
 *
 * REFACTORED: Pure component that reads everything from Zustand
 * - Reads pianoRollClipId from Zustand
 * - Reads ALL state from Zustand (clip data, settings, transport)
 * - Calls updateClip() directly for all note editing operations
 * - Only receives local UI callbacks (onSelectNote, onToggleSelectNote)
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useDAWStore } from "@/stores/dawStore";
import { useTimelineCalculations } from '../../hooks/useTimelineCalculations.ts';
import { api } from "@/services/api";
import type { MIDIEvent } from "../../types";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

interface SequencerPianoRollGridProps {
    // Local UI callbacks (for parent component's local state)
    selectedNotes: Set<number>;
    onSelectNote: (index: number) => void;
    onToggleSelectNote: (index: number) => void;
}

export function SequencerPianoRollGrid({
    selectedNotes,
    onSelectNote,
    onToggleSelectNote,
}: SequencerPianoRollGridProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const pianoRollClipId = useDAWStore(state => state.pianoRollClipId);
    const clips = useDAWStore(state => state.clips);
    const tracks = useDAWStore(state => state.tracks);
    const snapEnabled = useDAWStore(state => state.snapEnabled);
    const gridSize = useDAWStore(state => state.gridSize);
    const transport = useDAWStore(state => state.transport);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const updateClip = useDAWStore(state => state.updateClip);

    // ========================================================================
    // SHARED TIMELINE CALCULATIONS: Use the same hook as timeline for consistency!
    // ========================================================================
    const { pixelsPerBeat, totalWidth, zoom } = useTimelineCalculations();
    const beatWidth = pixelsPerBeat * zoom;

    // ========================================================================
    // DERIVED STATE: Get clip data
    // ========================================================================
    const clip = pianoRollClipId ? clips.find(c => c.id === pianoRollClipId) : undefined;
    if (!clip || clip.type !== 'midi') {
        return <div className="flex items-center justify-center h-full text-muted-foreground">Invalid clip</div>;
    }

    const track = tracks.find(t => t.id === clip.track_id);
    const notes = clip.midi_events || [];
    const clipStartTime = clip.start_time;
    const clipDuration = clip.duration;
    const instrument = track?.instrument || 'sine';
    const clipId = clip.id;

    // Transport state
    const activeNotes = transport?.active_notes || [];

    // Piano roll settings (constants)
    const minPitch = 21; // A0 - Full piano range
    const maxPitch = 108; // C8
    const noteHeight = 20; // pixels per note row

    // ========================================================================
    // LOCAL STATE
    // ========================================================================
    const gridRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState<number | null>(null);
    const [isResizing, setIsResizing] = useState<number | null>(null);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragStartY, setDragStartY] = useState(0);
    const [dragStartTime, setDragStartTime] = useState(0);
    const [dragStartPitch, setDragStartPitch] = useState(0);
    const [dragStartDuration, setDragStartDuration] = useState(0);
    const [hasDragged, setHasDragged] = useState(false); // Track if mouse moved during mousedown

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================
    const getNoteName = (pitch: number): string => {
        const octave = Math.floor(pitch / 12) - 1;
        const noteName = NOTE_NAMES[pitch % 12];
        return `${noteName}${octave}`;
    };

    // Grid spans the full composition width (like timeline) - allows scrolling freely
    // Clip region is visually highlighted so user knows the clip boundaries
    const totalHeight = (maxPitch - minPitch + 1) * noteHeight;

    // Clip region boundaries (for visual highlight)
    const clipStartX = clipStartTime * beatWidth;
    const clipEndX = (clipStartTime + clipDuration) * beatWidth;

    const pixelsToPitch = (y: number): number => {
        const pitchIndex = Math.floor(y / noteHeight);
        return maxPitch - pitchIndex;
    };

    const pixelsToBeats = (x: number): number => {
        return x / beatWidth;
    };

    // ========================================================================
    // NOTE EDITING HANDLERS: Call Zustand actions directly
    // ========================================================================
    const handleAddNote = async (pitch: number, startTime: number) => {
        const newNote: MIDIEvent = {
            note: pitch,
            note_name: getNoteName(pitch),
            start_time: snapEnabled ? Math.round(startTime * gridSize) / gridSize : startTime,
            duration: snapEnabled ? 1 / gridSize : 0.25,
            velocity: 100,
            channel: 0,
        };
        await updateClip(clipId, { midi_events: [...notes, newNote] });

        // Preview the note
        try {
            await api.audio.previewNote({
                note: pitch,
                velocity: 100,
                duration: 0.5,
                synthdef: instrument || "sine"
            });
        } catch (error) {
            console.error("Failed to preview note:", error);
        }
    };

    const handleMoveNote = async (index: number, newStartTime: number, newPitch: number) => {
        const updatedNotes = [...notes];
        const oldPitch = updatedNotes[index].note;
        updatedNotes[index] = {
            ...updatedNotes[index],
            note: newPitch,
            note_name: getNoteName(newPitch),
            start_time: snapEnabled ? Math.round(newStartTime * gridSize) / gridSize : newStartTime,
        };
        await updateClip(clipId, { midi_events: updatedNotes });

        // Preview the note only if pitch changed
        if (newPitch !== oldPitch) {
            try {
                await api.audio.previewNote({
                    note: newPitch,
                    velocity: updatedNotes[index].velocity,
                    duration: 0.5,
                    synthdef: instrument || "sine"
                });
            } catch (error) {
                console.error("Failed to preview note:", error);
            }
        }
    };

    const handleResizeNote = async (index: number, newDuration: number) => {
        const updatedNotes = [...notes];
        updatedNotes[index] = {
            ...updatedNotes[index],
            duration: Math.max(0.0625, snapEnabled ? Math.round(newDuration * gridSize) / gridSize : newDuration),
        };
        await updateClip(clipId, { midi_events: updatedNotes });
    };

    const handleDeleteNote = async (index: number) => {
        await updateClip(clipId, { midi_events: notes.filter((_, i) => i !== index) });
    };

    const handleGridClick = (e: React.MouseEvent) => {
        // Don't add/delete notes if we just finished dragging/resizing
        // hasDragged persists after mouseup, so we can detect if this click was part of a drag
        if (isDragging !== null || isResizing !== null || hasDragged) return;

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
            handleDeleteNote(clickedNoteIndex);
        } else {
            // No note - add one
            handleAddNote(pitch, clipRelativeTime);
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

                handleMoveNote(isDragging, newStartTime, newPitch);
            } else if (isResizing !== null) {
                const deltaBeats = deltaX / beatWidth;
                const newDuration = Math.max(0.0625, dragStartDuration + deltaBeats);

                handleResizeNote(isResizing, newDuration);
            }
        };

        const handleMouseUp = () => {
            // Click-to-delete: Only delete if we clicked a note (isDragging) without moving the mouse
            // Don't delete if we were resizing (isResizing) - resizing always involves dragging
            if (!hasDragged && isDragging !== null && isResizing === null) {
                handleDeleteNote(isDragging);
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
    }, [isDragging, isResizing, dragStartX, dragStartY, dragStartTime, dragStartPitch, dragStartDuration, beatWidth, noteHeight, minPitch, maxPitch, hasDragged, handleDeleteNote, handleMoveNote, handleResizeNote]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Delete" || e.key === "Backspace") {
                selectedNotes.forEach(index => handleDeleteNote(index));
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [selectedNotes, handleDeleteNote]);

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
                    // Match by clip_id, note pitch, AND start_time to uniquely identify the note instance
                    const isPlaying = activeNotes?.some(
                        an => an.clip_id === clipId && an.note === note.note && an.start_time === note.start_time
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

