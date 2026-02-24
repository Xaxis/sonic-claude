/**
 * SequencerPianoRollGrid - Piano roll note grid with editing capabilities
 *
 * REFACTORED: Self-contained component following Zustand best practices
 * - Reads ALL state from Zustand (pianoRollClipId, clips, tracks, settings, transport)
 * - Calls updateClip() directly for all note editing operations
 * - Manages local UI state (selectedNotes, copiedNotes, drag state)
 * - Handles keyboard shortcuts (Ctrl+C, Ctrl+V, Delete)
 * - No props needed - completely self-contained!
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useDAWStore } from "@/stores/dawStore";
import { useTimelineCalculations } from '../../hooks/useTimelineCalculations.ts';
import { api } from "@/services/api";
import type { MIDIEvent } from "../../types";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

interface SequencerPianoRollGridProps {
    // No props needed - reads everything from Zustand!
}

export function SequencerPianoRollGrid({}: SequencerPianoRollGridProps) {
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
    // LOCAL STATE (UI state - not persisted)
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
    const justFinishedDragRef = useRef(false); // Ref to prevent click handler after drag/resize

    // Note selection state (local UI state)
    const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
    const [copiedNotes, setCopiedNotes] = useState<MIDIEvent[]>([]);

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

    const handleDeleteSelected = async () => {
        if (selectedNotes.size === 0) return;
        await updateClip(clipId, { midi_events: notes.filter((_, i) => !selectedNotes.has(i)) });
        setSelectedNotes(new Set());
    };

    const handleCopyNotes = () => {
        if (selectedNotes.size === 0) return;
        const notesToCopy = Array.from(selectedNotes).map(i => notes[i]);
        setCopiedNotes(notesToCopy);
    };

    const handlePasteNotes = async () => {
        if (copiedNotes.length === 0) return;

        // Find the earliest start time in copied notes
        const minStartTime = Math.min(...copiedNotes.map(n => n.start_time));

        // Paste notes at the current playhead position (or start of clip)
        const pasteOffset = 0 - minStartTime; // Paste at beginning for now

        const pastedNotes = copiedNotes.map(note => ({
            ...note,
            start_time: note.start_time + pasteOffset,
        }));

        await updateClip(clipId, { midi_events: [...notes, ...pastedNotes] });
    };

    const handleGridClick = (e: React.MouseEvent) => {
        // Don't add/delete notes if we just finished dragging/resizing
        // Use ref to prevent click handler from firing after drag/resize completes
        if (isDragging !== null || isResizing !== null || justFinishedDragRef.current) return;

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

    const handleNoteClick = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();

        // Only delete if we didn't just finish dragging
        if (!justFinishedDragRef.current) {
            handleDeleteNote(index);
        }
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
            // Handle selection
            if (!e.shiftKey) {
                // Single select
                setSelectedNotes(new Set([index]));
            } else {
                // Toggle select (Shift+click)
                const newSelected = new Set(selectedNotes);
                if (newSelected.has(index)) {
                    newSelected.delete(index);
                } else {
                    newSelected.add(index);
                }
                setSelectedNotes(newSelected);
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
            // If we actually dragged/resized, set the ref to prevent click handler
            if (hasDragged) {
                justFinishedDragRef.current = true;
                // Clear the flag after a short delay (after click event would have fired)
                setTimeout(() => {
                    justFinishedDragRef.current = false;
                }, 50);
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

    // Keyboard shortcuts: Copy/Paste/Delete
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedNotes.size > 0) {
                e.preventDefault();
                handleCopyNotes();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedNotes.length > 0) {
                e.preventDefault();
                handlePasteNotes();
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNotes.size > 0) {
                e.preventDefault();
                handleDeleteSelected();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [selectedNotes, copiedNotes, notes, handleDeleteSelected, handleCopyNotes, handlePasteNotes]);

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
                            onClick={(e) => handleNoteClick(e, index)}
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

