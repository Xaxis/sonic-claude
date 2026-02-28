/**
 * SampleEditorWaveform - Waveform display with time grid and draggable handles
 *
 * Layered composition — no custom canvas drawing:
 *   1. bg-background (theme background from CSS vars)
 *   2. SVG time grid  (major + minor lines matching SampleEditorRuler intervals)
 *   3. WaveformDisplay (existing polished component — theme cyan + magenta, filled, glow)
 *   4. Trim dim overlays (absolute divs that darken outside the active region)
 *   5. Loop region highlight (absolute div with accent tint)
 *   6. Draggable handles (DOM elements — trim = white, loop = accent/yellow)
 *
 * Rendering fix — always render the outer container:
 *   The containerRef must always be attached to a real DOM element so the
 *   ResizeObserver can measure height on mount. Loading / error / empty states
 *   are rendered as absolute overlays INSIDE the container, not early-returns
 *   that replace the container (which left containerRef = null on first mount).
 *
 * Drag interaction pattern (matches SequencerPianoRollGrid):
 * - Local state is source of truth during drag (instant visual feedback)
 * - Commits to Zustand / backend only on mouse-up (single updateClip call)
 * - Syncs local state from Zustand when clip changes outside of a drag
 *
 * Zoom / scroll:
 *   contentWidth is provided by SequencerSampleEditor (computed from zoom +
 *   fileDuration). Waveform and handles scale to contentWidth; the parent
 *   provides a single scroll container so ruler + waveform scroll together.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useDAWStore } from "@/stores/dawStore";
import { WaveformDisplay } from "@/components/ui/waveform-display.tsx";
import { Playhead } from "@/components/ui/playhead";
import { safeClipDefaults, getSmartInterval } from "./sampleEditorUtils";
import { WAVEFORM_COLOR_LEFT, WAVEFORM_COLOR_RIGHT } from "@/config/theme.constants";

// ============================================================================
// TYPES
// ============================================================================

type DragHandle = "trim-start" | "trim-end" | "loop-start" | "loop-end";

interface ActiveDrag {
    handle: DragHandle;
}

// ============================================================================
// TIME GRID
// ============================================================================

interface TimeGridProps {
    duration: number;
    isStereo: boolean;
}

function TimeGrid({ duration, isStereo }: TimeGridProps) {
    if (duration <= 0) return null;

    const { major, minor } = getSmartInterval(duration);
    const step = minor ?? major;
    const count = Math.ceil(duration / step) + 1;

    const lines: Array<{ t: number; isMajor: boolean }> = [];
    for (let i = 0; i <= count; i++) {
        const t = Math.round(i * step * 10000) / 10000;
        if (t > duration + step * 0.1) break;
        lines.push({ t, isMajor: minor === null || Math.abs(t % major) < step * 0.1 });
    }

    return (
        <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
        >
            {/* Vertical time lines */}
            {lines.map(({ t, isMajor }, i) => (
                <line
                    key={i}
                    x1={`${(t / duration) * 100}%`}
                    x2={`${(t / duration) * 100}%`}
                    y1="0%"
                    y2="100%"
                    stroke="rgba(255,255,255,1)"
                    strokeOpacity={isMajor ? 0.07 : 0.03}
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                />
            ))}

            {/* Horizontal channel divider (stereo only) */}
            {isStereo && (
                <line
                    x1="0%" x2="100%"
                    y1="50%" y2="50%"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                />
            )}

            {/* Channel center axis lines */}
            {isStereo ? (
                <>
                    <line x1="0%" x2="100%" y1="25%" y2="25%" stroke="rgba(255,255,255,0.04)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    <line x1="0%" x2="100%" y1="75%" y2="75%" stroke="rgba(255,255,255,0.04)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                </>
            ) : (
                <line x1="0%" x2="100%" y1="50%" y2="50%" stroke="rgba(255,255,255,0.05)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            )}
        </svg>
    );
}

// ============================================================================
// HANDLE
// ============================================================================

interface HandleProps {
    pct: number;           // 0..1 position as fraction of total duration
    variant: "trim" | "loop";
    side: "start" | "end";
    onMouseDown: (e: React.MouseEvent) => void;
}

