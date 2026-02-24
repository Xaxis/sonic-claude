/**
 * Effects API Provider
 * Thin HTTP client mapping to /api/compositions/* routes
 *
 * Backend routes (backend/api/compositions/effects.py):
 * - GET    /api/compositions/definitions
 * - GET    /api/compositions/categories
 * - GET    /api/compositions/categories/{category}
 * - GET    /api/compositions/track/{track_id}
 * - POST   /api/compositions/track/{track_id}
 * - GET    /api/compositions/{effect_id}
 * - PATCH  /api/compositions/{effect_id}
 * - DELETE /api/compositions/{effect_id}
 * - POST   /api/compositions/{effect_id}/move
 * - DELETE /api/compositions/track/{track_id}/clear
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
        const response = await this.get<EffectListResponse>("/api/compositions/effects/definitions");
        return response.effects;
    }

    async getCategories(): Promise<string[]> {
        return this.get("/api/compositions/effects/categories");
    }

    async getEffectsByCategory(category: string): Promise<EffectDefinition[]> {
        const response = await this.get<EffectListResponse>(`/api/compositions/effects/categories/${category}`);
        return response.effects;
    }

    // === TRACK EFFECTS ===
    async getTrackEffectChain(trackId: string): Promise<TrackEffectChain> {
        return this.get<TrackEffectChain>(`/api/compositions/effects/track/${trackId}`);
    }

    async addEffect(request: CreateEffectRequest): Promise<EffectInstance> {
        return this.post<EffectInstance>(`/api/compositions/effects/track/${request.track_id}`, request);
    }

    async getEffect(effectId: string): Promise<EffectInstance> {
        return this.get<EffectInstance>(`/api/compositions/effects/${effectId}`);
    }

    async updateEffect(effectId: string, request: UpdateEffectRequest): Promise<EffectInstance> {
        return this.patch<EffectInstance>(`/api/compositions/effects/${effectId}`, request);
    }

    async deleteEffect(effectId: string): Promise<{ status: string; message: string }> {
        return this.delete(`/api/compositions/effects/${effectId}`);
    }

    async moveEffect(effectId: string, request: MoveEffectRequest): Promise<EffectInstance> {
        return this.post<EffectInstance>(`/api/compositions/effects/${effectId}/move`, request);
    }

    async clearTrackEffects(trackId: string): Promise<{ status: string; message: string }> {
        return this.delete(`/api/compositions/effects/track/${trackId}/clear`);
    }
}

