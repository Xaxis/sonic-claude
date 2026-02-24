/**
 * WebSocket Message Types
 * Centralized type definitions for all WebSocket messages
 */

/**
 * Base WebSocket message interface
 * All WebSocket messages should have a 'type' field
 */
export interface BaseWebSocketMessage {
    type: string;
}

/**
 * Active Note (for transport messages)
 * Represents a MIDI note that is currently playing
 */
export interface ActiveNote {
    clip_id: string;
    note: number;
    start_time: number;  // Position in clip (beats) - uniquely identifies the note instance
}

/**
 * Transport WebSocket Data
 */
export interface TransportMessage extends BaseWebSocketMessage {
    type: "transport";
    is_playing: boolean;
    is_paused?: boolean;
    position_beats: number;
    position_seconds: number;
    tempo: number;
    time_signature_num: number;
    time_signature_den: number;
    loop_enabled?: boolean;
    loop_start?: number;
    loop_end?: number;
    metronome_enabled?: boolean;
    active_notes?: ActiveNote[];
}

/**
 * Spectrum WebSocket Data
 */
export interface SpectrumMessage extends BaseWebSocketMessage {
    type: "spectrum";
    frequencies: number[];
    magnitudes: number[];
    sample_rate: number;
    fft_size: number;
}

/**
 * Waveform WebSocket Data
 */
export interface WaveformMessage extends BaseWebSocketMessage {
    type: "waveform";
    samples_left: number[];
    samples_right: number[];
    sample_rate: number;
}

/**
 * Meter WebSocket Data
 */
export interface MeterMessage extends BaseWebSocketMessage {
    type: "meters";
    track_id: string;
    peak_left: number;
    peak_right: number;
    rms_left: number;
    rms_right: number;
}

/**
 * Analytics WebSocket Data
 */
export interface AnalyticsMessage extends BaseWebSocketMessage {
    type: "analytics";
    cpu_usage: number;
    memory_usage: number;
    active_synths: number;
    active_effects: number;
    active_tracks: number;
    sample_rate: number;
    buffer_size: number;
    latency_ms: number;
}

/**
 * Union type of all WebSocket messages
 */
export type WebSocketMessage =
    | TransportMessage
    | SpectrumMessage
    | WaveformMessage
    | MeterMessage
    | AnalyticsMessage;