function Handle({ pct, variant, side, onMouseDown }: HandleProps) {
    const isLoop = variant === "loop";

    return (
        <div
            className="absolute inset-y-0 w-4 -translate-x-1/2 z-20 cursor-col-resize group/handle"
            style={{ left: `${pct * 100}%` }}
            onMouseDown={onMouseDown}
        >
            {/* Vertical line */}
            {isLoop ? (
                // Dashed yellow line for loop handles
                <div
                    className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px group-hover/handle:opacity-100 opacity-70 transition-opacity"
                    style={{
                        backgroundImage: "repeating-linear-gradient(to bottom, hsl(45 95% 60%) 0px, hsl(45 95% 60%) 5px, transparent 5px, transparent 9px)",
                    }}
                />
            ) : (
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-white/70 group-hover/handle:bg-white transition-colors" />
            )}

            {/* Cap circle at top */}
            <div
                className={cn(
                    "absolute top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full transition-all shadow-sm",
                    isLoop
                        ? "bg-accent/80 group-hover/handle:bg-accent ring-1 ring-accent/30"
                        : "bg-white/80 group-hover/handle:bg-white ring-1 ring-white/20",
                )}
            />

            {/* Label (start/end indicator on hover) */}
            <div
                className={cn(
                    "absolute top-5 text-[9px] font-mono uppercase tracking-wider opacity-0 group-hover/handle:opacity-100 transition-opacity whitespace-nowrap pointer-events-none",
                    isLoop ? "text-accent" : "text-white/70",
                    side === "start" ? "left-2" : "right-2 translate-x-full",
                )}
            >
                {isLoop ? (side === "start" ? "loop in" : "loop out") : (side === "start" ? "in" : "out")}
            </div>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface SampleEditorWaveformProps {
    waveformData: number[];
    waveformDataRight: number[];
    fileDuration: number;
    isLoading: boolean;
    error: string | null;
    /** Scrollable content width in pixels (from parent zoom calculation). */
    contentWidth: number;
}

export function SampleEditorWaveform({
    waveformData,
    waveformDataRight,
    fileDuration,
    isLoading,
    error,
    contentWidth,
}: SampleEditorWaveformProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const sampleEditorClipId = useDAWStore(s => s.sampleEditorClipId);
    const clips              = useDAWStore(s => s.clips);
    const updateClip         = useDAWStore(s => s.updateClip);
    const transport          = useDAWStore(s => s.transport);
    const activeComposition  = useDAWStore(s => s.activeComposition);
    const tempo              = activeComposition?.tempo ?? 120;

    // ========================================================================
    // DERIVED STATE
    // ========================================================================
    const clip = sampleEditorClipId ? clips.find(c => c.id === sampleEditorClipId) : undefined;
    const { audioOffset, audioEnd, loopEnabled, loopStart, loopEnd, fadeIn, fadeOut } = safeClipDefaults(clip ?? {} as any);
    const clipStartBeats = clip?.start_time ?? 0;
    const isPlaying      = transport?.is_playing ?? false;
    const isPaused       = transport?.is_paused  ?? false;

    const dur     = fileDuration > 0 ? fileDuration : 1;
    const isStereo = waveformDataRight.length > 0;

    // ========================================================================
    // CONTAINER HEIGHT: tracked for WaveformDisplay explicit dimensions
    // The container width comes from the contentWidth prop (zoom-aware).
    // We only need ResizeObserver for the HEIGHT.
    // IMPORTANT: The container div is always rendered (never replaced by an
    // early-return) so this ref is always valid on mount.
    // ========================================================================
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerH, setContainerH] = useState(0);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            setContainerH(Math.round(entries[0].contentRect.height));
        });
        ro.observe(el);
        setContainerH(el.clientHeight);
        return () => ro.disconnect();
    }, []);

    // ========================================================================
    // LOCAL STATE: Source of truth during drag (instant visual feedback)
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

    // Refs for current values — keeps global mouse handlers fresh without re-registration
    const localAudioOffsetRef = useRef(localAudioOffset);
    const localAudioEndRef    = useRef(localAudioEnd);
    const localLoopStartRef   = useRef(localLoopStart);
    const localLoopEndRef     = useRef(localLoopEnd);

    useEffect(() => { localAudioOffsetRef.current = localAudioOffset; }, [localAudioOffset]);
    useEffect(() => { localAudioEndRef.current    = localAudioEnd;    }, [localAudioEnd]);
    useEffect(() => { localLoopStartRef.current   = localLoopStart;   }, [localLoopStart]);
    useEffect(() => { localLoopEndRef.current     = localLoopEnd;     }, [localLoopEnd]);

    // ========================================================================
    // PLAYHEAD REFS: Keep latest values for the RAF loop (mirrors SampleEditorRuler)
    // ========================================================================
    const transportBeatsRef = useRef(transport?.position_beats ?? 0);
    const clipStartBeatsRef = useRef(clipStartBeats);
    const tempoRef          = useRef(tempo);
    const durationRef       = useRef(dur);
    const contentWidthRef   = useRef(contentWidth);

    useEffect(() => {
        transportBeatsRef.current = transport?.position_beats ?? 0;
        clipStartBeatsRef.current = clipStartBeats;
        tempoRef.current          = tempo;
        durationRef.current       = dur;
        contentWidthRef.current   = contentWidth;
    }, [transport?.position_beats, clipStartBeats, tempo, dur, contentWidth]);

    const getPlayheadX = useCallback((): number => {
        const secs = (transportBeatsRef.current - clipStartBeatsRef.current) * (60 / tempoRef.current);
        const pct  = durationRef.current > 0
            ? Math.max(0, Math.min(1, secs / durationRef.current))
            : 0;
        return pct * contentWidthRef.current;
    }, []);

    const isPlayheadVisible = useCallback((): boolean => {
        const secs = (transportBeatsRef.current - clipStartBeatsRef.current) * (60 / tempoRef.current);
        return secs >= 0 && secs <= durationRef.current;
    }, []);

    // ========================================================================
    // SCAN GLOW: Two GPU-accelerated layers that track the playhead
    //   • playedRegionRef — subtle white tint over the "scanned" area (left of playhead)
    //   • scanGlowRef     — red bell-curve gradient centered on the playhead
    // Both are driven here via RAF so they stay in sync with the Playhead line.
    // ========================================================================
    const scanGlowRef     = useRef<HTMLDivElement>(null);
    const playedRegionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const scanEl   = scanGlowRef.current;
        const regionEl = playedRegionRef.current;
        if (!scanEl || !regionEl) return;

        // Scan glow half-width must match the w-20 (80px) class on the element
        const GLOW_HALF = 40;

        const apply = () => {
            const x       = getPlayheadX();
            const visible = isPlayheadVisible();
            const op      = visible ? '1' : '0';

            // Right edge of the played-region div tracks the playhead
            regionEl.style.transform = `translateX(${x - contentWidthRef.current}px)`;
            regionEl.style.opacity   = op;

            // Glow column centered on the playhead
            scanEl.style.transform = `translateX(${x - GLOW_HALF}px)`;
            scanEl.style.opacity   = op;
        };

        if (!isPlaying || isPaused) {
            apply();
            return;
        }

        let animId: number;
        const loop = () => { apply(); animId = requestAnimationFrame(loop); };
        animId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animId);
    }, [isPlaying, isPaused, getPlayheadX, isPlayheadVisible]);

    // Resolved display values
    const localTrimEnd = localAudioEnd ?? dur;
    const localLEnd    = localLoopEnd  ?? dur;

    // ========================================================================
    // DRAG STATE
    // ========================================================================
    const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);

    const startDrag = (handle: DragHandle, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isDraggingRef.current = true;
        setActiveDrag({ handle });
    };

    const pctFromClientX = useCallback((clientX: number): number => {
        const el = containerRef.current;
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        return Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
    }, []);

    // Global listeners — registered only while a drag is active
    useEffect(() => {
        if (!activeDrag) return;

        const onMove = (e: MouseEvent) => {
            const s = pctFromClientX(e.clientX) * dur;
            switch (activeDrag.handle) {
                case "trim-start":
                    setLocalAudioOffset(Math.min(s, (localAudioEndRef.current ?? dur) - 0.01));
                    break;
                case "trim-end":
                    setLocalAudioEnd(Math.max(s, localAudioOffsetRef.current + 0.01));
                    break;
                case "loop-start":
                    setLocalLoopStart(Math.min(s, (localLoopEndRef.current ?? dur) - 0.01));
                    break;
                case "loop-end":
                    setLocalLoopEnd(Math.max(s, localLoopStartRef.current + 0.01));
                    break;
            }
        };

        const onUp = () => {
            isDraggingRef.current = false;
            if (clip) {
                if (activeDrag.handle === "trim-start" || activeDrag.handle === "trim-end") {
                    updateClip(clip.id, {
                        audio_offset: localAudioOffsetRef.current,
                        audio_end:    localAudioEndRef.current,
                    });
                } else {
                    updateClip(clip.id, {
                        loop_start: localLoopStartRef.current,
                        loop_end:   localLoopEndRef.current,
                    });
                }
            }
            setActiveDrag(null);
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup",   onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup",   onUp);
        };
    }, [activeDrag, dur, clip?.id, updateClip, pctFromClientX]);

    // ========================================================================
    // RENDER
    // The outer container div is ALWAYS rendered (even during loading/error).
    // This ensures containerRef is always valid on mount, so the ResizeObserver
    // can measure container height immediately. Loading/error/empty states are
    // absolute overlays rendered inside the container.
    // ========================================================================

    const hasData = !isLoading && !error && waveformData.length > 0;
    const waveformReady = hasData && contentWidth > 0 && containerH > 0;

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative flex-1 min-h-0 bg-background overflow-hidden select-none",
                activeDrag && "cursor-col-resize",
            )}
        >
            {/* ── State overlays (loading / error / empty) ─────────────────── */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 text-xs z-30 bg-background">
                    Loading waveform…
                </div>
            )}
            {!isLoading && error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs z-30 bg-background">
                    <span className="text-destructive/60">Failed to load waveform</span>
                    <span className="text-muted-foreground/40 text-[10px] max-w-xs text-center">{error}</span>
                </div>
            )}
            {!isLoading && !error && waveformData.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 text-xs z-30">
                    No waveform data
                </div>
            )}

            {/* ── Waveform layers (only when data is ready) ────────────────── */}
            {hasData && (
                <>
                    {/* Layer 2: Time grid */}
                    <TimeGrid duration={dur} isStereo={isStereo} />

                    {/* Layer 3: Waveform */}
                    {waveformReady && (
                        <WaveformDisplay
                            data={waveformData}
                            rightData={isStereo ? waveformDataRight : undefined}
                            width={contentWidth}
                            height={containerH}
                            color={WAVEFORM_COLOR_LEFT}
                            rightColor={WAVEFORM_COLOR_RIGHT}
                            backgroundColor="transparent"
                            showGrid={false}
                            glowEffect={true}
                            className="absolute inset-0 pointer-events-none"
                        />
                    )}

                    {/* Layer 4: Trim dim overlays */}
                    {localAudioOffset > 0 && (
                        <div
                            className="absolute inset-y-0 bg-background/70 pointer-events-none"
                            style={{ left: 0, width: `${(localAudioOffset / dur) * 100}%` }}
                        />
                    )}
                    {localAudioEnd != null && localAudioEnd < dur && (
                        <div
                            className="absolute inset-y-0 bg-background/70 pointer-events-none"
                            style={{ left: `${(localTrimEnd / dur) * 100}%`, right: 0 }}
                        />
                    )}

                    {/* ── Layer 4.5: Fade In / Fade Out envelope overlays ─────── */}
                    {/*
                     * Industry standard (Ableton, Logic, Audition): show the fade
                     * region as a triangle/gradient dimming overlay + diagonal
                     * amplitude lines.  Represents that audio is attenuated to
                     * zero at the trim edge and ramps to full over the fade duration.
                     *
                     * Positions use local trim state so the overlay tracks the
                     * trim handles in real time. Fade values come from the store
                     * (update on slider commit via onValueCommit).
                     */}
                    {(() => {
                        const activeLen     = localTrimEnd - localAudioOffset;
                        const effFadeIn     = Math.max(0, Math.min(fadeIn,  activeLen));
                        const effFadeOut    = Math.max(0, Math.min(fadeOut, activeLen - effFadeIn));
                        const fadeInEndT    = localAudioOffset + effFadeIn;
                        const fadeOutStartT = localTrimEnd - effFadeOut;

                        if (effFadeIn === 0 && effFadeOut === 0) return null;

                        const pct = (t: number) => `${(t / dur) * 100}%`;

                        return (
                            <>
                                {/* Gradient dim regions */}
                                {effFadeIn > 0 && (
                                    <div
                                        className="absolute inset-y-0 pointer-events-none"
                                        style={{
                                            left:       pct(localAudioOffset),
                                            width:      pct(effFadeIn),
                                            background: "linear-gradient(to right, rgba(0,0,0,0.45), transparent)",
                                        }}
                                    />
                                )}
                                {effFadeOut > 0 && (
                                    <div
                                        className="absolute inset-y-0 pointer-events-none"
                                        style={{
                                            left:       pct(fadeOutStartT),
                                            width:      pct(effFadeOut),
                                            background: "linear-gradient(to left, rgba(0,0,0,0.45), transparent)",
                                        }}
                                    />
                                )}

                                {/* Amplitude envelope lines (V-shape for stereo center-based waveform) */}
                                <svg
                                    className="absolute inset-0 w-full h-full pointer-events-none"
                                    preserveAspectRatio="none"
                                >
                                    {effFadeIn > 0 && (
                                        <>
                                            <line x1={pct(localAudioOffset)} y1="50%" x2={pct(fadeInEndT)} y2="0%"
                                                stroke="rgba(255,255,255,0.45)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                                            <line x1={pct(localAudioOffset)} y1="50%" x2={pct(fadeInEndT)} y2="100%"
                                                stroke="rgba(255,255,255,0.45)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                                        </>
                                    )}
                                    {effFadeOut > 0 && (
                                        <>
                                            <line x1={pct(fadeOutStartT)} y1="0%"   x2={pct(localTrimEnd)} y2="50%"
                                                stroke="rgba(255,255,255,0.45)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                                            <line x1={pct(fadeOutStartT)} y1="100%" x2={pct(localTrimEnd)} y2="50%"
                                                stroke="rgba(255,255,255,0.45)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                                        </>
                                    )}
                                </svg>
                            </>
                        );
                    })()}

                    {/* Layer 5: Loop region */}
                    {loopEnabled && (
                        <div
                            className="absolute inset-y-0 bg-accent/8 border-l border-r border-accent/25 pointer-events-none"
                            style={{
                                left:  `${(localLoopStart / dur) * 100}%`,
                                width: `${((localLEnd - localLoopStart) / dur) * 100}%`,
                            }}
                        />
                    )}

                    {/* Layer 6: Trim handles */}
                    <Handle
                        pct={localAudioOffset / dur}
                        variant="trim"
                        side="start"
                        onMouseDown={e => startDrag("trim-start", e)}
                    />
                    <Handle
                        pct={localTrimEnd / dur}
                        variant="trim"
                        side="end"
                        onMouseDown={e => startDrag("trim-end", e)}
                    />

                    {/* Layer 6: Loop handles (conditional) */}
                    {loopEnabled && (
                        <>
                            <Handle
                                pct={localLoopStart / dur}
                                variant="loop"
                                side="start"
                                onMouseDown={e => startDrag("loop-start", e)}
                            />
                            <Handle
                                pct={localLEnd / dur}
                                variant="loop"
                                side="end"
                                onMouseDown={e => startDrag("loop-end", e)}
                            />
                        </>
                    )}

                    {/* Layer 6.5: Played-region tint — right edge tracks playhead */}
                    <div
                        ref={playedRegionRef}
                        className="absolute top-0 bottom-0 pointer-events-none"
                        style={{
                            left: 0,
                            width: contentWidth,
                            opacity: 0,
                            willChange: 'transform, opacity',
                            background: 'rgba(255, 255, 255, 0.04)',
                            zIndex: 8,
                        }}
                    />

                    {/* Layer 6.6: Scan glow — bell-curve gradient centered on playhead */}
                    <div
                        ref={scanGlowRef}
                        className="absolute top-0 bottom-0 w-20 pointer-events-none"
                        style={{
                            left: 0,
                            opacity: 0,
                            willChange: 'transform, opacity',
                            background: 'linear-gradient(to right, transparent 0%, rgba(239,68,68,0.05) 25%, rgba(239,68,68,0.20) 50%, rgba(239,68,68,0.05) 75%, transparent 100%)',
                            zIndex: 9,
                        }}
                    />

                    {/* Layer 7: Playhead (shared component — same formula as SampleEditorRuler) */}
                    <Playhead
                        getX={getPlayheadX}
                        isVisible={isPlayheadVisible}
                        isPlaying={isPlaying}
                        isPaused={isPaused}
                    />
                </>
            )}
        </div>
    );
}
