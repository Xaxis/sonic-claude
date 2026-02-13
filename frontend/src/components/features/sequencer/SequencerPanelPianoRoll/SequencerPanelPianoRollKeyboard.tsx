/**
 * SequencerPanelPianoRollKeyboard - Piano keyboard display for piano roll
 *
 * Shows piano keys from minPitch to maxPitch with visual distinction between white and black keys.
 * Click keys to preview notes.
 */

import { useState } from "react";
import { cn } from "@/lib/utils.ts";
import { useAudioEngine } from "@/contexts/AudioEngineContext.tsx";

interface SequencerPanelPianoRollKeyboardProps {
    minPitch: number; // MIDI note number (e.g., 36 = C2)
    maxPitch: number; // MIDI note number (e.g., 96 = C7)
    noteHeight: number; // pixels per note row
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function SequencerPanelPianoRollKeyboard({
    minPitch,
    maxPitch,
    noteHeight,
}: SequencerPanelPianoRollKeyboardProps) {
    const { playTestNote } = useAudioEngine();
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
        setActiveKey(pitch);
        await playTestNote(pitch, 100, 300); // Play note for 300ms
        setTimeout(() => setActiveKey(null), 300);
    };

    return (
        <div className="w-20 flex-shrink-0 overflow-y-auto border-r border-border bg-background">
            {Array.from({ length: maxPitch - minPitch + 1 }, (_, i) => {
                const pitch = maxPitch - i; // Top to bottom (high to low)
                const isBlack = isBlackKey(pitch);
                const noteName = getNoteName(pitch);
                const isActive = activeKey === pitch;

                return (
                    <div
                        key={pitch}
                        className={cn(
                            "border-b border-border flex items-center justify-end pr-2 font-mono text-xs select-none cursor-pointer transition-colors",
                            isBlack
                                ? isActive
                                    ? "bg-cyan-600 text-white"
                                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                                : isActive
                                    ? "bg-cyan-500 text-white"
                                    : "bg-gray-900 text-gray-300 hover:bg-gray-800"
                        )}
                        style={{ height: `${noteHeight}px` }}
                        onClick={() => handleKeyClick(pitch)}
                        title={`Click to preview ${noteName}`}
                    >
                        {noteName}
                    </div>
                );
            })}
        </div>
    );
}

