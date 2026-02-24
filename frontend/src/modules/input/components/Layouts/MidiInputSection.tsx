/**
 * MidiInputSection Layout Component
 * 
 * Smart container that connects useMidiInput hook with MidiDeviceSelector presentation component.
 * Handles MIDI device selection and settings.
 */

import { useState } from "react";
import { useMidiInput } from "../../hooks/useMidiInput.ts";
import { MidiDeviceSelector } from "../MidiDeviceSelector.tsx";

export function MidiInputSection() {
    // Local UI state for MIDI settings
    const [midiThruEnabled, setMidiThruEnabled] = useState(true);
    const [quantizeEnabled, setQuantizeEnabled] = useState(false);

    // Use MIDI input hook
    const {
        midiInputDevices,
        selectedMidiDevice,
        midiActivity,
        setSelectedMidiDevice,
    } = useMidiInput();

    return (
        <MidiDeviceSelector
            midiInputDevices={midiInputDevices}
            selectedMidiDevice={selectedMidiDevice}
            onDeviceChange={setSelectedMidiDevice}
            midiActivity={midiActivity}
            midiThruEnabled={midiThruEnabled}
            onMidiThruChange={setMidiThruEnabled}
            quantizeEnabled={quantizeEnabled}
            onQuantizeChange={setQuantizeEnabled}
        />
    );
}

