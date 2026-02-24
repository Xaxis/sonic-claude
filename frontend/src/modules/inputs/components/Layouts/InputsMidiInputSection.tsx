/**
 * InputsMidiInputSection Component
 * 
 * Container component that composes MIDI input hook with presentation components.
 * Handles MIDI device selection, activity monitoring, and MIDI settings.
 */

import { useState } from "react";
import { useMidiInput } from "../../hooks/useMidiInput";
import { InputsMidiDeviceSelector } from "../InputsMidiDeviceSelector";

export function InputsMidiInputSection() {
    // MIDI settings state
    const [midiThruEnabled, setMidiThruEnabled] = useState(false);
    const [quantizeEnabled, setQuantizeEnabled] = useState(false);

    // Use MIDI input hook
    const {
        midiInputDevices,
        selectedMidiDevice,
        midiActivity,
        setSelectedMidiDevice,
    } = useMidiInput();

    return (
        <InputsMidiDeviceSelector
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

