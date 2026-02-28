/**
 * SequencerTransportTimer – Professional DAW-style playback position display
 *
 * Shows current playback position in two synchronized formats:
 *   Musical:  BAR : BEAT . TICK  (e.g.  004 : 3 . 092)
 *   Clock:    M:SS.mmm           (e.g.    0:04.250)
 *
 * Architecture:
 * - Uses requestAnimationFrame + dead-reckoning (identical to SequencerTimelinePlayhead)
 * - Writes directly to DOM refs – zero React re-renders during playback
 * - Syncs target position from WebSocket (position_beats), extrapolates between updates
 */

import { useEffect, useRef } from "react";
import { useDAWStore } from "@/stores/dawStore";

// ─────────────────────────────────────────────────────────────────────────────
// Pure conversion helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatMusical(beats: number, beatsPerBar: number): string {
    const safeBeats = Math.max(0, beats);
    const bar  = Math.floor(safeBeats / beatsPerBar) + 1;       // 1-indexed
    const beat = Math.floor(safeBeats % beatsPerBar) + 1;       // 1-indexed
    const tick = Math.floor((safeBeats % 1) * 96);              // 96 PPQN
    return (
        bar.toString().padStart(3, "0") +
        " : " +
        beat.toString() +
        " . " +
        tick.toString().padStart(2, "0")
    );
}

function formatClock(beats: number, tempo: number): string {
    const totalSec = (Math.max(0, beats) * 60) / tempo;
    const minutes  = Math.floor(totalSec / 60);
    const seconds  = Math.floor(totalSec % 60);
    const millis   = Math.floor((totalSec % 1) * 1000);
    return (
        minutes.toString() +
        ":" +
        seconds.toString().padStart(2, "0") +
        "." +
        millis.toString().padStart(3, "0")
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SequencerTransportTimer() {
    // ── Store ─────────────────────────────────────────────────────────────────
    const transport        = useDAWStore((s) => s.transport);
    const compositionTempo = useDAWStore((s) => s.activeComposition?.tempo ?? 120);

    const isPlaying   = transport?.is_playing  ?? false;
    const isPaused    = transport?.is_paused   ?? false;
    const currentPos  = transport?.position_beats ?? 0;
    const tempo       = transport?.tempo ?? compositionTempo;
    const beatsPerBar = transport?.time_signature_num ?? 4;
    const timeSigDen  = transport?.time_signature_den ?? 4;

    // ── DOM refs (written directly by RAF – no state) ─────────────────────────
    const musicalRef = useRef<HTMLSpanElement>(null);
    const clockRef   = useRef<HTMLSpanElement>(null);

    // ── Dead-reckoning refs ───────────────────────────────────────────────────
    const animRef           = useRef<number | null>(null);
    const targetPosRef      = useRef(currentPos);
    const lastUpdateTimeRef = useRef(Date.now());
    const tempoRef          = useRef(tempo);
    const beatsPerBarRef    = useRef(beatsPerBar);

    // Keep mutable refs in sync with store values without restarting RAF
    useEffect(() => {
        tempoRef.current      = tempo;
        beatsPerBarRef.current = beatsPerBar;
    }, [tempo, beatsPerBar]);

    // Sync target position on each WebSocket update
    useEffect(() => {
        targetPosRef.current      = currentPos;
        lastUpdateTimeRef.current = Date.now();
    }, [currentPos]);

    // ── RAF animation loop ────────────────────────────────────────────────────
    useEffect(() => {
        const write = (pos: number) => {
            if (musicalRef.current)
                musicalRef.current.textContent = formatMusical(pos, beatsPerBarRef.current);
            if (clockRef.current)
                clockRef.current.textContent = formatClock(pos, tempoRef.current);
        };

        // Not playing: show exact position, no loop needed
        if (!isPlaying || isPaused) {
            write(currentPos);
            return;
        }

        // Playing: extrapolate forward each frame using dead reckoning
        const loop = () => {
            const delta = (Date.now() - lastUpdateTimeRef.current) / 1000;
            const pos   = targetPosRef.current + delta * (tempoRef.current / 60);
            write(pos);
            animRef.current = requestAnimationFrame(loop);
        };

        animRef.current = requestAnimationFrame(loop);
        return () => {
            if (animRef.current !== null) cancelAnimationFrame(animRef.current);
        };
    // Restart loop only when play state changes, not on every position tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, isPaused]);

    // ── Initial render strings (React hydration pass) ────────────────────────
    const musicalInit = formatMusical(currentPos, beatsPerBar);
    const clockInit   = formatClock(currentPos, tempo);

    return (
        <div
            className="relative flex flex-col items-center justify-center px-4 py-1.5 rounded-md border border-border/40 bg-black/70 min-w-[148px] select-none"
            title="Playback position"
        >
            {/* Status dot – pulses when playing */}
            <span
                className={[
                    "absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full",
                    isPlaying && !isPaused
                        ? "bg-red-500 animate-pulse"
                        : isPaused
                        ? "bg-yellow-500"
                        : "bg-muted-foreground/30",
                ].join(" ")}
            />

            {/* Musical time: BAR : BEAT . TICK */}
            <span
                ref={musicalRef}
                className="font-mono text-sm font-bold tabular-nums leading-snug tracking-widest text-cyan-400"
            >
                {musicalInit}
            </span>

            {/* Wall-clock time: M:SS.mmm */}
            <span
                ref={clockRef}
                className="font-mono text-[10px] tabular-nums leading-snug tracking-wider text-muted-foreground"
            >
                {clockInit}
            </span>

            {/* Time signature – static label */}
            <span className="absolute bottom-1 right-2 font-mono text-[9px] text-muted-foreground/40 tabular-nums leading-none">
                {beatsPerBar}/{timeSigDen}
            </span>
        </div>
    );
}
