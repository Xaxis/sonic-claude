/**
 * SequencerSampleEditor - Audio clip sample editor (bottom panel)
 *
 * Mirrors SequencerPianoRoll in structure and size.
 * Reads clip from Zustand, loads waveform data once, then composes:
 *   - SampleEditorControls  (fixed left sidebar — pitch, rate, gain, fade, etc.)
 *   - SampleEditorRuler     (time ruler in seconds with playhead + trim/loop markers)
 *   - SampleEditorWaveform  (interactive waveform canvas with drag handles)
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Header: "Sample Editor"  │  clip name · duration · close    │
 * ├──────────────────────────┼──────────────────────────────────┤
 * │                          │  [scroll container]              │
 * │  SampleEditorControls    │    SampleEditorRuler             │
 * │                          │    SampleEditorWaveform          │
 * └──────────────────────────┴──────────────────────────────────┘
 *
 * Zoom + scroll:
 *   contentWidth = max(viewportWidth, fileDuration × PIXELS_PER_SECOND × zoom)
 *   Ruler and waveform both render at contentWidth. A single scroll container
 *   wraps both so they scroll together — same pattern as SequencerPianoRoll.
 */

import { useEffect, useRef, useState } from "react";
import { Music, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { EmptyState } from "@/components/ui/empty-state.tsx";
import { useDAWStore } from "@/stores/dawStore";
import { useWaveformData } from "../../hooks/useWaveformData.ts";
import { SampleEditorControls, SAMPLE_EDITOR_SIDEBAR_WIDTH } from "./SampleEditorControls.tsx";
import { SampleEditorRuler } from "./SampleEditorRuler.tsx";
import { SampleEditorWaveform } from "./SampleEditorWaveform.tsx";
import { SAMPLE_EDITOR_PIXELS_PER_SECOND } from "@/config/daw.constants";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface SequencerSampleEditorProps {
    // Retained for API compatibility with SequencerSplitLayout
    sampleEditorScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function SequencerSampleEditor({}: SequencerSampleEditorProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const sampleEditorClipId = useDAWStore(s => s.sampleEditorClipId);
    const clips              = useDAWStore(s => s.clips);
    const activeComposition  = useDAWStore(s => s.activeComposition);
    const closeSampleEditor  = useDAWStore(s => s.closeSampleEditor);
    const zoom               = useDAWStore(s => s.zoom);
    const tempo              = activeComposition?.tempo ?? 120;

    // ========================================================================
    // DERIVED STATE: Clip lookup
    // ========================================================================
    const clip = sampleEditorClipId ? clips.find(c => c.id === sampleEditorClipId) : undefined;

    // ========================================================================
    // WAVEFORM DATA: Loaded once here, passed down as props
    // Hook must be called unconditionally (before any early return).
    // ========================================================================
    const sampleId = clip?.type === "audio"
        ? (clip.sample_id ?? clip.audio_file_path ?? null)
        : null;

    const {
        leftData:              waveformLeft,
        rightData:             waveformRight,
        sampleDurationSeconds: fileDuration,
        isLoading,
        error,
    } = useWaveformData({
        sampleId,
        clipDuration: clip?.duration ?? 4,
        tempo,
        samplesPerLoop: 2000,
    });

    // ========================================================================
    // SCROLL CONTAINER: Track viewport width for contentWidth calculation
    // ========================================================================
    const scrollRef = useRef<HTMLDivElement>(null);
    const [viewportWidth, setViewportWidth] = useState(0);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            setViewportWidth(Math.round(entries[0].contentRect.width));
        });
        ro.observe(el);
        setViewportWidth(el.clientWidth);
        return () => ro.disconnect();
    }, []);

    // ========================================================================
    // EMPTY STATES
    // ========================================================================
    if (!clip) {
        return (
            <EmptyState
                icon={<Music size={48} />}
                title="No Audio Clip Selected"
                description="Click an audio clip in the timeline to open it here."
            />
        );
    }
    if (clip.type !== "audio") {
        return (
            <EmptyState
                icon={<Music size={48} />}
                title="MIDI Clip"
                description="Open the Piano Roll to edit MIDI clips."
            />
        );
    }
    if (!clip.audio_file_path) {
        return (
            <EmptyState
                icon={<Music size={48} />}
                title="No Audio File"
                description="This clip has no associated audio file."
            />
        );
    }

    // ========================================================================
    // DERIVED VALUES
    // ========================================================================
    // Fall back to beat-based duration if audio file duration isn't loaded yet
    const dur = fileDuration > 0 ? fileDuration : (clip.duration / tempo) * 60;

    // contentWidth: at zoom=1 the waveform fills the viewport; higher zoom zooms in
    const contentWidth = Math.max(viewportWidth || 400, dur * SAMPLE_EDITOR_PIXELS_PER_SECOND * zoom);

    // ========================================================================
    // RENDER
    // ========================================================================
    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">

            {/* ── Header — mirrors SequencerPianoRoll header ──────────────── */}
            <div className="border-b border-border bg-muted/20 flex items-center flex-shrink-0 relative">
                {/* Left column — fixed, matches sidebar width */}
                <div
                    className="flex items-center px-3 py-2 border-r border-border flex-shrink-0 bg-background absolute left-0 top-0 bottom-0 z-10"
                    style={{ width: SAMPLE_EDITOR_SIDEBAR_WIDTH }}
                >
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Sample Editor
                    </span>
                </div>

                {/* Right column — clip info + close */}
                <div className="flex-1 px-4 py-2 flex items-center justify-between min-w-0" style={{ paddingLeft: SAMPLE_EDITOR_SIDEBAR_WIDTH + 16 }}>
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-semibold truncate">{clip.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                            {dur > 0 ? `${dur.toFixed(2)}s` : `${clip.duration.toFixed(1)} beats`}
                        </span>
                        <span className="text-xs text-muted-foreground hidden xl:block flex-shrink-0">
                            • bar {Math.floor(clip.start_time / 4) + 1}
                        </span>
                    </div>
                    <IconButton
                        icon={X}
                        tooltip="Close sample editor"
                        onClick={closeSampleEditor}
                        variant="ghost"
                        size="icon-sm"
                    />
                </div>
            </div>

            {/* ── Body ─────────────────────────────────────────────────────── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* LEFT: Controls sidebar */}
                <SampleEditorControls fileDuration={dur} />

                {/* RIGHT: Single scroll container — ruler + waveform scroll together */}
                <div
                    ref={scrollRef}
                    className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden flex flex-col"
                >
                    {/* Content panel — expands to contentWidth so both ruler and waveform scale with zoom */}
                    <div style={{ width: contentWidth }} className="flex flex-col h-full">
                        <SampleEditorRuler fileDuration={dur} contentWidth={contentWidth} />
                        <SampleEditorWaveform
                            waveformData={waveformLeft}
                            waveformDataRight={waveformRight}
                            fileDuration={dur}
                            contentWidth={contentWidth}
                            isLoading={isLoading}
                            error={error}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
