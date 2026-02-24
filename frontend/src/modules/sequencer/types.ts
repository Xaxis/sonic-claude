/**
 * Sequencer Feature Types
 */

// ============================================================================
// SEQUENCER (SuperCollider-based)
// ============================================================================

export interface MIDIEvent {
    note: number; // MIDI note number (0-127)
    note_name: string; // e.g., 'C4', 'F#3'
    start_time: number; // Start time in beats
    duration: number; // Duration in beats
    velocity: number; // MIDI velocity (0-127)
    channel: number; // MIDI channel (0-15)
}

export interface SequencerTrack {
    id: string;
    name: string;
    sequence_id: string; // Parent sequence ID
    type: "midi" | "audio" | "sample";
    color: string;
    is_muted: boolean;
    is_solo: boolean;
    is_armed: boolean;

    // Mixing
    volume: number; // 0.0-2.0, 1.0 = unity
    pan: number; // -1.0 to 1.0 (left to right)

    // MIDI-specific
    instrument?: string; // Synth name
    midi_channel: number;

    // Sample-specific
    sample_id?: string; // Reference to sample library
    sample_name?: string; // Cached sample name
    sample_file_path?: string; // Cached file path
}

export interface SequencerClip {
    id: string;
    name: string;
    type: "midi" | "audio";
    track_id: string;
    start_time: number; // beats
    duration: number; // beats

    // MIDI-specific
    midi_events?: MIDIEvent[];

    // Audio-specific
    audio_file_path?: string;
    audio_offset?: number; // seconds

    is_muted: boolean;
    is_looped: boolean;
    gain: number; // 0.0-2.0, 1.0 = unity
}

// ============================================================================
// SYNTHDEF (Instrument Library)
// ============================================================================

export interface SynthDefInfo {
    name: string; // Internal synth name (e.g., "fm", "bass")
    display_name: string; // User-friendly name (e.g., "FM Synth", "Bass Synth")
    category: string; // Category (e.g., "Basic", "Synth", "Bass", "Lead", "Acoustic", "Keys")
    description: string; // Short description
    parameters: string[]; // List of available parameters
}
