/**
 * Piano Roll Component
 * Interactive canvas-based MIDI note editor with drag-drop functionality
 */
import { useRef, useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Clip, MIDIEvent } from "@/types";

interface PianoRollProps {
    clip: Clip;
    onUpdateMIDIEvents: (events: MIDIEvent[]) => void;
    onClose: () => void;
}

// MIDI note names
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const OCTAVES = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export function PianoRoll({ clip, onUpdateMIDIEvents, onClose }: PianoRollProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [midiEvents, setMidiEvents] = useState<MIDIEvent[]>(clip.midi_events);
    const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragMode, setDragMode] = useState<"move" | "resize" | null>(null);

    // Constants
    const PIANO_WIDTH = 80;
    const NOTE_HEIGHT = 16;
    const PIXELS_PER_BEAT = 60;
    const TOTAL_NOTES = OCTAVES.length * 12;

    // Update canvas size
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setCanvasSize({ width, height });
            }
        };

        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

    // Convert MIDI note number to Y position
    const noteToY = (note: number) => {
        const reversedNote = 127 - note;
        return reversedNote * NOTE_HEIGHT;
    };

    // Convert Y position to MIDI note number
    const yToNote = (y: number) => {
        const reversedNote = Math.floor(y / NOTE_HEIGHT);
        return 127 - reversedNote;
    };

    // Convert beat to X position
    const beatToX = (beat: number) => {
        return PIANO_WIDTH + beat * PIXELS_PER_BEAT;
    };

    // Convert X position to beat
    const xToBeat = (x: number) => {
        return Math.max(0, (x - PIANO_WIDTH) / PIXELS_PER_BEAT);
    };

    // Get note name from MIDI number
    const getNoteNameFromMIDI = (midiNote: number) => {
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = NOTE_NAMES[midiNote % 12];
        return `${noteName}${octave}`;
    };

    // Render piano roll
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas resolution
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvasSize.width * dpr;
        canvas.height = canvasSize.height * dpr;
        canvas.style.width = `${canvasSize.width}px`;
        canvas.style.height = `${canvasSize.height}px`;
        ctx.scale(dpr, dpr);

        // Clear canvas
        ctx.fillStyle = "hsl(var(--background))";
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

        // Draw piano keys
        drawPianoKeys(ctx);

        // Draw grid
        drawGrid(ctx);

        // Draw MIDI notes
        drawMIDINotes(ctx);
    }, [canvasSize, midiEvents, selectedNoteIndex]);

    const drawPianoKeys = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = "hsl(var(--primary) / 0.05)";
        ctx.fillRect(0, 0, PIANO_WIDTH, canvasSize.height);

        for (let i = 0; i < TOTAL_NOTES; i++) {
            const midiNote = 127 - i;
            const y = i * NOTE_HEIGHT;
            const noteName = NOTE_NAMES[midiNote % 12];
            const isBlackKey = noteName.includes("#");

            // Key background
            ctx.fillStyle = isBlackKey ? "hsl(var(--primary) / 0.15)" : "hsl(var(--primary) / 0.05)";
            ctx.fillRect(0, y, PIANO_WIDTH, NOTE_HEIGHT);

            // Key border
            ctx.strokeStyle = "hsl(var(--primary) / 0.1)";
            ctx.lineWidth = 1;
            ctx.strokeRect(0, y, PIANO_WIDTH, NOTE_HEIGHT);

            // Note label (only for C notes)
            if (noteName === "C") {
                ctx.fillStyle = "hsl(var(--primary))";
                ctx.font = "10px monospace";
                ctx.textAlign = "left";
                ctx.fillText(getNoteNameFromMIDI(midiNote), 5, y + NOTE_HEIGHT / 2 + 4);
            }
        }
    };

    const drawGrid = (ctx: CanvasRenderingContext2D) => {
        // Horizontal lines (notes)
        ctx.strokeStyle = "hsl(var(--primary) / 0.05)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= TOTAL_NOTES; i++) {
            const y = i * NOTE_HEIGHT;
            ctx.beginPath();
            ctx.moveTo(PIANO_WIDTH, y);
            ctx.lineTo(canvasSize.width, y);
            ctx.stroke();
        }

        // Vertical lines (beats)
        const totalBeats = Math.ceil((canvasSize.width - PIANO_WIDTH) / PIXELS_PER_BEAT);
        for (let beat = 0; beat <= totalBeats; beat++) {
            const x = beatToX(beat);
            const isBar = beat % 4 === 0;
            ctx.strokeStyle = isBar ? "hsl(var(--primary) / 0.15)" : "hsl(var(--primary) / 0.05)";
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasSize.height);
            ctx.stroke();
        }
    };

    const drawMIDINotes = (ctx: CanvasRenderingContext2D) => {
        midiEvents.forEach((event, index) => {
            const x = beatToX(event.start_time);
            const y = noteToY(event.note);
            const width = event.duration * PIXELS_PER_BEAT;
            const height = NOTE_HEIGHT - 2;

            // Note background
            const isSelected = index === selectedNoteIndex;
            const alpha = event.velocity / 127;
            ctx.fillStyle = isSelected
                ? `hsl(var(--primary) / ${alpha * 0.8})`
                : `hsl(var(--primary) / ${alpha * 0.5})`;
            ctx.fillRect(x, y + 1, width, height);

            // Note border
            ctx.strokeStyle = isSelected ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.7)";
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(x, y + 1, width, height);
        });
    };

    // Mouse handlers
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicking on existing note
        let clickedNoteIndex = -1;
        for (let i = midiEvents.length - 1; i >= 0; i--) {
            const event = midiEvents[i];
            const noteX = beatToX(event.start_time);
            const noteY = noteToY(event.note);
            const noteWidth = event.duration * PIXELS_PER_BEAT;

            if (x >= noteX && x <= noteX + noteWidth && y >= noteY && y <= noteY + NOTE_HEIGHT) {
                clickedNoteIndex = i;
                break;
            }
        }

        if (clickedNoteIndex >= 0) {
            // Clicked on existing note
            setSelectedNoteIndex(clickedNoteIndex);
            setIsDragging(true);

            // Check if clicking near right edge for resize
            const event = midiEvents[clickedNoteIndex];
            const noteX = beatToX(event.start_time);
            const noteWidth = event.duration * PIXELS_PER_BEAT;
            if (x >= noteX + noteWidth - 10) {
                setDragMode("resize");
            } else {
                setDragMode("move");
            }
        } else if (x > PIANO_WIDTH) {
            // Add new note
            const beat = xToBeat(x);
            const note = yToNote(y);
            const quantizedBeat = Math.round(beat * 4) / 4; // Quantize to 16th notes

            const newEvent: MIDIEvent = {
                note,
                note_name: getNoteNameFromMIDI(note),
                start_time: quantizedBeat,
                duration: 0.25, // Default 16th note
                velocity: 100,
                channel: 0,
            };

            const newEvents = [...midiEvents, newEvent];
            setMidiEvents(newEvents);
            setSelectedNoteIndex(newEvents.length - 1);
            onUpdateMIDIEvents(newEvents);
        }
    }, [midiEvents, onUpdateMIDIEvents]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging || selectedNoteIndex === null) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newEvents = [...midiEvents];
        const event = newEvents[selectedNoteIndex];

        if (dragMode === "move") {
            // Move note
            const beat = xToBeat(x);
            const note = yToNote(y);
            const quantizedBeat = Math.max(0, Math.round(beat * 4) / 4);

            event.start_time = quantizedBeat;
            event.note = Math.max(0, Math.min(127, note));
            event.note_name = getNoteNameFromMIDI(event.note);
        } else if (dragMode === "resize") {
            // Resize note
            const beat = xToBeat(x);
            const duration = Math.max(0.25, beat - event.start_time);
            const quantizedDuration = Math.round(duration * 4) / 4;
            event.duration = quantizedDuration;
        }

        setMidiEvents(newEvents);
    }, [isDragging, selectedNoteIndex, dragMode, midiEvents]);

    const handleMouseUp = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            setDragMode(null);
            onUpdateMIDIEvents(midiEvents);
        }
    }, [isDragging, midiEvents, onUpdateMIDIEvents]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "Delete" || e.key === "Backspace") {
            if (selectedNoteIndex !== null) {
                const newEvents = midiEvents.filter((_, i) => i !== selectedNoteIndex);
                setMidiEvents(newEvents);
                setSelectedNoteIndex(null);
                onUpdateMIDIEvents(newEvents);
            }
        }
    }, [selectedNoteIndex, midiEvents, onUpdateMIDIEvents]);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div className="panel-glass fixed inset-4 z-50 flex flex-col overflow-hidden rounded-xl">
            {/* Header */}
            <div className="from-primary/5 to-secondary/5 border-primary/10 flex items-center justify-between border-b bg-gradient-to-r px-4 py-3">
                <div>
                    <h3 className="text-primary text-sm font-bold">{clip.name} - Piano Roll</h3>
                    <p className="text-muted-foreground text-xs">
                        {midiEvents.length} notes • Click to add • Drag to move • Drag edge to resize • Delete to remove
                    </p>
                </div>
                <Button onClick={onClose} size="sm" variant="ghost">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Canvas */}
            <div ref={containerRef} className="min-h-0 flex-1 overflow-auto">
                <canvas
                    ref={canvasRef}
                    className="cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
            </div>
        </div>
    );
}
