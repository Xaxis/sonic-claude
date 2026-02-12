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

    // MIDI-specific
    instrument?: string; // Synth name
    midi_channel: number;

    // Sample-specific
    sample_id?: string; // Reference to sample library
    sample_name?: string; // Cached sample name
    sample_file_path?: string; // Cached file path
}

export interface Sequence {
    id: string;
    name: string;
    tempo: number;
    time_signature: string;
    tracks: SequencerTrack[]; // Tracks belong to sequence
    clips: SequencerClip[];
    is_playing: boolean;
    current_position: number; // beats
    loop_enabled: boolean;
    loop_start: number; // beats
    loop_end: number; // beats
    created_at: string; // ISO datetime string
    updated_at: string; // ISO datetime string
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
}

export interface CreateSequenceRequest {
    name: string;
    tempo?: number;
    time_signature?: string;
}

export interface AddClipRequest {
    clip_type: "midi" | "audio";
    track_id: string;
    start_time: number;
    duration: number;
    midi_events?: MIDIEvent[];
    audio_file_path?: string;
}

export interface UpdateClipRequest {
    start_time?: number;
    duration?: number;
    midi_events?: MIDIEvent[];
    is_muted?: boolean;
    is_looped?: boolean;
}

export interface SetTempoRequest {
    tempo: number;
}

export interface SeekRequest {
    position: number; // beats
}

// ============================================================================
// TIMELINE/SEQUENCER (Legacy - may refactor)
// ============================================================================

export type ClipType = "midi" | "audio" | "pattern";

export interface Clip {
    id: string;
    name: string;
    type: ClipType;
    track_id: string;
    start_time: number; // beats
    duration: number; // beats
    color: string; // hex color

    // MIDI-specific
    midi_events: MIDIEvent[];

    // Audio-specific
    audio_file_path?: string;
    audio_offset: number; // seconds

    // Playback
    is_muted: boolean;
    is_looped: boolean;
    loop_count: number;
}

export interface Track {
    id: string;
    name: string;
    color: string;
    height: number; // pixels

    // Clips
    clips: Clip[];

    // Routing
    instrument: string; // Synth name
    midi_channel: number;

    // Mixing
    volume: number; // 0.0-2.0
    pan: number; // -1.0 to 1.0
    is_muted: boolean;
    is_solo: boolean;
    is_armed: boolean; // recording armed
}

export interface TimelineSequence {
    id: string;
    name: string;
    created_at: number;
    updated_at: number;

    // Tracks
    tracks: Track[];

    // Playback settings
    tempo: number; // BPM
    time_signature_numerator: number;
    time_signature_denominator: number;
    key: string;
    scale: string;

    // Timeline view
    zoom_level: number; // 0.1-10.0
    scroll_position: number; // beats

    // Playback state
    is_playing: boolean;
    is_recording: boolean;
    playhead_position: number; // beats
    loop_enabled: boolean;
    loop_start: number; // beats
    loop_end: number; // beats
}
