/**
 * Input Feature Types
 * Handles sample library, pads, and live transcription
 */

// ============================================================================
// PADS
// ============================================================================

export type PlaybackMode = "one-shot" | "loop" | "gate" | "toggle" | "reverse";
export type PadState = "empty" | "loaded" | "playing" | "muted" | "solo";

export interface PadConfig {
    id: string;
    sampleId: string | null;
    sampleName: string | null;
    state: PadState;
    playbackMode: PlaybackMode;
    volume: number; // 0-1
    pitch: number; // -12 to +12 semitones
    pan: number; // -1 to 1
    attack: number; // 0-1
    release: number; // 0-1
    chokeGroup: number | null; // null or 1-4
    color: string; // hex color
    keyboardKey: string | null; // keyboard shortcut
}

export interface PadBank {
    id: string;
    name: string;
    pads: PadConfig[];
}

export interface PadsState {
    banks: PadBank[];
    activeBankId: string;
    masterVolume: number;
    quantizeEnabled: boolean;
}

// ============================================================================
// LIVE TRANSCRIPTION
// ============================================================================

export type StemType = "drums" | "bass" | "vocals" | "other";

export interface Note {
    pitch: number; // MIDI note number (0-127)
    note_name: string; // e.g., 'C4', 'F#3'
    onset_time: number; // seconds
    duration: number; // seconds
    velocity: number; // 0.0-1.0
    confidence: number; // 0.0-1.0
}

export interface Beat {
    time: number; // seconds
    strength: number; // 0.0-1.0
    is_downbeat: boolean;
}

export interface StemAnalysis {
    stem_type: StemType;
    notes: Note[];
    beats: Beat[];
    tempo: number; // BPM
    key: string; // e.g., 'C', 'F#'
    time_signature: string; // e.g., '4/4'
    dominant_frequencies: number[];
    energy: number; // 0.0-1.0
}

export interface SonicPiCode {
    stem_type: StemType;
    code: string;
    live_loop_name: string;
    synth_name: string;
    parameters: Record<string, any>;
}

export type TranscriptionStatus =
    | "idle"
    | "listening"
    | "analyzing"
    | "separating"
    | "transcribing"
    | "complete"
    | "error";

export interface LiveTranscriptionState {
    status: TranscriptionStatus;
    device_index?: number;
    device_name?: string;
    buffer_duration: number; // seconds
    stems_enabled: Record<StemType, boolean>;
    auto_send_to_sonic_pi: boolean;
}

export interface LiveTranscriptionResult {
    status: TranscriptionStatus;
    stems: StemAnalysis[];
    sonic_pi_code: SonicPiCode[];
    combined_code: string;
    processing_time: number; // seconds
    error_message?: string;
}

export interface TranscriptionSettings {
    buffer_duration: number; // 2-30 seconds
    onset_threshold: number; // 0.1-1.0
    pitch_confidence_threshold: number; // 0.5-1.0
    min_note_duration: number; // 0.01-1.0 seconds
    quantize_enabled: boolean;
    quantize_resolution: number; // e.g., 0.125 for 1/8 note
}

export interface StreamUpdate {
    type: "status" | "progress" | "result" | "error";
    timestamp: number;
    data: any;
}
