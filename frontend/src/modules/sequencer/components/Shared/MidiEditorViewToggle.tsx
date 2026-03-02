/**
 * MidiEditorViewToggle — Keys ↔ Grid view switcher
 *
 * Shared between SequencerPianoRoll and SequencerStepEditor headers.
 * Reads midiEditorMode and calls switchMidiEditorMode from the DAW store.
 */

import { Piano, Grid3x3 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { useDAWStore } from "@/stores/dawStore";

export function MidiEditorViewToggle() {
    const midiEditorMode   = useDAWStore((s) => s.midiEditorMode);
    const switchMode       = useDAWStore((s) => s.switchMidiEditorMode);

    return (
        <>
            <IconButton
                icon={Piano}
                tooltip="Piano Roll (Keys)"
                onClick={() => switchMode("piano-roll")}
                variant="ghost"
                size="icon-sm"
                active={midiEditorMode === "piano-roll"}
            />
            <IconButton
                icon={Grid3x3}
                tooltip="Step Sequencer (Grid)"
                onClick={() => switchMode("step-sequencer")}
                variant="ghost"
                size="icon-sm"
                active={midiEditorMode === "step-sequencer"}
            />
        </>
    );
}
