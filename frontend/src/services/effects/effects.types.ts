/**
 * Effects Types
 * 
 * Type definitions for effects system matching backend models
 */

// ============================================================================
// EFFECT PARAMETER
// ============================================================================

export interface EffectParameter {
    name: string;
    display_name: string;
    type: "float" | "int" | "bool";
    default: number;
    min?: number;
    max?: number;
    unit?: string;
    description?: string;
}

// ============================================================================
// EFFECT DEFINITION (Template)
// ============================================================================

export interface EffectDefinition {
    name: string; // Internal effect name (e.g., "lpf", "reverb")
    display_name: string; // User-friendly name (e.g., "Low-Pass Filter", "Reverb")
    category: string; // Category (e.g., "Filter", "EQ", "Dynamics", "Time-Based")
    description: string; // Short description
    parameters: EffectParameter[]; // Available parameters
}

// ============================================================================
// EFFECT INSTANCE (Active effect on a track)
// ============================================================================

export interface EffectInstance {
    id: string;
    effect_name: string; // Reference to EffectDefinition
    display_name: string;
    track_id?: string;
    slot_index: number; // 0-7 (8 slots per track)
    parameters: Record<string, number>; // Current parameter values
    is_bypassed: boolean;
    is_enabled: boolean;
    sc_node_id?: number;
    sc_bus_in?: number;
    sc_bus_out?: number;
}

// ============================================================================
// TRACK EFFECT CHAIN
// ============================================================================

export interface TrackEffectChain {
    track_id: string;
    effects: EffectInstance[];
    max_slots: number; // Default: 8
}

// ============================================================================
// API REQUEST/RESPONSE MODELS
// ============================================================================

export interface CreateEffectRequest {
    effect_name: string;
    slot_index?: number;
    display_name?: string;
}

export interface UpdateEffectRequest {
    parameters?: Record<string, number>;
    is_bypassed?: boolean;
    display_name?: string;
}

export interface MoveEffectRequest {
    new_slot_index: number;
}

export interface EffectListResponse {
    effects: EffectDefinition[];
}

export interface TrackEffectChainResponse {
    track_id: string;
    effects: EffectInstance[];
}

