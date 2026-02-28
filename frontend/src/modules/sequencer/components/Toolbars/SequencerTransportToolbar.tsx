/**
 * SequencerTransportToolbar – Unified transport strip
 *
 * One pill container, internal hairline dividers, four logical sections:
 *   [Timer] | [Stop · Play · Record] | [Loop · Click] | [BPM ────]
 *
 * Active state convention (throughout): bg-primary/20 + text-primary
 * No nested boxes — the strip IS the visual boundary.
 */

import { useCallback } from "react";
import { Play, Pause, SkipBack, Circle, Repeat, Music } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { cn } from "@/lib/utils.ts";
import { useDAWStore } from "@/stores/dawStore.ts";
import { toast } from "sonner";
import { SequencerTransportTempoToolbar } from "./SequencerTransportTempoToolbar.tsx";
import { SequencerTransportTimer } from "./SequencerTransportTimer.tsx";

/** Thin full-height hairline divider between strip sections */
function StripDivider() {
    return <div className="w-px self-stretch bg-border/30 flex-shrink-0" />;
}

export function SequencerTransportToolbar() {
    const activeComposition = useDAWStore((s) => s.activeComposition);
    const tracks            = useDAWStore((s) => s.tracks);
    const clips             = useDAWStore((s) => s.clips);
    const transport         = useDAWStore((s) => s.transport);
    const isLooping         = useDAWStore((s) => s.isLooping);

    const play            = useDAWStore((s) => s.play);
    const pause           = useDAWStore((s) => s.pause);
    const resume          = useDAWStore((s) => s.resume);
    const stop            = useDAWStore((s) => s.stop);
    const toggleMetronome = useDAWStore((s) => s.toggleMetronome);
    const setIsLooping    = useDAWStore((s) => s.setIsLooping);

    const isPlaying       = transport?.is_playing  ?? false;
    const isPaused        = transport?.is_paused   ?? false;
    const metronomeEnabled = transport?.metronome_enabled ?? false;
    const canPlay         = tracks.length > 0 || clips.length > 0;
    const playTooltip     = canPlay
        ? (isPlaying ? "Pause" : isPaused ? "Resume" : "Play")
        : "Add tracks and clips to play";

    const handlePlayPause = useCallback(async () => {
        if (!activeComposition) return;
        if (isPlaying)     await pause();
        else if (isPaused) await resume();
        else               await play();
    }, [isPlaying, isPaused, activeComposition, play, pause, resume]);

    const handleStop = useCallback(async () => { await stop(); }, [stop]);

    const handleRecord = useCallback(() => {
        toast.info("Recording not yet implemented");
    }, []);

    const handleLoopToggle = useCallback(async () => {
        try { await setIsLooping(!isLooping); }
        catch { toast.error("Failed to toggle loop"); }
    }, [isLooping, setIsLooping]);

    return (
        /* ── Single unified pill ──────────────────────────────────────────── */
        <div className="flex items-center h-10 rounded-lg border border-border/30 bg-background/80 overflow-hidden">

            {/* 1. Position timer ──────────────────────────────────────────── */}
            <SequencerTransportTimer />

            <StripDivider />

            {/* 2. Core playback: Rewind · Play/Pause · Record ─────────────── */}
            <div className="flex items-center px-1.5 gap-0.5">
                <IconButton
                    icon={SkipBack}
                    tooltip="Stop and rewind to start"
                    onClick={handleStop}
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-sm"
                />
                <IconButton
                    icon={isPlaying ? Pause : Play}
                    tooltip={playTooltip}
                    onClick={handlePlayPause}
                    variant="ghost"
                    size="icon-sm"
                    disabled={!canPlay}
                    className={cn(
                        "rounded-sm",
                        (isPlaying || isPaused) && "bg-primary/20 text-primary"
                    )}
                />
                <IconButton
                    icon={Circle}
                    tooltip="Record (not yet implemented)"
                    onClick={handleRecord}
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-sm text-muted-foreground/40"
                />
            </div>

            <StripDivider />

            {/* 3. Mode toggles: Loop · Metronome ──────────────────────────── */}
            <div className="flex items-center px-1.5 gap-0.5">
                <IconButton
                    icon={Repeat}
                    tooltip={isLooping ? "Loop on" : "Loop off"}
                    onClick={handleLoopToggle}
                    variant="ghost"
                    size="icon-sm"
                    className={cn("rounded-sm", isLooping && "bg-primary/20 text-primary")}
                />
                <IconButton
                    icon={Music}
                    tooltip={metronomeEnabled ? "Metronome on" : "Metronome off"}
                    onClick={toggleMetronome}
                    variant="ghost"
                    size="icon-sm"
                    className={cn("rounded-sm", metronomeEnabled && "bg-primary/20 text-primary")}
                />
            </div>

            <StripDivider />

            {/* 4. Tempo ───────────────────────────────────────────────────── */}
            <div className="flex items-center px-3 h-full min-w-[158px]">
                <SequencerTransportTempoToolbar />
            </div>
        </div>
    );
}
