/**
 * Timeline Canvas Component
 * Canvas-based timeline view with clips and playhead
 */
import { useRef, useEffect, useState, useCallback } from "react";
import { PianoRoll } from "./PianoRoll";
import type { TimelineSequence, Clip, MIDIEvent } from "@/types";

interface TimelineCanvasProps {
    sequence: TimelineSequence;
    selectedTrackId: string | null;
    selectedClipId: string | null;
    onSelectClip: (clipId: string | null) => void;
    onAddClip: (trackId: string, startTime: number) => void;
    onUpdateClip: (clipId: string, updates: Partial<Clip>) => void;
    onDeleteClip: (clipId: string) => void;
}

export function TimelineCanvas({
    sequence,
    selectedTrackId,
    selectedClipId,
    onSelectClip,
    onAddClip,
    onUpdateClip,
    onDeleteClip,
}: TimelineCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [editingClip, setEditingClip] = useState<Clip | null>(null);

    // Constants for rendering
    const PIXELS_PER_BEAT = 40 * sequence.zoom_level;
    const TRACK_HEIGHT = 100;
    const RULER_HEIGHT = 30;

    // Update canvas size on resize
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

    // Render timeline
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

        // Clear canvas with dark background
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

        // Draw time ruler
        drawTimeRuler(ctx);

        // Draw grid
        drawGrid(ctx);

        // Draw clips
        drawClips(ctx);

        // Draw playhead
        drawPlayhead(ctx);
    }, [canvasSize, sequence]);

    const drawTimeRuler = (ctx: CanvasRenderingContext2D) => {
        // Ruler background
        ctx.fillStyle = "rgba(139, 92, 246, 0.05)";
        ctx.fillRect(0, 0, canvasSize.width, RULER_HEIGHT);

        // Ruler bottom border
        ctx.strokeStyle = "rgba(139, 92, 246, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, RULER_HEIGHT);
        ctx.lineTo(canvasSize.width, RULER_HEIGHT);
        ctx.stroke();

        // Draw beat markers
        ctx.fillStyle = "#8b5cf6";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";

        const visibleBeats = Math.ceil(canvasSize.width / PIXELS_PER_BEAT) + 1;
        for (let beat = 0; beat < visibleBeats; beat++) {
            const x = beat * PIXELS_PER_BEAT;
            const isBar = beat % sequence.time_signature_numerator === 0;

            // Draw tick
            ctx.strokeStyle = isBar ? "#8b5cf6" : "rgba(139, 92, 246, 0.3)";
            ctx.beginPath();
            ctx.moveTo(x, RULER_HEIGHT - (isBar ? 10 : 5));
            ctx.lineTo(x, RULER_HEIGHT);
            ctx.stroke();

            // Draw bar number
            if (isBar) {
                const bar = Math.floor(beat / sequence.time_signature_numerator) + 1;
                ctx.fillText(`${bar}`, x, RULER_HEIGHT - 15);
            }
        }
    };

    const drawGrid = (ctx: CanvasRenderingContext2D) => {
        ctx.lineWidth = 1;

        // Vertical grid lines (beats)
        const visibleBeats = Math.ceil(canvasSize.width / PIXELS_PER_BEAT) + 1;
        for (let beat = 0; beat < visibleBeats; beat++) {
            const x = beat * PIXELS_PER_BEAT;
            const isBar = beat % sequence.time_signature_numerator === 0;
            ctx.strokeStyle = isBar ? "rgba(139, 92, 246, 0.1)" : "rgba(139, 92, 246, 0.05)";
            ctx.beginPath();
            ctx.moveTo(x, RULER_HEIGHT);
            ctx.lineTo(x, canvasSize.height);
            ctx.stroke();
        }

        // Horizontal grid lines (tracks)
        sequence.tracks.forEach((_, index) => {
            const y = RULER_HEIGHT + (index + 1) * TRACK_HEIGHT;
            ctx.strokeStyle = "rgba(139, 92, 246, 0.1)";
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasSize.width, y);
            ctx.stroke();
        });
    };

    const drawClips = (ctx: CanvasRenderingContext2D) => {
        sequence.tracks.forEach((track, trackIndex) => {
            track.clips.forEach((clip) => {
                const x = clip.start_time * PIXELS_PER_BEAT;
                const y = RULER_HEIGHT + trackIndex * TRACK_HEIGHT + 5;
                const width = clip.duration * PIXELS_PER_BEAT;
                const height = TRACK_HEIGHT - 10;

                // Clip background
                ctx.fillStyle = clip.id === selectedClipId
                    ? "rgba(139, 92, 246, 0.3)"
                    : "rgba(139, 92, 246, 0.15)";
                ctx.fillRect(x, y, width, height);

                // Clip border
                ctx.strokeStyle = "#8b5cf6";
                ctx.lineWidth = clip.id === selectedClipId ? 2 : 1;
                ctx.strokeRect(x, y, width, height);

                // Clip name
                ctx.fillStyle = "#8b5cf6";
                ctx.font = "11px sans-serif";
                ctx.textAlign = "left";
                ctx.fillText(clip.name, x + 5, y + 15);

                // MIDI events preview
                if (clip.midi_events && clip.midi_events.length > 0) {
                    ctx.fillStyle = "rgba(139, 92, 246, 0.4)";
                    clip.midi_events.forEach((event) => {
                        const noteX = x + event.start_time * PIXELS_PER_BEAT;
                        const noteWidth = event.duration * PIXELS_PER_BEAT;
                        const noteY = y + height - 20;
                        ctx.fillRect(noteX, noteY, noteWidth, 2);
                    });
                }
            });
        });
    };

    // Handle double-click to open piano roll
    const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find clicked clip
        for (const track of sequence.tracks) {
            for (const clip of track.clips) {
                const clipX = clip.start_time * PIXELS_PER_BEAT;
                const trackIndex = sequence.tracks.indexOf(track);
                const clipY = RULER_HEIGHT + trackIndex * TRACK_HEIGHT + 5;
                const clipWidth = clip.duration * PIXELS_PER_BEAT;
                const clipHeight = TRACK_HEIGHT - 10;

                if (x >= clipX && x <= clipX + clipWidth && y >= clipY && y <= clipY + clipHeight) {
                    setEditingClip(clip);
                    return;
                }
            }
        }
    }, [sequence]);

    const handleUpdateMIDIEvents = useCallback((events: MIDIEvent[]) => {
        if (editingClip) {
            onUpdateClip(editingClip.id, { midi_events: events });
        }
    }, [editingClip, onUpdateClip]);

    const drawPlayhead = (ctx: CanvasRenderingContext2D) => {
        const x = sequence.playhead_position * PIXELS_PER_BEAT;

        // Red playhead line
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasSize.height);
        ctx.stroke();

        // Playhead triangle
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - 6, 10);
        ctx.lineTo(x + 6, 10);
        ctx.closePath();
        ctx.fill();
    };

    return (
        <>
            <div ref={containerRef} className="min-h-0 flex-1 overflow-auto">
                <canvas
                    ref={canvasRef}
                    className="cursor-crosshair"
                    onDoubleClick={handleDoubleClick}
                />
            </div>

            {/* Piano Roll Modal */}
            {editingClip && (
                <PianoRoll
                    clip={editingClip}
                    onUpdateMIDIEvents={handleUpdateMIDIEvents}
                    onClose={() => setEditingClip(null)}
                />
            )}
        </>
    );
}

