/**
 * SequencerPianoRollGrid - Piano roll note grid with editing capabilities
 *
 * ARCHITECTURE:
 * - Uses refs for drag state to prevent re-render issues during async store updates
 * - Batches note edits: update ref during drag, commit to store on mouse up
 * - Forces re-render after ref updates using forceUpdate pattern
 * - Clean separation: rendering vs. interaction logic
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
    const updateClip = useDAWStore(state => state.updateClip);

    // ========================================================================
    // SHARED TIMELINE CALCULATIONS
    // ========================================================================
    const { pixelsPerBeat, zoom } = useTimelineCalculations();
    const beatWidth = pixelsPerBeat * zoom;

    // ========================================================================
    // LOCAL STATE
    // ========================================================================
    const gridRef = useRef<HTMLDivElement>(null);
    const justFinishedDragRef = useRef(false);

    // Local editable notes - this is our source of truth during editing
    const [localNotes, setLocalNotes] = useState<MIDIEvent[]>([]);

    // Drag state
    const [dragState, setDragState] = useState<{
        noteIndex: number | null;
        mode: 'drag' | 'resize' | null;
        startX: number;
        startY: number;
        offsetX: number;  // Offset from note start where user clicked
        offsetY: number;  // Offset from note top where user clicked
        originalTime: number;
        originalPitch: number;
        originalDuration: number;
        hasMoved: boolean;  // Track if user actually dragged
    } | null>(null);

    const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
    const [copiedNotes, setCopiedNotes] = useState<MIDIEvent[]>([]);
    const [mouseX, setMouseX] = useState<number | null>(null);

    // ========================================================================
    // DERIVED STATE: Get clip data
    // ========================================================================
    const clip = pianoRollClipId ? clips.find(c => c.id === pianoRollClipId) : undefined;
    if (!clip || clip.type !== 'midi') {
        return <div className="flex items-center justify-center h-full text-muted-foreground">Invalid clip</div>;
    }

    const track = tracks.find(t => t.id === clip.track_id);
    const clipStartTime = clip.start_time;
    const clipDuration = clip.duration;
    const instrument = track?.instrument || 'sine';
    const clipId = clip.id;
    const activeNotes = transport?.active_notes || [];

    // Sync local notes with clip data when not dragging
    useEffect(() => {
        if (!dragState) {
            setLocalNotes(clip.midi_events || []);
        }
    }, [clip.midi_events, dragState]);

    // Use local notes as source of truth
    const notes = localNotes;

    // Piano roll settings
    const minPitch = 21; // A0
    const maxPitch = 108; // C8
    const noteHeight = 20;

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================
    const getNoteName = (pitch: number): string => {
        const octave = Math.floor(pitch / 12) - 1;
        const noteName = NOTE_NAMES[pitch % 12];
        return `${noteName}${octave}`;
    };

    const gridSubdivision = 1 / gridSize;

    // Snap beats to grid - CRITICAL: Use Math.floor to snap to START of grid cell
    const snapBeatsToGrid = (beats: number): number => {
        if (!snapEnabled) return beats;
        return Math.floor(beats / gridSubdivision) * gridSubdivision;
    };

    // Coordinate conversions
    const pixelsToBeats = (pixels: number): number => pixels / beatWidth;
    const beatsToPixels = (beats: number): number => beats * beatWidth;
    const pixelsToPitch = (pixels: number): number => {
        const pitchIndex = Math.floor(pixels / noteHeight);
        return maxPitch - pitchIndex;
    };
    const pitchToPixels = (pitch: number): number => (maxPitch - pitch) * noteHeight;

    // Clip boundaries
    const clipStartX = beatsToPixels(clipStartTime);
    const clipEndX = beatsToPixels(clipStartTime + clipDuration);

    // Find note at exact grid position
    const findNoteAtPosition = (pitch: number, time: number): number => {
        const snappedClickTime = snapBeatsToGrid(time);
        return notes.findIndex(note => {
            const snappedNoteStartTime = snapBeatsToGrid(note.start_time);
            return note.note === pitch && snappedClickTime === snappedNoteStartTime;
        });
    };



    // ========================================================================
    // EVENT HANDLERS: Note editing
    // ========================================================================

    // Start dragging a note
    const handleNoteMouseDown = (e: React.MouseEvent, index: number, mode: 'drag' | 'resize') => {
        e.stopPropagation();

        const rect = gridRef.current?.getBoundingClientRect();
        if (!rect) return;

        const note = notes[index];

        // Calculate where user clicked within the note
        const noteStartX = beatsToPixels(clipStartTime + note.start_time);
        const noteTopY = pitchToPixels(note.note);
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        setDragState({
            noteIndex: index,
            mode,
            startX: e.clientX,
            startY: e.clientY,
            offsetX: clickX - noteStartX,  // How far into the note did user click
            offsetY: clickY - noteTopY,    // How far from top of note did user click
            originalTime: note.start_time,
            originalPitch: note.note,
            originalDuration: note.duration,
            hasMoved: false
        });
    };

    // Handle grid click - add or delete note
    const handleGridClick = async (e: React.MouseEvent) => {
        // Don't handle if we just finished dragging
        if (justFinishedDragRef.current) return;

        const rect = gridRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Only allow adding notes within clip region
        if (x < clipStartX || x >= clipEndX) return;

        const pitch = pixelsToPitch(y);
        const absoluteTime = pixelsToBeats(x);
        const clipRelativeTime = absoluteTime - clipStartTime;

        // Check if there's a note at this position
        const existingNoteIndex = findNoteAtPosition(pitch, clipRelativeTime);

        if (existingNoteIndex !== -1) {
            // Delete existing note
            const updatedNotes = notes.filter((_, i) => i !== existingNoteIndex);
            updateClip(clipId, { midi_events: updatedNotes });
        } else {
            // Add new note
            const snappedTime = snapBeatsToGrid(clipRelativeTime);
            const newNote: MIDIEvent = {
                note: pitch,
                note_name: getNoteName(pitch),
                velocity: 100,
                start_time: snappedTime,
                duration: gridSubdivision, // Default to one grid cell
                channel: 0, // Default MIDI channel
            };
            updateClip(clipId, { midi_events: [...notes, newNote] });

            // Preview the note sound
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
        }
    };

    // Delete selected notes
    const handleDeleteSelected = async () => {
        if (selectedNotes.size === 0) return;
        await updateClip(clipId, { midi_events: notes.filter((_, i) => !selectedNotes.has(i)) });
        setSelectedNotes(new Set());
    };

    // Copy/paste
    const handleCopyNotes = () => {
        if (selectedNotes.size === 0) return;
        const notesToCopy = Array.from(selectedNotes).map(i => notes[i]);
        setCopiedNotes(notesToCopy);
    };

    const handlePasteNotes = async () => {
        if (copiedNotes.length === 0) return;
        const minStartTime = Math.min(...copiedNotes.map(n => n.start_time));
        const pasteOffset = 0 - minStartTime;
        const pastedNotes = copiedNotes.map(note => ({
            ...note,
            start_time: note.start_time + pasteOffset,
        }));
        await updateClip(clipId, { midi_events: [...notes, ...pastedNotes] });
    };

    // Mouse tracking for cursor feedback
    const handleGridMouseMove = (e: React.MouseEvent) => {
        const rect = gridRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        setMouseX(x);
    };

    const handleGridMouseLeave = () => {
        setMouseX(null);
    };

    // ========================================================================
    // GLOBAL MOUSE HANDLERS: Handle drag/resize
    // ========================================================================
    useEffect(() => {
        if (!dragState) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = gridRef.current?.getBoundingClientRect();
            if (!rect) return;

            const deltaX = e.clientX - dragState.startX;
            const deltaY = e.clientY - dragState.startY;

            // Mark as moved if we've moved more than 3 pixels
            if (!dragState.hasMoved && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
                setDragState(prev => prev ? { ...prev, hasMoved: true } : null);
            }

            setLocalNotes(currentNotes => {
                const updatedNotes = [...currentNotes];
                const noteIndex = dragState.noteIndex!;

                if (dragState.mode === 'drag') {
                    // Calculate where the cursor is now
                    const currentX = e.clientX - rect.left;
                    const currentY = e.clientY - rect.top;

                    // Calculate where the note should be (cursor position - offset)
                    const noteX = currentX - dragState.offsetX;
                    const noteY = currentY - dragState.offsetY;

                    // Convert to time and pitch
                    const absoluteTime = pixelsToBeats(noteX);
                    const clipRelativeTime = absoluteTime - clipStartTime;
                    const pitch = pixelsToPitch(noteY);

                    // Snap to grid
                    let newTime = snapBeatsToGrid(clipRelativeTime);
                    let newPitch = Math.max(minPitch, Math.min(maxPitch, pitch));

                    // Clamp time to clip boundaries
                    newTime = Math.max(0, Math.min(clipDuration - updatedNotes[noteIndex].duration, newTime));

                    // Preview note if pitch changed
                    if (newPitch !== dragState.originalPitch) {
                        try {
                            api.audio.previewNote({
                                note: newPitch,
                                velocity: updatedNotes[noteIndex].velocity,
                                duration: 0.5,
                                synthdef: instrument || "sine"
                            });
                        } catch (error) {
                            // Ignore preview errors
                        }
                        // Update original pitch so we don't spam preview
                        setDragState(prev => prev ? { ...prev, originalPitch: newPitch } : null);
                    }

                    // Update note
                    updatedNotes[noteIndex] = {
                        ...updatedNotes[noteIndex],
                        start_time: newTime,
                        note: newPitch,
                        note_name: getNoteName(newPitch)
                    };
                } else if (dragState.mode === 'resize') {
                    // Calculate new duration from original + delta
                    const deltaBeats = pixelsToBeats(deltaX);
                    let newDuration = dragState.originalDuration + deltaBeats;

                    // Snap to grid
                    newDuration = snapBeatsToGrid(newDuration);

                    // Ensure minimum duration
                    const minDuration = snapEnabled ? gridSubdivision : 0.0625;
                    newDuration = Math.max(minDuration, newDuration);

                    // Clamp to clip boundary
                    const maxDuration = clipDuration - updatedNotes[noteIndex].start_time;
                    newDuration = Math.min(newDuration, maxDuration);

                    // Update note
                    updatedNotes[noteIndex] = {
                        ...updatedNotes[noteIndex],
                        duration: newDuration
                    };
                }

                return updatedNotes;
            });
        };

        const handleMouseUp = async (e: MouseEvent) => {
            // Capture current state before clearing
            const wasDragging = dragState.hasMoved;
            const noteIndex = dragState.noteIndex;
            const currentNotes = [...localNotes];

            // Clear drag state FIRST (synchronously)
            setDragState(null);

            if (wasDragging) {
                // CRITICAL: Set flag FIRST, before async operation
                // This prevents grid click from firing while we're committing
                justFinishedDragRef.current = true;
                setTimeout(() => {
                    justFinishedDragRef.current = false;
                }, 100);

                // We dragged - commit changes
                await updateClip(clipId, { midi_events: currentNotes });
            } else {
                // We clicked without moving - delete the note
                const updatedNotes = currentNotes.filter((_, i) => i !== noteIndex);
                await updateClip(clipId, { midi_events: updatedNotes });
            }
        };

        // Use capture phase to ensure we get the event even if something else stops it
        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('mouseup', handleMouseUp, true);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove, true);
            document.removeEventListener('mouseup', handleMouseUp, true);
        };
    }, [dragState, clipId, updateClip, beatWidth, noteHeight, minPitch, maxPitch, clipDuration, snapEnabled, gridSubdivision, instrument, clipStartTime]);

    // ========================================================================
    // KEYBOARD SHORTCUTS
    // ========================================================================
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Delete
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                handleDeleteSelected();
            }
            // Copy
            if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
                e.preventDefault();
                handleCopyNotes();
            }
            // Paste
            if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
                e.preventDefault();
                handlePasteNotes();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNotes, copiedNotes, notes, clipId]);

    // ========================================================================
    // RENDERING
    // ========================================================================
    const totalHeight = (maxPitch - minPitch + 1) * noteHeight;
    const totalWidth = beatsToPixels(32); // Show 32 beats worth of grid
    const gridLineSpacing = beatWidth / gridSize;

    // Cursor feedback
    const isMouseInClipRegion = mouseX !== null && mouseX >= clipStartX && mouseX < clipEndX;
    const gridCursor = isMouseInClipRegion ? 'cursor-crosshair' : 'cursor-not-allowed';

    return (
        <div className="flex-1 overflow-auto">
            <div
                ref={gridRef}
                className={cn("relative", gridCursor)}
                style={{
                    width: `${totalWidth}px`,
                    height: `${totalHeight}px`,
                    backgroundImage: `
                        linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: `${gridLineSpacing}px ${noteHeight}px`,
                    backgroundColor: '#0a0a0a'
                }}
                onClick={handleGridClick}
                onMouseMove={handleGridMouseMove}
                onMouseLeave={handleGridMouseLeave}
            >
                {/* Clip Region Highlight */}
                <div
                    className="absolute top-0 bottom-0 bg-cyan-500/10 border-l-2 border-r-2 border-cyan-500/50 pointer-events-none"
                    style={{
                        left: `${clipStartX}px`,
                        width: `${clipEndX - clipStartX}px`,
                    }}
                >
                    {/* Empty state hint */}
                    {notes.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center text-muted-foreground/60 text-sm px-4">
                                <div className="font-semibold mb-1">Click to add notes</div>
                                <div className="text-xs">Notes can only be added within the clip region (highlighted area)</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Beat Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                    {Array.from({ length: Math.ceil(totalWidth / beatWidth) + 1 }).map((_, i) => (
                        <line
                            key={`beat-${i}`}
                            x1={i * beatWidth}
                            y1={0}
                            x2={i * beatWidth}
                            y2={totalHeight}
                            stroke="rgba(255, 255, 255, 0.2)"
                            strokeWidth={i % 4 === 0 ? 1.5 : 1}
                            opacity={i % 4 === 0 ? 0.4 : 0.2}
                        />
                    ))}
                </svg>

                {/* MIDI Notes */}
                {notes.map((note, index) => {
                    const y = pitchToPixels(note.note);
                    const x = beatsToPixels(clipStartTime + note.start_time);
                    const width = beatsToPixels(note.duration);
                    const isSelected = selectedNotes.has(index);

                    // Check if playing
                    const isPlaying = activeNotes?.some(
                        an => an.clip_id === clipId && an.note === note.note && an.start_time === note.start_time
                    ) ?? false;

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
                            onMouseDown={(e) => handleNoteMouseDown(e, index, 'drag')}
                            title={`${getNoteName(note.note)} - Velocity: ${note.velocity}`}
                        >
                            {/* Velocity bar */}
                            <div
                                className="absolute bottom-0 left-0 right-0 bg-cyan-300/40"
                                style={{ height: `${(note.velocity / 127) * 100}%` }}
                            />

                            {/* Resize handle */}
                            <div
                                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-10"
                                onMouseDown={(e) => handleNoteMouseDown(e, index, 'resize')}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

