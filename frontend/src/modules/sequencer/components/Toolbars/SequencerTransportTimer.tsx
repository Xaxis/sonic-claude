/**
 * SequencerTransportTimer – Playback position display
 *
 * Renders inside the unified transport strip — no own border/background.
 * Parent container provides the visual boundary.
 *
 * Two rows:
 *   • BAR : BEAT . TICK  (musical time, primary)
 *   • M:SS.mmm · sig     (wall-clock + time signature, secondary)
 *
 * RAF dead-reckoning — direct DOM writes, zero React re-renders during playback.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useDAWStore } from "@/stores/dawStore";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatMusical(beats: number, beatsPerBar: number): string {
    const b = Math.max(0, beats);
    const bar  = Math.floor(b / beatsPerBar) + 1;
    const beat = Math.floor(b % beatsPerBar) + 1;
    const tick = Math.floor((b % 1) * 96);
    return (
        bar.toString().padStart(3, "0") +
        " : " +
        beat.toString() +
        " . " +
        tick.toString().padStart(2, "0")
    );
}

function formatClock(beats: number, tempo: number): string {
    const s   = (Math.max(0, beats) * 60) / tempo;
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms  = Math.floor((s % 1) * 1000);
    return min + ":" + sec.toString().padStart(2, "0") + "." + ms.toString().padStart(3, "0");
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SequencerTransportTimer() {
    const transport        = useDAWStore((s) => s.transport);
    const compositionTempo = useDAWStore((s) => s.activeComposition?.tempo ?? 120);

    const isPlaying   = transport?.is_playing  ?? false;
    const isPaused    = transport?.is_paused   ?? false;
    const currentPos  = transport?.position_beats ?? 0;
    const tempo       = transport?.tempo ?? compositionTempo;
    const beatsPerBar = transport?.time_signature_num ?? 4;
    const timeSigDen  = transport?.time_signature_den ?? 4;

    const musicalRef = useRef<HTMLSpanElement>(null);
    const clockRef   = useRef<HTMLSpanElement>(null);

    const animRef           = useRef<number | null>(null);
    const targetPosRef      = useRef(currentPos);
    const lastUpdateTimeRef = useRef(Date.now());
    const tempoRef          = useRef(tempo);
    const beatsPerBarRef    = useRef(beatsPerBar);

    useEffect(() => {
        tempoRef.current       = tempo;
        beatsPerBarRef.current = beatsPerBar;
    }, [tempo, beatsPerBar]);

    useEffect(() => {
        targetPosRef.current      = currentPos;
        lastUpdateTimeRef.current = Date.now();
    }, [currentPos]);

    useEffect(() => {
        const write = (pos: number) => {
            if (musicalRef.current)
                musicalRef.current.textContent = formatMusical(pos, beatsPerBarRef.current);
            if (clockRef.current)
                clockRef.current.textContent = formatClock(pos, tempoRef.current);
        };

        if (!isPlaying || isPaused) {
            write(currentPos);
            return;
        }

        const loop = () => {
            const delta = (Date.now() - lastUpdateTimeRef.current) / 1000;
            write(targetPosRef.current + delta * (tempoRef.current / 60));
            animRef.current = requestAnimationFrame(loop);
        };
        animRef.current = requestAnimationFrame(loop);
        return () => { if (animRef.current !== null) cancelAnimationFrame(animRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, isPaused]);

    const musicalInit = formatMusical(currentPos, beatsPerBar);
    const clockInit   = formatClock(currentPos, tempo);

    return (
        <div className="flex flex-col justify-center pl-3 pr-4 h-full select-none min-w-[132px]">
            {/* Row 1: status dot + musical position */}
            <div className="flex items-center gap-1.5">
                <span
                    className={cn(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-200",
                        isPlaying && !isPaused
                            ? "bg-red-500 animate-pulse"
                            : isPaused
                            ? "bg-yellow-400"
                            : "bg-muted-foreground/25"
                    )}
                />
                <span
                    ref={musicalRef}
                    className="font-mono text-xs font-bold tabular-nums tracking-wider text-primary leading-none"
                >
                    {musicalInit}
                </span>
            </div>

            {/* Row 2: clock time + time signature */}
            <div className="flex items-center gap-1.5 mt-[3px] pl-3">
                <span
                    ref={clockRef}
                    className="font-mono text-[9px] tabular-nums text-muted-foreground/55 leading-none tracking-wide"
                >
                    {clockInit}
                </span>
                <span className="font-mono text-[9px] text-muted-foreground/30 leading-none">
                    {beatsPerBar}/{timeSigDen}
                </span>
            </div>
        </div>
    );
}
