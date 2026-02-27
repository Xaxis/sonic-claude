/**
 * SampleEditorWaveform - Waveform canvas with draggable trim and loop handles
 *
 * Mirrors SequencerPianoRollGrid as the main interactive content area.
 * Reads clip state (trim/loop params) directly from Zustand for handle positions.
 * Receives decoded waveform data as props (computed once by the parent).
 *
 * Interaction pattern (matches PianoRoll grid):
 * - Local state is source of truth during drag (instant visual feedback)
 * - Commits to Zustand / backend only on mouse-up (single updateClip call)
 * - Syncs local state from Zustand when clip changes outside of a drag
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useDAWStore } from "@/stores/dawStore";
import { safeClipDefaults, debounce } from "./sampleEditorUtils";

// ============================================================================
// TYPES
// ============================================================================

type DragHandle = "trim-start" | "trim-end" | "loop-start" | "loop-end";

// ============================================================================
// COMPONENT
// ============================================================================

interface SampleEditorWaveformProps {
    waveformData: number[];
    waveformDataRight: number[];
    fileDuration: number;
    isLoading: boolean;
    error: string | null;
}

const HANDLE_SNAP_PX = 8; // pixel proximity to snap to a handle

export function SampleEditorWaveform({
    waveformData,
    waveformDataRight,
    fileDuration,
    isLoading,
    error,
}: SampleEditorWaveformProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const sampleEditorClipId = useDAWStore(s => s.sampleEditorClipId);
    const clips              = useDAWStore(s => s.clips);
    const updateClip         = useDAWStore(s => s.updateClip);

    // ========================================================================
    // DERIVED STATE
    // ========================================================================
    const clip = sampleEditorClipId ? clips.find(c => c.id === sampleEditorClipId) : undefined;
    const { audioOffset, audioEnd, loopEnabled, loopStart, loopEnd } = safeClipDefaults(clip ?? {} as any);

    const dur     = fileDuration > 0 ? fileDuration : 1;
    const trimEnd = audioEnd  ?? dur;
    const lEnd    = loopEnd   ?? dur;

    // ========================================================================
    // LOCAL STATE: Source of truth during drag (instant canvas feedback)
    // ========================================================================
    const [localAudioOffset, setLocalAudioOffset] = useState(audioOffset);
    const [localAudioEnd,    setLocalAudioEnd]    = useState(audioEnd);
    const [localLoopStart,   setLocalLoopStart]   = useState(loopStart);
    const [localLoopEnd,     setLocalLoopEnd]     = useState(loopEnd);

    const isDraggingRef = useRef(false);

    // Sync local state from Zustand whenever the clip changes outside a drag
    useEffect(() => {
        if (isDraggingRef.current) return;
        setLocalAudioOffset(audioOffset);
        setLocalAudioEnd(audioEnd);
        setLocalLoopStart(loopStart);
        setLocalLoopEnd(loopEnd);
    }, [audioOffset, audioEnd, loopStart, loopEnd]);

    // ========================================================================
    // CANVAS REFS
    // ========================================================================
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const draggingRef  = useRef<DragHandle | null>(null);

    // Current values for draw (resolve locals)
    const localTrimEnd = localAudioEnd ?? dur;
    const localLEnd    = localLoopEnd  ?? dur;

    // ========================================================================
    // DRAWING: stable callback ref so ResizeObserver can always call latest draw
    // ========================================================================
    const drawRef = useRef<() => void>(() => {});

    useEffect(() => {
        drawRef.current = () => {
            const canvas = canvasRef.current;
            if (!canvas || waveformData.length === 0) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            const W = canvas.width;
            const H = canvas.height;
            if (W === 0 || H === 0) return;

            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = "#0a0a14";
            ctx.fillRect(0, 0, W, H);

            const drawChannelCorrect = (data: number[], color: string, midY: number, halfH: number) => {
                if (data.length === 0) return;
                const step = data.length / W;
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                for (let x = 0; x < W; x++) {
                    const si = Math.floor(x * step);
                    const ei = Math.min(Math.ceil((x + 1) * step), data.length);
                    let mn = 0, mx = 0;
                    for (let s = si; s < ei; s++) {
                        if (data[s] < mn) mn = data[s];
                        if (data[s] > mx) mx = data[s];
                    }
                    ctx.moveTo(x, midY - mx * halfH);
                    ctx.lineTo(x, midY - mn * halfH);
                }
                ctx.stroke();
            };

            const isStereo = waveformDataRight.length > 0;
            if (isStereo) {
                const qH = H / 4;
                drawChannelCorrect(waveformData,       "rgba(74,222,128,0.85)", qH,     qH - 2);
                drawChannelCorrect(waveformDataRight,  "rgba(96,165,250,0.85)", 3 * qH, qH - 2);
                ctx.fillStyle = "rgba(255,255,255,0.25)";
                ctx.font = "10px monospace";
                ctx.fillText("L", 4, 11);
                ctx.fillText("R", 4, H / 2 + 11);
                ctx.strokeStyle = "rgba(255,255,255,0.05)";
                ctx.lineWidth = 1;
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
                ctx.stroke();
            } else {
                drawChannelCorrect(waveformData, "rgba(74,222,128,0.85)", H / 2, H / 2 - 4);
            }

            // Center axis lines
            ctx.strokeStyle = "rgba(255,255,255,0.04)";
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            ctx.beginPath();
            if (isStereo) {
                ctx.moveTo(0, H / 4);   ctx.lineTo(W, H / 4);
                ctx.moveTo(0, 3*H / 4); ctx.lineTo(W, 3*H / 4);
            } else {
                ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
            }
            ctx.stroke();

            // Dimmed regions outside trim
            const trimStartX = (localAudioOffset / dur) * W;
            const trimEndX   = (localTrimEnd     / dur) * W;
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            if (trimStartX > 0) ctx.fillRect(0, 0, trimStartX, H);
            if (trimEndX < W)   ctx.fillRect(trimEndX, 0, W - trimEndX, H);

            // Loop region highlight
            if (loopEnabled) {
                ctx.fillStyle = "rgba(250,204,21,0.10)";
                ctx.fillRect((localLoopStart / dur) * W, 0, ((localLEnd - localLoopStart) / dur) * W, H);
            }

            // Handle helper
            const drawHandle = (x: number, color: string, dashed: boolean) => {
                ctx.save();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.setLineDash(dashed ? [5, 3] : []);
                ctx.beginPath();
                ctx.moveTo(x, 0); ctx.lineTo(x, H);
                ctx.stroke();
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, 6, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            };

            drawHandle(trimStartX, "#ffffff", false);
            drawHandle(trimEndX,   "#ffffff", false);
            if (loopEnabled) {
                drawHandle((localLoopStart / dur) * W, "#facc15", true);
                drawHandle((localLEnd      / dur) * W, "#facc15", true);
            }
        };

        drawRef.current();
    }, [waveformData, waveformDataRight, dur, localAudioOffset, localTrimEnd, loopEnabled, localLoopStart, localLEnd]);

    // ========================================================================
    // EFFECTS: Resize observer — resize canvas then redraw
    // ========================================================================
    useEffect(() => {
        const container = containerRef.current;
        const canvas    = canvasRef.current;
        if (!container || !canvas) return;
        const ro = new ResizeObserver(() => {
            canvas.width  = container.clientWidth;
            canvas.height = container.clientHeight;
            drawRef.current();
        });
        ro.observe(container);
        canvas.width  = container.clientWidth;
        canvas.height = container.clientHeight;
        return () => ro.disconnect();
    }, []);

    // ========================================================================
    // ACTIONS: Commit local state to Zustand on drag end
    // ========================================================================
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const commitTrim = useCallback(
        debounce((offset: number, end: number | undefined) => {
            if (!clip) return;
            updateClip(clip.id, { audio_offset: offset, audio_end: end });
        }, 0), // no delay — called only on mouseup
        [clip?.id, updateClip],
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const commitLoop = useCallback(
        debounce((start: number, end: number | undefined) => {
            if (!clip) return;
            updateClip(clip.id, { loop_start: start, loop_end: end });
        }, 0),
        [clip?.id, updateClip],
    );

    // ========================================================================
    // DRAG LOGIC
    // ========================================================================
    const secFromEvent = (e: React.MouseEvent<HTMLCanvasElement>): number => {
        const canvas = canvasRef.current!;
        const rect   = canvas.getBoundingClientRect();
        const x      = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        return (x / rect.width) * dur;
    };

    const detectHandle = (e: React.MouseEvent<HTMLCanvasElement>): DragHandle | null => {
        const canvas = canvasRef.current!;
        const rect   = canvas.getBoundingClientRect();
        const x      = e.clientX - rect.left;
        const W      = rect.width;
        const candidates: [DragHandle, number][] = [
            ["trim-start", (localAudioOffset / dur) * W],
            ["trim-end",   (localTrimEnd     / dur) * W],
        ];
        if (loopEnabled) {
            candidates.push(["loop-start", (localLoopStart / dur) * W]);
            candidates.push(["loop-end",   (localLEnd      / dur) * W]);
        }
        let best: DragHandle | null = null;
        let bestDist = HANDLE_SNAP_PX;
        for (const [name, hx] of candidates) {
            const d = Math.abs(x - hx);
            if (d < bestDist) { bestDist = d; best = name; }
        }
        return best;
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const h = detectHandle(e);
        if (h) {
            draggingRef.current = h;
            isDraggingRef.current = true;
            e.preventDefault();
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!draggingRef.current) {
            const canvas = canvasRef.current;
            if (canvas) canvas.style.cursor = detectHandle(e) ? "col-resize" : "default";
            return;
        }
        const s = Math.max(0, Math.min(secFromEvent(e), dur));
        switch (draggingRef.current) {
            case "trim-start": setLocalAudioOffset(Math.min(s, localTrimEnd - 0.01)); break;
            case "trim-end":   setLocalAudioEnd(Math.max(s, localAudioOffset + 0.01)); break;
            case "loop-start": setLocalLoopStart(Math.min(s, localLEnd - 0.01)); break;
            case "loop-end":   setLocalLoopEnd(Math.max(s, localLoopStart + 0.01)); break;
        }
    };

    const handleMouseUp = () => {
        if (!draggingRef.current) return;
        const h = draggingRef.current;
        draggingRef.current  = null;
        isDraggingRef.current = false;
        // Commit final values to Zustand / backend
        if (h === "trim-start" || h === "trim-end") {
            commitTrim(localAudioOffset, localAudioEnd);
        } else {
            commitLoop(localLoopStart, localLoopEnd);
        }
    };

    // ========================================================================
    // RENDER
    // ========================================================================

    if (isLoading) {
        return (
            <div className="flex-1 min-h-0 bg-[#0a0a14] flex items-center justify-center text-muted-foreground/40 text-xs select-none">
                Loading waveform…
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 min-h-0 bg-[#0a0a14] flex flex-col items-center justify-center gap-1 text-xs select-none">
                <span className="text-red-400/60">Failed to load waveform</span>
                <span className="text-muted-foreground/40 text-[10px] max-w-xs text-center">{error}</span>
            </div>
        );
    }

    if (waveformData.length === 0) {
        return (
            <div className="flex-1 min-h-0 bg-[#0a0a14] flex items-center justify-center text-muted-foreground/40 text-xs select-none">
                No waveform data
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex-1 min-h-0 bg-[#0a0a14]">
            <canvas
                ref={canvasRef}
                className="w-full h-full"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />
        </div>
    );
}
