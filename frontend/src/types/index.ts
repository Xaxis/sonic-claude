export interface AudioAnalysis {
    energy: number;
    brightness: number;
    rhythm: number;
    dominant_frequency: number;
}

export interface MusicalState {
    bpm: number;
    key?: string;
    scale?: string;
    intensity: number;
    complexity: number;
    energy_level?: number;
}

export interface Decision {
    parameter: string;
    value: number | string;
    confidence: number;
    reason: string;
}

export interface AIStatus {
    is_running: boolean;
    is_playing: boolean;
    audio_analysis: AudioAnalysis;
    current_state: MusicalState;
    recent_decisions: Decision[];
    frequency_spectrum: number[];
    llm_reasoning: string;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

// Removed OSCParameter - no longer using OSC/Sonic Pi

export interface AudioDevice {
    index: number;
    name: string;
    channels: number;
    sample_rate: number;
}

export interface Sample {
    id: string;
    name: string;
    filename: string;
    duration: number;
    sample_rate: number;
    channels: number;
    created_at: string;
    file_size: number;
}

export interface SpectralFeatures {
    sample_id: string;
    spectral_centroid: number;
    spectral_rolloff: number;
    spectral_bandwidth: number;
    spectral_flatness: number;
    fundamental_frequency: number;
    harmonics: number[];
    harmonic_amplitudes: number[];
    attack_time: number;
    decay_time: number;
    sustain_level: number;
    release_time: number;
    frequency_bins: number[];
    magnitude_spectrum: number[];
    brightness: number;
    roughness: number;
    warmth: number;
}

export interface SynthesisParameters {
    sample_id: string;
    synth_type: string;
    note: string;
    amp: number;
    pan: number;
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    cutoff: number;
    res: number;
    detune: number;
    pulse_width: number;
    reverb: number;
    echo: number;
    reasoning: string;
    confidence: number;
}

// Pads Panel Types
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

// Live Transcription Types
export type StemType = "drums" | "bass" | "vocals" | "other";

export interface Note {
    pitch: number;  // MIDI note number (0-127)
    note_name: string;  // e.g., 'C4', 'F#3'
    onset_time: number;  // seconds
    duration: number;  // seconds
    velocity: number;  // 0.0-1.0
    confidence: number;  // 0.0-1.0
}

export interface Beat {
    time: number;  // seconds
    strength: number;  // 0.0-1.0
    is_downbeat: boolean;
}

export interface StemAnalysis {
    stem_type: StemType;
    notes: Note[];
    beats: Beat[];
    tempo: number;  // BPM
    key: string;  // e.g., 'C', 'F#'
    time_signature: string;  // e.g., '4/4'
    dominant_frequencies: number[];
    energy: number;  // 0.0-1.0
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
    buffer_duration: number;  // seconds
    stems_enabled: Record<StemType, boolean>;
    auto_send_to_sonic_pi: boolean;
}

export interface LiveTranscriptionResult {
    status: TranscriptionStatus;
    stems: StemAnalysis[];
    sonic_pi_code: SonicPiCode[];
    combined_code: string;
    processing_time: number;  // seconds
    error_message?: string;
}

export interface TranscriptionSettings {
    buffer_duration: number;  // 2-30 seconds
    onset_threshold: number;  // 0.1-1.0
    pitch_confidence_threshold: number;  // 0.5-1.0
    min_note_duration: number;  // 0.01-1.0 seconds
    quantize_enabled: boolean;
    quantize_resolution: number;  // e.g., 0.125 for 1/8 note
}

export interface StreamUpdate {
    type: "status" | "progress" | "result" | "error";
    timestamp: number;
    data: any;
}

// Timeline/Sequencer Types
export type ClipType = "midi" | "audio" | "pattern";

export interface MIDIEvent {
    note: number;  // MIDI note number (0-127)
    note_name: string;  // e.g., 'C4', 'F#3'
    start_time: number;  // Start time in beats
    duration: number;  // Duration in beats
    velocity: number;  // MIDI velocity (0-127)
    channel: number;  // MIDI channel (0-15)
}

export interface Clip {
    id: string;
    name: string;
    type: ClipType;
    track_id: string;
    start_time: number;  // beats
    duration: number;  // beats
    color: string;  // hex color

