/**
 * Effects Service
 * 
 * Handles all effects-related API calls
 * Follows the same pattern as audio-engine.service.ts
 */

import { BaseAPIClient } from "../api/base";
import type {
    EffectDefinition,
    EffectInstance,
    TrackEffectChain,
    CreateEffectRequest,
    UpdateEffectRequest,
    MoveEffectRequest,
    EffectListResponse,
    TrackEffectChainResponse,
} from "./effects.types";

export class EffectsService extends BaseAPIClient {
    // ========================================================================
    // EFFECT DEFINITIONS ROUTES
    // ========================================================================

    /**
     * Get all available effect definitions
     */
    async getEffectDefinitions(): Promise<EffectDefinition[]> {
        const response = await this.get<EffectListResponse>("/audio-engine/audio/effects/definitions");
        return response.effects;
    }

    /**
     * Get all effect categories
     */
    async getEffectCategories(): Promise<string[]> {
        return this.get<string[]>("/audio-engine/audio/effects/categories");
    }

    /**
     * Get effects by category
     */
    async getEffectsByCategory(category: string): Promise<EffectDefinition[]> {
        const response = await this.get<EffectListResponse>(`/audio-engine/audio/effects/categories/${category}`);
        return response.effects;
    }

    // ========================================================================
    // TRACK EFFECTS ROUTES
    // ========================================================================

    /**
     * Get effect chain for a track
     */
    async getTrackEffectChain(trackId: string): Promise<TrackEffectChain> {
        return this.get<TrackEffectChain>(`/audio-engine/audio/effects/track/${trackId}`);
    }

    /**
     * Create effect on track
     */
    async createEffect(trackId: string, request: CreateEffectRequest): Promise<EffectInstance> {
        return this.post<EffectInstance>(`/audio-engine/audio/effects/track/${trackId}`, request);
    }

    /**
     * Get effect instance by ID
     */
    async getEffect(effectId: string): Promise<EffectInstance> {
        return this.get<EffectInstance>(`/audio-engine/audio/effects/${effectId}`);
    }

    /**
     * Update effect parameters or state
     */
    async updateEffect(effectId: string, request: UpdateEffectRequest): Promise<EffectInstance> {
        return this.patch<EffectInstance>(`/audio-engine/audio/effects/${effectId}`, request);
    }

    /**
     * Delete effect
     */
    async deleteEffect(effectId: string): Promise<{ status: string; message: string }> {
        return this.delete(`/audio-engine/audio/effects/${effectId}`);
    }

    /**
     * Move effect to different slot
     */
    async moveEffect(effectId: string, request: MoveEffectRequest): Promise<EffectInstance> {
        return this.post<EffectInstance>(`/audio-engine/audio/effects/${effectId}/move`, request);
    }

    /**
     * Clear all effects from track
     */
    async clearTrackEffects(trackId: string): Promise<{ status: string; message: string }> {
        return this.delete(`/audio-engine/audio/effects/track/${trackId}/clear`);
    }

    // ========================================================================
    // CONVENIENCE METHODS
    // ========================================================================

    /**
     * Update single effect parameter
     */
    async updateEffectParameter(effectId: string, parameterName: string, value: number): Promise<EffectInstance> {
        return this.updateEffect(effectId, {
            parameters: { [parameterName]: value },
        });
    }

    /**
     * Toggle effect bypass
     */
    async toggleEffectBypass(effectId: string, bypassed: boolean): Promise<EffectInstance> {
        return this.updateEffect(effectId, {
            is_bypassed: bypassed,
        });
    }
}

// Export singleton instance
export const effectsService = new EffectsService();

