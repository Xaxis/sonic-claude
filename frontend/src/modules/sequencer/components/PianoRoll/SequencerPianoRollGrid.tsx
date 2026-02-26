/**
 * SequencerPianoRollGrid - Piano roll with immediate, responsive note editing
 * 
 * ARCHITECTURE:
 * - Local state is ALWAYS the source of truth for rendering
 * - All interactions update local state immediately (no backend calls during interaction)
 * - Backend sync happens ONCE when interaction completes
 * - Clear separation between interaction modes
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useDAWStore } from "@/stores/dawStore";
import { useTimelineCalculations } from '../../hooks/useTimelineCalculations';
import { api } from "@/services/api";
import type { MIDIEvent } from "../../types";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Interaction modes
type InteractionMode =
    | { type: 'IDLE' }
    | { type: 'DRAGGING_NOTE'; noteIndex: number; startX: number; startY: number; offsetX: number; offsetY: number; hasMoved: boolean }
    | { type: 'RESIZING_NOTE'; noteIndex: number; startX: number; originalDuration: number; hasMoved: boolean }
    | { type: 'PAINTING_NOTES'; paintedCells: Set<string> };

interface SequencerPianoRollGridProps {}

export function SequencerPianoRollGrid({}: SequencerPianoRollGridProps) {
    // ========================================================================
    // ZUSTAND STATE
    // ========================================================================
    const pianoRollClipId = useDAWStore(state => state.pianoRollClipId);
    const clips = useDAWStore(state => state.clips);
    const tracks = useDAWStore(state => state.tracks);
    const snapEnabled = useDAWStore(state => state.snapEnabled);
    const gridSize = useDAWStore(state => state.gridSize);
    const transport = useDAWStore(state => state.transport);
    const updateClip = useDAWStore(state => state.updateClip);

    const { pixelsPerBeat, zoom } = useTimelineCalculations();
    const beatWidth = pixelsPerBeat * zoom;

    // ========================================================================
    // LOCAL STATE - Source of truth for rendering
    // ========================================================================
    const [localNotes, setLocalNotes] = useState<MIDIEvent[]>([]);
    const [mode, setMode] = useState<InteractionMode>({ type: 'IDLE' });
    const [dragPreview, setDragPreview] = useState<{ noteIndex: number; time: number; pitch: number } | null>(null);
    const [resizePreview, setResizePreview] = useState<{ noteIndex: number; duration: number } | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    // ========================================================================
    // CLIP DATA
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

    // Piano roll settings
    const minPitch = 21; // A0
    const maxPitch = 108; // C8
    const noteHeight = 20;
    const gridSubdivision = 1 / gridSize;

    // ========================================================================
    // SYNC: Update local notes from clip when not interacting
    // ========================================================================
    const isCommittingRef = useRef(false);

    useEffect(() => {
        if (mode.type === 'IDLE' && !isCommittingRef.current) {
            setLocalNotes(clip.midi_events || []);
        }
    }, [clip.midi_events, mode.type]);

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================
    const getNoteName = (pitch: number): string => {
        const octave = Math.floor(pitch / 12) - 1;
        const noteName = NOTE_NAMES[pitch % 12];
        return `${noteName}${octave}`;
    };

    const snapBeatsToGrid = (beats: number): number => {
        if (!snapEnabled) return beats;
        return Math.floor(beats / gridSubdivision) * gridSubdivision;
    };

    const pixelsToBeats = (pixels: number): number => pixels / beatWidth;
    const beatsToPixels = (beats: number): number => beats * beatWidth;
    
    const pixelsToPitch = (pixels: number): number => {
        const pitchIndex = Math.floor(pixels / noteHeight);
        return maxPitch - pitchIndex;
    };
    
    const pitchToPixels = (pitch: number): number => (maxPitch - pitch) * noteHeight;

    const clipStartX = beatsToPixels(clipStartTime);
    const clipEndX = beatsToPixels(clipStartTime + clipDuration);

    // Create cell key for painting mode
    const getCellKey = (pitch: number, time: number): string => {
        const snappedTime = snapBeatsToGrid(time);
        return `${pitch}-${snappedTime}`;
    };

    // Check if note exists at position
    const noteExistsAt = (pitch: number, time: number): boolean => {
        const snappedTime = snapBeatsToGrid(time);
        return localNotes.some(note => 
            note.note === pitch && snapBeatsToGrid(note.start_time) === snappedTime
        );
    };

    // Preview note sound
    const previewNote = async (pitch: number, velocity: number = 100) => {
        try {
            await api.audio.previewNote({
                note: pitch,
                velocity,
                duration: 0.5,
                synthdef: instrument
            });
        } catch (error) {
            // Ignore preview errors
        }
    };

    // ========================================================================
    // COMMIT: Save to backend
    // ========================================================================
    const commitToBackend = useCallback(async () => {
        await updateClip(clipId, { midi_events: localNotes });
    }, [clipId, localNotes, updateClip]);

    // ========================================================================
    // INTERACTION HANDLERS
    // ========================================================================

    // Add note at position
    const addNote = useCallback((pitch: number, time: number) => {
        const snappedTime = snapBeatsToGrid(time);

        // Don't add if note already exists
        if (noteExistsAt(pitch, time)) return;

        const newNote: MIDIEvent = {
            note: pitch,
            note_name: getNoteName(pitch),
            velocity: 100,
            start_time: snappedTime,
            duration: gridSubdivision,
            channel: 0
        };

        setLocalNotes(prev => [...prev, newNote]);
        previewNote(pitch);
    }, [gridSubdivision, snapEnabled]);

    // Handle grid click - add note or start painting
    const handleGridMouseDown = useCallback((e: React.MouseEvent) => {
        const rect = gridRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Only allow interaction within clip region
        if (x < clipStartX || x >= clipEndX) return;

        const pitch = pixelsToPitch(y);
        const absoluteTime = pixelsToBeats(x);
        const clipRelativeTime = absoluteTime - clipStartTime;

        // Clamp to clip boundaries
        if (clipRelativeTime < 0 || clipRelativeTime >= clipDuration) return;

        // Add first note and start painting mode
        addNote(pitch, clipRelativeTime);

        const cellKey = getCellKey(pitch, clipRelativeTime);
        setMode({ type: 'PAINTING_NOTES', paintedCells: new Set([cellKey]) });
    }, [clipStartX, clipEndX, clipStartTime, clipDuration, addNote]);

    // Handle note mouse down - start drag or resize
    const handleNoteMouseDown = useCallback((e: React.MouseEvent, index: number, isResize: boolean) => {
        e.stopPropagation();

        const rect = gridRef.current?.getBoundingClientRect();
        if (!rect) return;

        const note = localNotes[index];

        if (isResize) {
            // Start resize mode
            setMode({
                type: 'RESIZING_NOTE',
                noteIndex: index,
                startX: e.clientX,
                originalDuration: note.duration,
                hasMoved: false
            });
        } else {
            // Start drag mode - calculate offset from note position
            const noteX = beatsToPixels(clipStartTime + note.start_time);
            const noteY = pitchToPixels(note.note);
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            setMode({
                type: 'DRAGGING_NOTE',
                noteIndex: index,
                startX: e.clientX,
                startY: e.clientY,
                offsetX: clickX - noteX,
                offsetY: clickY - noteY,
                hasMoved: false
            });
        }
    }, [localNotes, clipStartTime]);

    // Note: Click handler removed - we handle delete in mouse up if didn't move

    // ========================================================================
    // GLOBAL MOUSE HANDLERS - Attached when interacting
    // ========================================================================
    useEffect(() => {
        if (mode.type === 'IDLE') return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = gridRef.current?.getBoundingClientRect();
            if (!rect) return;

            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;

            if (mode.type === 'DRAGGING_NOTE') {
                const deltaX = e.clientX - mode.startX;
                const deltaY = e.clientY - mode.startY;

                // Mark as moved if we've moved more than 3 pixels
                if (!mode.hasMoved && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
                    setMode(prev => prev.type === 'DRAGGING_NOTE' ? { ...prev, hasMoved: true } : prev);
                }

                // Calculate note position (cursor - offset)
                const noteX = currentX - mode.offsetX;
                const noteY = currentY - mode.offsetY;

                // Convert to time and pitch
                const absoluteTime = pixelsToBeats(noteX);
                const clipRelativeTime = absoluteTime - clipStartTime;
                const pitch = pixelsToPitch(noteY);

                // Snap and clamp
                let newTime = snapBeatsToGrid(clipRelativeTime);
                let newPitch = Math.max(minPitch, Math.min(maxPitch, pitch));

                const note = localNotes[mode.noteIndex];
                newTime = Math.max(0, Math.min(clipDuration - note.duration, newTime));

                // Update preview immediately (shows where it will snap)
                setDragPreview({ noteIndex: mode.noteIndex, time: newTime, pitch: newPitch });

                // Only update actual note if position changed
                if (note.start_time !== newTime || note.note !== newPitch) {
                    setLocalNotes(prev => {
                        const updated = [...prev];
                        const oldPitch = updated[mode.noteIndex].note;

                        updated[mode.noteIndex] = {
                            ...updated[mode.noteIndex],
                            start_time: newTime,
                            note: newPitch,
                            note_name: getNoteName(newPitch)
                        };

                        // Preview if pitch changed
                        if (newPitch !== oldPitch) {
                            previewNote(newPitch, updated[mode.noteIndex].velocity);
                        }

                        return updated;
                    });
                }

            } else if (mode.type === 'RESIZING_NOTE') {
                const deltaX = e.clientX - mode.startX;

                // Mark as moved if we've moved more than 3 pixels
                if (!mode.hasMoved && Math.abs(deltaX) > 3) {
                    setMode(prev => prev.type === 'RESIZING_NOTE' ? { ...prev, hasMoved: true } : prev);
                }

                const deltaBeats = pixelsToBeats(deltaX);
                let newDuration = mode.originalDuration + deltaBeats;

                // Snap and clamp
                newDuration = snapBeatsToGrid(newDuration);
                const minDuration = snapEnabled ? gridSubdivision : 0.0625;
                newDuration = Math.max(minDuration, newDuration);

                const note = localNotes[mode.noteIndex];
                const maxDuration = clipDuration - note.start_time;
                newDuration = Math.min(newDuration, maxDuration);

                // Update preview immediately (shows where it will snap)
                setResizePreview({ noteIndex: mode.noteIndex, duration: newDuration });

                // Only update actual note if duration changed
                if (note.duration !== newDuration) {
                    setLocalNotes(prev => {
                        const updated = [...prev];
                        updated[mode.noteIndex] = {
                            ...updated[mode.noteIndex],
                            duration: newDuration
                        };
                        return updated;
                    });
                }

            } else if (mode.type === 'PAINTING_NOTES') {
                // Only allow painting within clip region
                if (currentX < clipStartX || currentX >= clipEndX) return;

                const pitch = pixelsToPitch(currentY);
                const absoluteTime = pixelsToBeats(currentX);
                const clipRelativeTime = absoluteTime - clipStartTime;

                if (clipRelativeTime < 0 || clipRelativeTime >= clipDuration) return;

                const cellKey = getCellKey(pitch, clipRelativeTime);

                // Add note if we haven't painted this cell yet
                if (!mode.paintedCells.has(cellKey) && !noteExistsAt(pitch, clipRelativeTime)) {
                    addNote(pitch, clipRelativeTime);
                    setMode(prev => {
                        if (prev.type === 'PAINTING_NOTES') {
                            const newPainted = new Set(prev.paintedCells);
                            newPainted.add(cellKey);
                            return { ...prev, paintedCells: newPainted };
                        }
                        return prev;
                    });
                }
            }
        };

        const handleMouseUp = async () => {
            // Clear previews
            setDragPreview(null);
            setResizePreview(null);

            // Handle click-to-delete (if we didn't move)
            if (mode.type === 'DRAGGING_NOTE' && !mode.hasMoved) {
                // Update local state IMMEDIATELY for responsive UI
                const updatedNotes = localNotes.filter((_, i) => i !== mode.noteIndex);
                setLocalNotes(updatedNotes);

                // Return to idle mode immediately
                setMode({ type: 'IDLE' });

                // Block sync from backend until commit completes
                isCommittingRef.current = true;
                await updateClip(clipId, { midi_events: updatedNotes });
                isCommittingRef.current = false;
                return;
            } else if (mode.type === 'RESIZING_NOTE' && !mode.hasMoved) {
                // If we clicked resize handle but didn't move, do nothing
                setMode({ type: 'IDLE' });
                return;
            }

            // We moved - commit changes to backend
            isCommittingRef.current = true;
            await commitToBackend();
            isCommittingRef.current = false;

            // Return to idle mode
            setMode({ type: 'IDLE' });
        };

        // Attach listeners
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [mode, localNotes, clipStartTime, clipDuration, clipStartX, clipEndX, minPitch, maxPitch, snapEnabled, gridSubdivision, commitToBackend, addNote]);

    // ========================================================================
    // RENDERING
    // ========================================================================
    const totalBeats = 64;
    const totalWidth = beatsToPixels(totalBeats);
    const totalHeight = (maxPitch - minPitch + 1) * noteHeight;
    const gridLineSpacing = beatWidth;

    return (
        <div className="flex-1 overflow-auto bg-background">
            <div
                ref={gridRef}
                className="relative cursor-crosshair"
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
                onMouseDown={handleGridMouseDown}
            >
                {/* Clip Region Highlight */}
                <div
                    className="absolute top-0 bottom-0 bg-cyan-500/10 border-l-2 border-r-2 border-cyan-500/50 pointer-events-none"
                    style={{
                        left: `${clipStartX}px`,
                        width: `${clipEndX - clipStartX}px`,
                    }}
                />

                {/* Notes */}
                {localNotes.map((note, index) => {
                    const hasDragPreview = dragPreview?.noteIndex === index;
                    const hasResizePreview = resizePreview?.noteIndex === index;
                    const isPreviewing = hasDragPreview || hasResizePreview;

                    const x = beatsToPixels(clipStartTime + note.start_time);
                    const y = pitchToPixels(note.note);
                    const width = beatsToPixels(note.duration);
                    const isPlaying = activeNotes.some(
                        activeNote => activeNote.clip_id === clipId &&
                                     activeNote.note === note.note &&
                                     activeNote.start_time === note.start_time
                    );
                    const velocityOpacity = 0.4 + (note.velocity / 127) * 0.6;

                    return (
                        <div key={index}>
                            {/* Original note (dimmed when previewing) */}
                            <div
                                className="absolute rounded cursor-move select-none"
                                style={{
                                    left: `${x}px`,
                                    top: `${y}px`,
                                    width: `${width}px`,
                                    height: `${noteHeight}px`,
                                    backgroundColor: `rgba(8, 145, 178, ${isPreviewing ? velocityOpacity * 0.3 : velocityOpacity})`,
                                    boxShadow: isPlaying ? '0 0 20px rgba(6, 182, 212, 0.8)' : undefined,
                                    opacity: isPreviewing ? 0.4 : 1,
                                }}
                                onMouseDown={(e) => handleNoteMouseDown(e, index, false)}
                            >
                                {/* Velocity bar */}
                                <div
                                    className="absolute bottom-0 left-0 right-0 bg-cyan-300/40"
                                    style={{ height: `${(note.velocity / 127) * 100}%` }}
                                />

                                {/* Resize handle */}
                                <div
                                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-10"
                                    onMouseDown={(e) => handleNoteMouseDown(e, index, true)}
                                />
                            </div>

                            {/* Ghost preview (shown when dragging/resizing) */}
                            {hasDragPreview && (
                                <div
                                    className="absolute rounded pointer-events-none"
                                    style={{
                                        left: `${beatsToPixels(clipStartTime + dragPreview.time)}px`,
                                        top: `${pitchToPixels(dragPreview.pitch)}px`,
                                        width: `${width}px`,
                                        height: `${noteHeight}px`,
                                        backgroundColor: `rgba(6, 182, 212, 0.5)`,
                                        border: '2px dashed rgba(6, 182, 212, 0.8)',
                                    }}
                                />
                            )}

                            {hasResizePreview && (
                                <div
                                    className="absolute rounded pointer-events-none"
                                    style={{
                                        left: `${x}px`,
                                        top: `${y}px`,
                                        width: `${beatsToPixels(resizePreview.duration)}px`,
                                        height: `${noteHeight}px`,
                                        backgroundColor: `rgba(6, 182, 212, 0.5)`,
                                        border: '2px dashed rgba(6, 182, 212, 0.8)',
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

