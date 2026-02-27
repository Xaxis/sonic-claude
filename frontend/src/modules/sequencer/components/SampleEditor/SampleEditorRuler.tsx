/**
 * SampleEditorRuler - Time ruler for the sample editor
 *
 * Mirrors SequencerPianoRollRuler but works in seconds (not beats).
 * Reads clip + transport state directly from Zustand — no prop drilling.
 *
 * Features:
 * - Smart-interval time markers (ms / s / min:sec)
 * - Trim region shadow overlays aligned with waveform handles below
 * - Yellow loop region overlay
 * - GPU-accelerated red playhead via requestAnimationFrame + translateX
 */

import { useEffect, useRef } from "react";
import { useDAWStore } from "@/stores/dawStore";
import { getSmartInterval, formatTime } from "./sampleEditorUtils";

// ============================================================================
// COMPONENT
// ============================================================================

interface SampleEditorRulerProps {
    /** Actual audio file duration in seconds (from useWaveformData). */
    fileDuration: number;
}

export function SampleEditorRuler({ fileDuration: duration }: SampleEditorRulerProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const sampleEditorClipId = useDAWStore(s => s.sampleEditorClipId);
    const clips              = useDAWStore(s => s.clips);
    const transport          = useDAWStore(s => s.transport);
    const activeComposition  = useDAWStore(s => s.activeComposition);
    const tempo              = activeComposition?.tempo ?? 120;

    // ========================================================================
    // DERIVED STATE
    // ========================================================================
    const clip           = sampleEditorClipId ? clips.find(c => c.id === sampleEditorClipId) : undefined;
    const clipStartBeats = clip?.start_time ?? 0;
    const isPlaying      = transport?.is_playing ?? false;
    const isPaused       = transport?.is_paused  ?? false;

    // Audio-edit params — used for trim / loop visual overlays
    const audioOffset = clip?.audio_offset ?? 0;
    const audioEnd    = clip?.audio_end    ?? undefined;
    const loopEnabled = clip?.loop_enabled ?? false;
    const loopStart   = clip?.loop_start   ?? 0;
    const loopEnd     = clip?.loop_end     ?? undefined;

    // ========================================================================
    // REFS: Keep latest values for the RAF loop without restarting it
    // ========================================================================
    const transportBeatsRef = useRef(transport?.position_beats ?? 0);
    const clipStartBeatsRef = useRef(clipStartBeats);
    const tempoRef          = useRef(tempo);
    const durationRef       = useRef(duration);
    const containerWidthRef = useRef(0);
    const containerRef      = useRef<HTMLDivElement>(null);
    const playheadRef       = useRef<HTMLDivElement>(null);

    useEffect(() => {
        transportBeatsRef.current = transport?.position_beats ?? 0;
        clipStartBeatsRef.current = clipStartBeats;
        tempoRef.current          = tempo;
        durationRef.current       = duration;
    }, [transport?.position_beats, clipStartBeats, tempo, duration]);

    // Track container width for pixel-accurate playhead positioning
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            containerWidthRef.current = entries[0].contentRect.width;
        });
        ro.observe(el);
        containerWidthRef.current = el.offsetWidth;
        return () => ro.disconnect();
    }, []);

    // ========================================================================
    // EFFECTS: GPU-accelerated playhead via RAF + translateX
    // ========================================================================
    useEffect(() => {
        const positionPlayhead = () => {
            if (!playheadRef.current) return;
            const secs = (transportBeatsRef.current - clipStartBeatsRef.current) * (60 / tempoRef.current);
            const pct  = durationRef.current > 0
                ? Math.max(0, Math.min(1, secs / durationRef.current))
                : 0;
            playheadRef.current.style.transform = `translateX(${pct * containerWidthRef.current}px)`;
            playheadRef.current.style.opacity   = (secs >= 0 && secs <= durationRef.current) ? "1" : "0";
        };

        if (!isPlaying || isPaused) {
            positionPlayhead();
            return;
        }

        let animId: number;
        const loop = () => { positionPlayhead(); animId = requestAnimationFrame(loop); };
        animId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animId);
    }, [isPlaying, isPaused]);

    // ========================================================================
    // RENDER
    // ========================================================================

    if (duration <= 0) {
        return <div className="h-8 flex-shrink-0 border-b border-border bg-muted/30" />;
    }

    const { major, minor } = getSmartInterval(duration);
    const step  = minor ?? major;
    const count = Math.ceil(duration / step) + 1;

    const markers: Array<{ t: number; isMajor: boolean }> = [];
    for (let i = 0; i <= count; i++) {
        const t = Math.round(i * step * 10000) / 10000;
        if (t > duration + step * 0.1) break;
        markers.push({ t, isMajor: minor === null || Math.abs(t % major) < step * 0.1 });
    }

    const trimEnd = audioEnd ?? duration;
    const lEnd    = loopEnd  ?? duration;

    return (
        <div
            ref={containerRef}
            className="relative h-8 flex-shrink-0 border-b border-border bg-muted/30 overflow-hidden select-none"
        >
            {/* ── Time markers ─────────────────────────────────────────────── */}
            {markers.map(({ t, isMajor }, i) => (
                <div
                    key={i}
                    className="absolute top-0 bottom-0"
                    style={{ left: `${(t / duration) * 100}%` }}
                >
                    {isMajor ? (
                        <>
                            <span className="absolute top-0.5 left-0.5 text-[9px] leading-none text-muted-foreground/60 whitespace-nowrap tabular-nums pointer-events-none">
                                {formatTime(t)}
                            </span>
                            <div className="absolute bottom-0 top-3.5 w-px bg-border/50" />
                        </>
                    ) : (
                        <div className="absolute bottom-0 top-5 w-px bg-border/25" />
                    )}
                </div>
            ))}

            {/* ── Trim shadows ─────────────────────────────────────────────── */}
            {audioOffset > 0 && (
                <div
                    className="absolute inset-y-0 bg-black/35 pointer-events-none"
                    style={{ left: 0, width: `${(audioOffset / duration) * 100}%` }}
                />
            )}
            {audioEnd != null && audioEnd < duration && (
                <div
                    className="absolute inset-y-0 bg-black/35 pointer-events-none"
                    style={{ left: `${(audioEnd / duration) * 100}%`, right: 0 }}
                />
            )}

            {/* ── Trim flags ───────────────────────────────────────────────── */}
            {audioOffset > 0 && (
                <div className="absolute inset-y-0 w-px bg-white/70 pointer-events-none" style={{ left: `${(audioOffset / duration) * 100}%` }}>
                    <div className="absolute top-0 -left-1.5 w-0 h-0" style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "7px solid rgba(255,255,255,0.7)" }} />
                </div>
            )}
            {audioEnd != null && audioEnd < duration && (
                <div className="absolute inset-y-0 w-px bg-white/70 pointer-events-none" style={{ left: `${(trimEnd / duration) * 100}%` }}>
                    <div className="absolute top-0 -left-1.5 w-0 h-0" style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "7px solid rgba(255,255,255,0.7)" }} />
                </div>
            )}

            {/* ── Loop region ───────────────────────────────────────────────── */}
            {loopEnabled && (
                <>
                    <div
                        className="absolute inset-y-0 bg-yellow-400/10 pointer-events-none"
                        style={{ left: `${(loopStart / duration) * 100}%`, width: `${((lEnd - loopStart) / duration) * 100}%` }}
                    />
                    <div className="absolute inset-y-0 w-px bg-yellow-400/70 pointer-events-none" style={{ left: `${(loopStart / duration) * 100}%` }} />
                    <div className="absolute inset-y-0 w-px bg-yellow-400/70 pointer-events-none" style={{ left: `${(lEnd / duration) * 100}%` }} />
                </>
            )}

            {/* ── Playhead ─────────────────────────────────────────────────── */}
            <div
                ref={playheadRef}
                className="absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none"
                style={{ left: 0, opacity: 0, willChange: "transform, opacity", boxShadow: "0 0 6px rgba(239,68,68,0.7)", transform: "translateX(0px)" }}
            >
                <div className="absolute top-0 -left-1.5 w-0 h-0" style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid #ef4444" }} />
            </div>
        </div>
    );
}