    // MIDI-specific
    midi_events: MIDIEvent[];

    // Audio-specific
    audio_file_path?: string;
    audio_offset: number;  // seconds

    // Playback
    is_muted: boolean;
    is_looped: boolean;
    loop_count: number;
}

export interface Track {
    id: string;
    name: string;
    color: string;
    height: number;  // pixels

    // Clips
    clips: Clip[];

    // Routing
    instrument: string;  // Sonic Pi synth
    midi_channel: number;

    // Mixing
    volume: number;  // 0.0-2.0
    pan: number;  // -1.0 to 1.0
    is_muted: boolean;
    is_solo: boolean;
    is_armed: boolean;  // recording armed
}

export interface TimelineSequence {
    id: string;
    name: string;
    created_at: number;
    updated_at: number;

    // Tracks
    tracks: Track[];

    // Playback settings
    tempo: number;  // BPM
    time_signature_numerator: number;
    time_signature_denominator: number;
    key: string;
    scale: string;

    // Timeline view
    zoom_level: number;  // 0.1-10.0
    scroll_position: number;  // beats

    // Playback state
    is_playing: boolean;
    is_recording: boolean;
    playhead_position: number;  // beats
    loop_enabled: boolean;
    loop_start: number;  // beats
    loop_end: number;  // beats
}

// ============================================================================
// AUDIO ENGINE TYPES (SuperCollider-based)
// ============================================================================

// Engine Status
export interface AudioEngineStatus {
    is_running: boolean;
    sample_rate: number;
    block_size: number;
    num_input_channels: number;
    num_output_channels: number;
    cpu_usage: number;
}

// Synthesis Service Types
export interface SynthDefInfo {
    name: string;
    category: string;
    parameters: Record<string, SynthParameter>;
    description: string;
}

export interface SynthParameter {
    name: string;
    default_value: number;
    min_value: number;
    max_value: number;
    description: string;
}

export interface Synth {
    id: string;
    synthdef: string;
    node_id: number;
    parameters: Record<string, number>;
    is_playing: boolean;
}

export interface CreateSynthRequest {
    synthdef: string;
    parameters?: Record<string, number>;
}

export interface UpdateSynthRequest {
    parameters: Record<string, number>;
}

// Effects Service Types
export interface EffectDefInfo {
    name: string;
    category: string;
    parameters: Record<string, EffectParameter>;
    description: string;
}

export interface EffectParameter {
    name: string;
    default_value: number;
    min_value: number;
    max_value: number;
    description: string;
}

export interface Effect {
    id: string;
    effectdef: string;
    node_id: number;
    parameters: Record<string, number>;
    is_active: boolean;
}

export interface CreateEffectRequest {
    effectdef: string;
    parameters?: Record<string, number>;
}

export interface UpdateEffectRequest {
    parameters: Record<string, number>;
}

// Mixer Service Types
export interface MixerTrack {
    id: string;
    name: string;
    volume: number;  // 0.0-2.0
    pan: number;  // -1.0 to 1.0
    is_muted: boolean;
    is_solo: boolean;
    send_levels: Record<string, number>;  // aux_track_id -> level
    effect_chain: string[];  // effect_ids
    group_id: string | null;
    bus_index: number;
}

export interface CreateTrackRequest {
    name: string;
    volume?: number;
    pan?: number;
}

export interface UpdateTrackVolumeRequest {
    volume: number;
}

export interface UpdateTrackPanRequest {
    pan: number;
}

export interface SetSendLevelRequest {
    aux_track_id: string;
    level: number;
}

export interface AddEffectToTrackRequest {
    effect_id: string;
    position?: number;
}

export interface SetTrackGroupRequest {
    group_id: string | null;
}

// Sequencer Service Types
export interface Sequence {
    id: string;
    name: string;
    tempo: number;
    time_signature: string;
    clips: SequencerClip[];
    is_playing: boolean;
    current_position: number;  // beats
}

export interface SequencerClip {
    id: string;
    name: string;
    type: "midi" | "audio";
    track_id: string;
    start_time: number;  // beats
    duration: number;  // beats

    // MIDI-specific
    midi_events?: MIDIEvent[];

    // Audio-specific
    audio_file_path?: string;
    audio_offset?: number;  // seconds

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
    position: number;  // beats
}
