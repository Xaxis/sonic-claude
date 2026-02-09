/**
 * Common/Shared Types
 * 
 * Types used across multiple features.
 * Feature-specific types should live in their respective feature folders.
 */

// ============================================================================
// AUDIO DEVICES
// ============================================================================

export interface AudioDevice {
    index: number;
    name: string;
    channels: number;
    sample_rate: number;
}

// ============================================================================
// SAMPLES
// ============================================================================

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

// ============================================================================
// AUDIO ENGINE STATUS
// ============================================================================

export interface AudioEngineStatus {
    is_running: boolean;
    sample_rate: number;
    block_size: number;
    num_input_channels: number;
    num_output_channels: number;
    cpu_usage: number;
}

