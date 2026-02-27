/**
 * SequencerPianoRollKeyboard - Piano keyboard sidebar for the piano roll
 *
 * LAYOUT (256px total sidebar width):
 *   ┌─── 128px keys ───┬─── 128px labels ───┐
 *   │  [white key]     │  C4                │
 *   │  [black key]     │  C#4               │
 *   │  [white key]     │  D4                │
 *   └──────────────────┴────────────────────┘
 *
 * Keys section: standard piano keyboard visual (white/black keys, click-to-preview)
 * Labels section: note name for every pitch row — standard in all pro DAWs
 *   (FL Studio, Ableton Live, Cubase, Logic Pro X)
 *
 * Label hierarchy:
 *   - Middle C (C4 = MIDI 60): primary accent color, semibold
 *   - Other C notes (octave roots): gray-400, medium
 *   - All other notes: gray-600, regular
 */

import { useState } from "react";
import { cn } from "@/lib/utils.ts";
import { api } from "@/services/api";
import { useDAWStore } from "@/stores/dawStore";
import {
    PIANO_ROLL_MIN_PITCH,
    PIANO_ROLL_MAX_PITCH,
    PIANO_ROLL_NOTE_HEIGHT,
    PIANO_ROLL_BLACK_KEY_OFFSETS,
} from "@/config/daw.constants";

// ─── Layout constants ─────────────────────────────────────────────────────────

/** Width of the piano key visual area (left portion of sidebar). */
const KEYBOARD_WIDTH = 128;
/** Width of the note-name label strip (right portion of sidebar). */
const LABEL_WIDTH = 128;

// ─── Note helpers ─────────────────────────────────────────────────────────────

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const getNoteName = (pitch: number): string => {
    const octave = Math.floor(pitch / 12) - 1;
    return `${NOTE_NAMES[pitch % 12]}${octave}`;
};

const isBlackKey = (pitch: number): boolean =>
    PIANO_ROLL_BLACK_KEY_OFFSETS.includes(pitch % 12);

// ─── Component ────────────────────────────────────────────────────────────────

export function SequencerPianoRollKeyboard() {
    const pianoRollClipId = useDAWStore(state => state.pianoRollClipId);
    const clips           = useDAWStore(state => state.clips);
    const tracks          = useDAWStore(state => state.tracks);

    const clip       = pianoRollClipId ? clips.find(c => c.id === pianoRollClipId) : undefined;
    const track      = clip ? tracks.find(t => t.id === clip.track_id) : undefined;
    const instrument = track?.instrument || "sine";

    const [activeKey, setActiveKey] = useState<number | null>(null);

    if (!clip) {
        return <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No clip</div>;
    }

    const minPitch   = PIANO_ROLL_MIN_PITCH;
    const maxPitch   = PIANO_ROLL_MAX_PITCH;
    const noteHeight = PIANO_ROLL_NOTE_HEIGHT;
    const totalHeight = (maxPitch - minPitch + 1) * noteHeight;

    const blackKeyWidth = Math.round(KEYBOARD_WIDTH * 0.7);

    const handleKeyClick = async (pitch: number) => {
        setActiveKey(pitch);
        setTimeout(() => setActiveKey(null), 300);
        try {
            await api.playback.previewNote({ note: pitch, velocity: 100, duration: 0.5, synthdef: instrument });
        } catch { /* ignore preview errors */ }
    };

    return (
        <div
            className="flex-shrink-0 border-r border-border bg-[#111] relative select-none"
            style={{ width: KEYBOARD_WIDTH + LABEL_WIDTH }}
        >
            <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
                {Array.from({ length: maxPitch - minPitch + 1 }, (_, i) => {
                    const pitch    = maxPitch - i;
                    const isBlack  = isBlackKey(pitch);
                    const noteName = getNoteName(pitch);
                    const isActive = activeKey === pitch;
                    const isMiddleC = pitch === 60;
                    const isOctaveC = pitch % 12 === 0;
                    const keyW = isBlack ? blackKeyWidth : KEYBOARD_WIDTH;

                    return (
                        <div
                            key={pitch}
                            className="absolute"
                            style={{
                                top:    `${i * noteHeight}px`,
                                height: `${noteHeight}px`,
                                left:   0,
                                width:  `${KEYBOARD_WIDTH + LABEL_WIDTH}px`,
                            }}
                        >
                            {/* ── Piano key ── */}
                            <div
                                className={cn(
                                    "absolute top-0 bottom-0 left-0 cursor-pointer transition-colors border-b border-gray-700/50",
                                    isBlack
                                        ? isActive
                                            ? "bg-gradient-to-r from-gray-600 to-gray-500 shadow-lg z-10"
                                            : "bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 z-10"
                                        : isActive
                                            ? "bg-gradient-to-r from-gray-200 to-gray-100 shadow-lg"
                                            : "bg-gradient-to-r from-gray-100 to-white hover:from-gray-200 hover:to-gray-100",
                                )}
                                style={{
                                    width:       `${keyW}px`,
                                    borderRight: isBlack ? 'none' : '1px solid rgba(0,0,0,0.1)',
                                    boxShadow:   isBlack
                                        ? 'inset 0 -1px 2px rgba(0,0,0,0.5), 2px 2px 4px rgba(0,0,0,0.3)'
                                        : 'inset 0 -1px 1px rgba(0,0,0,0.1)',
                                }}
                                onClick={() => handleKeyClick(pitch)}
                            >
                                {/* Octave C label on the key face */}
                                {!isBlack && isOctaveC && (
                                    <span className={cn(
                                        "absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold pointer-events-none",
                                        isActive ? "text-gray-800" : "text-gray-500",
                                    )}>
                                        {noteName}
                                    </span>
                                )}
                            </div>

                            {/* ── Note label strip ── */}
                            <div
                                className="absolute top-0 bottom-0 flex items-center px-1.5 border-b border-gray-700/20"
                                style={{
                                    left:            `${KEYBOARD_WIDTH}px`,
                                    right:           0,
                                    backgroundColor: isBlack ? '#141414' : '#1c1c1c',
                                    borderLeft:      '1px solid rgba(75,85,99,0.25)',
                                }}
                            >
                                <span className={cn(
                                    "text-[9px] leading-none tabular-nums pointer-events-none",
                                    isMiddleC   ? "font-semibold"  : isOctaveC ? "font-medium" : "",
                                    isMiddleC   ? "text-primary/80"
                                               : isOctaveC ? "text-gray-400"
                                               : isBlack   ? "text-gray-600"
                                                           : "text-gray-600",
                                )}>
                                    {noteName}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
