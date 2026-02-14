/**
 * SequencerPanelPianoRollKeyboard - Piano keyboard display for piano roll
 *
 * Shows piano keys from minPitch to maxPitch with visual distinction between white and black keys.
 * Click keys to preview notes.
 */

import { useState } from "react";
import { cn } from "@/lib/utils.ts";
import { api } from "@/services/api";

interface SequencerPanelPianoRollKeyboardProps {
    minPitch: number; // MIDI note number (e.g., 36 = C2)
    maxPitch: number; // MIDI note number (e.g., 96 = C7)
    noteHeight: number; // pixels per note row
    instrument?: string; // Instrument/synthdef to use for preview
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function SequencerPanelPianoRollKeyboard({
    minPitch,
    maxPitch,
    noteHeight,
    instrument = "sine",
}: SequencerPanelPianoRollKeyboardProps) {
    const [activeKey, setActiveKey] = useState<number | null>(null);

    const getNoteName = (pitch: number): string => {
        const octave = Math.floor(pitch / 12) - 1;
        const noteName = NOTE_NAMES[pitch % 12];
        return `${noteName}${octave}`;
    };

    const isBlackKey = (pitch: number): boolean => {
        const note = pitch % 12;
        return [1, 3, 6, 8, 10].includes(note); // C#, D#, F#, G#, A#
    };

    const handleKeyClick = async (pitch: number) => {
        // Preview note with track's instrument
        setActiveKey(pitch);
        setTimeout(() => setActiveKey(null), 300);

        try {
            await api.audioEngine.previewNote(pitch, 100, 0.5, instrument);
        } catch (error) {
            console.error("Failed to preview note:", error);
        }
    };

    const totalHeight = (maxPitch - minPitch + 1) * noteHeight;

    return (
        <div className="w-32 flex-shrink-0 border-r border-border bg-gray-900 relative">
            <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
                {Array.from({ length: maxPitch - minPitch + 1 }, (_, i) => {
                    const pitch = maxPitch - i; // Top to bottom (high to low)
                    const isBlack = isBlackKey(pitch);
                    const noteName = getNoteName(pitch);
                    const isActive = activeKey === pitch;
                    const showLabel = pitch % 12 === 0; // Show octave labels on C notes

                    return (
                        <div
                            key={pitch}
                            className={cn(
                                "absolute left-0 right-0 select-none cursor-pointer transition-all border-b border-gray-700/50",
                                isBlack
                                    ? isActive
                                        ? "bg-gradient-to-r from-gray-600 to-gray-500 shadow-lg z-10"
                                        : "bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 z-10"
                                    : isActive
                                        ? "bg-gradient-to-r from-gray-200 to-gray-100 shadow-lg"
                                        : "bg-gradient-to-r from-gray-100 to-white hover:from-gray-200 hover:to-gray-100"
                            )}
                            style={{
                                top: `${i * noteHeight}px`,
                                height: `${noteHeight}px`,
                                width: isBlack ? '70%' : '100%',
                                right: isBlack ? '0' : 'auto',
                                borderRight: isBlack ? 'none' : '1px solid rgba(0,0,0,0.1)',
                                boxShadow: isBlack
                                    ? 'inset 0 -1px 2px rgba(0,0,0,0.5), 2px 2px 4px rgba(0,0,0,0.3)'
                                    : 'inset 0 -1px 1px rgba(0,0,0,0.1)',
                            }}
                            onClick={() => handleKeyClick(pitch)}
                            title={`Click to preview ${noteName}`}
                        >
                            {/* Note label - only show on white keys and C notes */}
                            {!isBlack && showLabel && (
                                <span className={cn(
                                    "absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold",
                                    isActive ? "text-gray-800" : "text-gray-500"
                                )}>
                                    {noteName}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

