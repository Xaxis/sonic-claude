/**
 * useMidiInput Hook
 * 
 * Manages MIDI input device selection and activity monitoring.
 * Handles Web MIDI API integration for MIDI device access.
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface MidiDeviceInfo {
    id: string;
    name: string;
    manufacturer: string;
    state: string;
}

export function useMidiInput() {
    // MIDI device state
    const [midiInputDevices, setMidiInputDevices] = useState<MidiDeviceInfo[]>([]);
    const [selectedMidiDevice, setSelectedMidiDevice] = useState<string>("");
    const [midiActivity, setMidiActivity] = useState(false);

    // Enumerate MIDI devices
    const enumerateMidiDevices = useCallback(async () => {
        try {
            if (!navigator.requestMIDIAccess) {
                console.warn("Web MIDI API not supported");
                return;
            }

            const midiAccess = await navigator.requestMIDIAccess();
            const inputs: MidiDeviceInfo[] = [];

            midiAccess.inputs.forEach((input) => {
                inputs.push({
                    id: input.id,
                    name: input.name || "Unknown MIDI Device",
                    manufacturer: input.manufacturer || "Unknown",
                    state: input.state,
                });
            });

            setMidiInputDevices(inputs);

            if (inputs.length > 0 && !selectedMidiDevice) {
                setSelectedMidiDevice(inputs[0].id);
            }

            console.log("MIDI input devices detected:", inputs);
        } catch (error) {
            console.error("Failed to access MIDI devices:", error);
            toast.error("Failed to access MIDI devices");
        }
    }, [selectedMidiDevice]);

    // Setup MIDI input listener
    const setupMidiListener = useCallback(async (deviceId: string) => {
        try {
            if (!navigator.requestMIDIAccess) return;

            const midiAccess = await navigator.requestMIDIAccess();
            const input = Array.from(midiAccess.inputs.values()).find((i) => i.id === deviceId);

            if (!input) {
                console.warn("MIDI device not found:", deviceId);
                return;
            }

            // Listen for MIDI messages
            input.onmidimessage = (event) => {
                if (!event.data) return;

                const [status, note, velocity] = event.data;

                // Show activity indicator
                setMidiActivity(true);
                setTimeout(() => setMidiActivity(false), 100);

                // Log MIDI message
                console.log("MIDI:", {
                    status: status.toString(16),
                    note,
                    velocity,
                });
            };

            console.log("✅ MIDI listener setup for:", input.name);
        } catch (error) {
            console.error("Failed to setup MIDI listener:", error);
        }
    }, []);

    // Enumerate MIDI devices on mount
    useEffect(() => {
        enumerateMidiDevices();
    }, [enumerateMidiDevices]);

    // Setup listener when device changes
    useEffect(() => {
        if (selectedMidiDevice) {
            setupMidiListener(selectedMidiDevice);
        }
    }, [selectedMidiDevice, setupMidiListener]);

    return {
        // State
        midiInputDevices,
        selectedMidiDevice,
        midiActivity,
        
        // Actions
        setSelectedMidiDevice,
        enumerateMidiDevices,
    };
}

