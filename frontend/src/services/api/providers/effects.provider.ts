/**
 * Effects API Provider
 * Thin HTTP client mapping to /api/effects/* routes
 * 
 * Backend routes:
 * - GET    /api/effects/definitions                      (definitions.py)
 * - GET    /api/effects/categories                       (definitions.py)
 * - GET    /api/effects/categories/{category}            (definitions.py)
 * - GET    /api/effects/track/{track_id}                 (track_effects.py)
 * - POST   /api/effects/track/{track_id}                 (track_effects.py)
 * - GET    /api/effects/{effect_id}                      (track_effects.py)
 * - PATCH  /api/effects/{effect_id}                      (track_effects.py)
 * - DELETE /api/effects/{effect_id}                      (track_effects.py)
 * - POST   /api/effects/{effect_id}/move                 (track_effects.py)
 * - POST   /api/effects/track/{track_id}/clear           (track_effects.py)
 */

import { BaseAPIClient } from "../base";

// ============================================================================
// EFFECT TYPES (Domain Models)
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

export interface EffectDefinition {
    name: string; // Internal effect name (e.g., "lpf", "reverb")
    display_name: string; // User-friendly name (e.g., "Low-Pass Filter", "Reverb")
    category: string; // Category (e.g., "Filter", "EQ", "Dynamics", "Time-Based")
    description: string; // Short description
    parameters: EffectParameter[]; // Available parameters
}

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

export interface TrackEffectChain {
    track_id: string;
    effects: EffectInstance[];
    max_slots: number; // Default: 8
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateEffectRequest {
    track_id: string;
    effect_name: string;
    slot_index?: number;
}

export interface UpdateEffectRequest {
    bypassed?: boolean;
    parameters?: Record<string, number>;
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

// ============================================================================
// EFFECTS PROVIDER (HTTP CLIENT ONLY - NO BUSINESS LOGIC)
// ============================================================================

export class EffectsProvider extends BaseAPIClient {
    // === DEFINITIONS ===
    async getDefinitions(): Promise<EffectDefinition[]> {
        const response = await this.get<EffectListResponse>("/api/effects/definitions");
        return response.effects;
    }

    async getCategories(): Promise<string[]> {
        return this.get("/api/effects/categories");
    }

    async getEffectsByCategory(category: string): Promise<EffectDefinition[]> {
        const response = await this.get<EffectListResponse>(`/api/effects/categories/${category}`);
        return response.effects;
    }

    // === TRACK EFFECTS ===
    async getTrackEffectChain(trackId: string): Promise<TrackEffectChain> {
        return this.get<TrackEffectChain>(`/api/effects/track/${trackId}`);
    }

    async addEffect(request: CreateEffectRequest): Promise<EffectInstance> {
        return this.post<EffectInstance>(`/api/effects/track/${request.track_id}`, request);
    }

    async getEffect(effectId: string): Promise<EffectInstance> {
        return this.get<EffectInstance>(`/api/effects/${effectId}`);
    }

    async updateEffect(effectId: string, request: UpdateEffectRequest): Promise<EffectInstance> {
        return this.patch<EffectInstance>(`/api/effects/${effectId}`, request);
    }

    async deleteEffect(effectId: string): Promise<{ status: string; message: string }> {
        return this.delete(`/api/effects/${effectId}`);
    }

    async moveEffect(effectId: string, request: MoveEffectRequest): Promise<EffectInstance> {
        return this.post<EffectInstance>(`/api/effects/${effectId}/move`, request);
    }

    async clearTrackEffects(trackId: string): Promise<{ status: string; message: string }> {
        return this.post(`/api/effects/track/${trackId}/clear`, {});
    }
}

