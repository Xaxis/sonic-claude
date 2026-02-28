/**
 * SequencerTransportToolbar – Unified transport strip
 *
 * One pill container, internal hairline dividers, four logical sections:
 *   [Timer] | [Stop · Play · Record] | [Loop · Click] | [BPM ────]
 *
 * Active state: use `active` prop on IconButton — no manual className conditionals.
 */

import { useCallback } from "react";
import { Play, Pause, SkipBack, Circle, Repeat, Music } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import {
    ToolbarPill,
    ToolbarDivider,
    ToolbarGroup,
    ToolbarSection,
} from "@/components/ui/toolbar-primitive.tsx";
import { useDAWStore } from "@/stores/dawStore.ts";
import { toast } from "sonner";
import { SequencerTransportTempoToolbar } from "./SequencerTransportTempoToolbar.tsx";
import { SequencerTransportTimer } from "./SequencerTransportTimer.tsx";

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

    const isPlaying        = transport?.is_playing        ?? false;
    const isPaused         = transport?.is_paused         ?? false;
    const metronomeEnabled = transport?.metronome_enabled ?? false;
    const canPlay          = tracks.length > 0 || clips.length > 0;
    const playTooltip      = canPlay
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
        <ToolbarPill>
            {/* 1. Position timer */}
            <SequencerTransportTimer />

            <ToolbarDivider />

            {/* 2. Core playback: Rewind · Play/Pause · Record */}
            <ToolbarGroup>
                <IconButton
                    icon={SkipBack}
                    tooltip="Stop and rewind to start"
                    onClick={handleStop}
                    size="icon-sm"
                    className="rounded-sm"
                />
                <IconButton
                    icon={isPlaying ? Pause : Play}
                    tooltip={playTooltip}
                    onClick={handlePlayPause}
                    disabled={!canPlay}
                    active={isPlaying || isPaused}
                    size="icon-sm"
                    className="rounded-sm"
                />
                <IconButton
                    icon={Circle}
                    tooltip="Record (not yet implemented)"
                    onClick={handleRecord}
                    size="icon-sm"
                    className="rounded-sm text-muted-foreground/40"
                />
            </ToolbarGroup>

            <ToolbarDivider />

            {/* 3. Mode toggles: Loop · Metronome */}
            <ToolbarGroup>
                <IconButton
                    icon={Repeat}
                    tooltip={isLooping ? "Loop on" : "Loop off"}
                    onClick={handleLoopToggle}
                    active={isLooping}
                    size="icon-sm"
                    className="rounded-sm"
                />
                <IconButton
                    icon={Music}
                    tooltip={metronomeEnabled ? "Metronome on" : "Metronome off"}
                    onClick={toggleMetronome}
                    active={metronomeEnabled}
                    size="icon-sm"
                    className="rounded-sm"
                />
            </ToolbarGroup>

            <ToolbarDivider />

            {/* 4. Tempo */}
            <ToolbarSection px="px-3" className="min-w-[158px]">
                <SequencerTransportTempoToolbar />
            </ToolbarSection>
        </ToolbarPill>
    );
}
