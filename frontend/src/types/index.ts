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

export interface OSCParameter {
    parameter: string;
    value: number | string;
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
