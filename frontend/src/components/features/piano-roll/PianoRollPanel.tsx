/**
 * Piano Roll Panel
 *
 * MIDI note editor with piano keyboard and grid.
 */

import { useState } from "react";
import { SubPanel } from "@/components/ui/sub-panel";
import { cn } from "@/lib/utils";

interface Note {
    id: string;
    pitch: number; // MIDI note number (0-127)
    start: number; // beats
    duration: number; // beats
    velocity: number; // 0-127
}

const MOCK_NOTES: Note[] = [
    { id: "1", pitch: 60, start: 0, duration: 0.5, velocity: 100 }, // C4
    { id: "2", pitch: 64, start: 0.5, duration: 0.5, velocity: 90 }, // E4
    { id: "3", pitch: 67, start: 1, duration: 0.5, velocity: 95 }, // G4
    { id: "4", pitch: 60, start: 1.5, duration: 0.5, velocity: 100 }, // C4
    { id: "5", pitch: 62, start: 2, duration: 1, velocity: 105 }, // D4
    { id: "6", pitch: 65, start: 3, duration: 0.5, velocity: 85 }, // F4
    { id: "7", pitch: 67, start: 3.5, duration: 0.5, velocity: 90 }, // G4
];

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function PianoRollPanel() {
    const [notes] = useState<Note[]>(MOCK_NOTES);
    const [selectedNote, setSelectedNote] = useState<string | null>(null);

    // Piano roll settings
    const minPitch = 48; // C3
    const maxPitch = 84; // C6
    const numBeats = 8;
    const beatWidth = 60; // pixels per beat
    const noteHeight = 20; // pixels per note

    const getNoteName = (pitch: number): string => {
        const octave = Math.floor(pitch / 12) - 1;
        const noteName = NOTE_NAMES[pitch % 12];
        return `${noteName}${octave}`;
    };

    const isBlackKey = (pitch: number): boolean => {
        const note = pitch % 12;
        return [1, 3, 6, 8, 10].includes(note);
    };

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            <SubPanel title="MIDI Editor">
                <div className="flex h-full overflow-hidden">
                    {/* Piano Keyboard */}
                    <div className="border-border w-16 flex-shrink-0 overflow-y-auto border-r">
                        {Array.from({ length: maxPitch - minPitch + 1 }, (_, i) => {
                            const pitch = maxPitch - i;
                            const isBlack = isBlackKey(pitch);
                            return (
                                <div
                                    key={pitch}
                                    className={cn(
                                        "border-border flex items-center justify-center border-b font-mono text-xs",
                                        isBlack
                                            ? "bg-gray-800 text-gray-400"
                                            : "bg-gray-900 text-gray-300"
                                    )}
                                    style={{ height: `${noteHeight}px` }}
                                >
                                    {getNoteName(pitch)}
                                </div>
                            );
                        })}
                    </div>

                    {/* Note Grid */}
                    <div className="relative flex-1 overflow-auto">
                        {/* Grid Background */}
                        <div
                            className="relative"
                            style={{
                                width: `${numBeats * beatWidth}px`,
                                height: `${(maxPitch - minPitch + 1) * noteHeight}px`,
                            }}
                        >
                            {/* Horizontal lines (pitch) */}
                            {Array.from({ length: maxPitch - minPitch + 1 }, (_, i) => {
                                const pitch = maxPitch - i;
                                const isBlack = isBlackKey(pitch);
                                return (
                                    <div
                                        key={`h-${pitch}`}
                                        className={cn(
                                            "border-border absolute right-0 left-0 border-b",
                                            isBlack ? "bg-gray-800/30" : "bg-gray-900/30"
                                        )}
                                        style={{
                                            top: `${i * noteHeight}px`,
                                            height: `${noteHeight}px`,
                                        }}
                                    />
                                );
                            })}

                            {/* Vertical lines (beats) */}
                            {Array.from({ length: numBeats + 1 }, (_, i) => (
                                <div
                                    key={`v-${i}`}
                                    className={cn(
                                        "absolute top-0 bottom-0 border-l",
                                        i % 4 === 0 ? "border-border" : "border-border/30"
                                    )}
                                    style={{ left: `${i * beatWidth}px` }}
                                />
                            ))}

                            {/* Notes */}
                            {notes.map((note) => {
                                const y = (maxPitch - note.pitch) * noteHeight;
                                const x = note.start * beatWidth;
                                const width = note.duration * beatWidth;
                                const isSelected = selectedNote === note.id;

                                return (
                                    <div
                                        key={note.id}
                                        className={cn(
                                            "absolute cursor-pointer rounded transition-colors",
                                            isSelected
                                                ? "border-2 border-cyan-300 bg-cyan-500"
                                                : "border border-cyan-500 bg-cyan-600/80 hover:bg-cyan-500"
                                        )}
                                        style={{
                                            left: `${x}px`,
                                            top: `${y}px`,
                                            width: `${width}px`,
                                            height: `${noteHeight}px`,
                                        }}
                                        onClick={() => setSelectedNote(note.id)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </SubPanel>
        </div>
    );
}
