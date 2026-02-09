/**
 * Synthesis Feature Types
 */

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

