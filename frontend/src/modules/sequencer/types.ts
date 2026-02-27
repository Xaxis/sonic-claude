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
    type: "midi" | "audio";
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
    audio_offset?: number;      // Trim start point (seconds from file start)
    sample_id?: string;         // Source sample ID
    audio_end?: number;         // Trim end point (seconds from file start, undefined = full length)
    pitch_semitones: number;    // -24 to +24
    playback_rate: number;      // 0.25 to 4.0
    reverse: boolean;
    fade_in: number;            // seconds
    fade_out: number;           // seconds
    loop_enabled: boolean;
    loop_start: number;         // seconds from file start
    loop_end?: number;          // seconds from file start, undefined = full length

    is_muted: boolean;
    is_looped: boolean;
    gain: number; // 0.0-2.0, 1.0 = unity

    // MIDI clip transforms — non-destructive, applied at playback time
    midi_transpose?: number;         // semitones, -24 to +24
    midi_velocity_offset?: number;   // delta, -64 to +64
    midi_gate?: number;              // duration multiplier, 0.25 to 4.0
    midi_timing_offset?: number;     // beat offset, -1.0 to +1.0
    midi_quantize_strength?: number; // 0-100%
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
