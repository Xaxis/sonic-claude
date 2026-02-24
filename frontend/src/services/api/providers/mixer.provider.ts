/**
 * Mixer API Provider
 * Thin HTTP client mapping to /api/compositions/mixer/* routes
 *
 * Backend routes (backend/api/compositions/mixers.py):
 * - GET    /api/compositions/mixer/channels
 * - POST   /api/compositions/mixer/channels
 * - GET    /api/compositions/mixer/channels/{id}
 * - PATCH  /api/compositions/mixer/channels/{id}
 * - DELETE /api/compositions/mixer/channels/{id}
 * - GET    /api/compositions/mixer/master
 * - PATCH  /api/compositions/mixer/master
 */

import { BaseAPIClient } from "../base";

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateChannelRequest {
    track_id: string;
    name: string;
    channel_type?: string;
}

export interface UpdateChannelRequest {
    name?: string;
    color?: string;
    input_gain?: number;
    pan?: number;
    fader?: number;
    mute?: boolean;
    solo?: boolean;
    phase_invert?: boolean;
    output_bus?: string;
}

export interface UpdateMasterRequest {
    fader?: number;
    mute?: boolean;
    limiter_enabled?: boolean;
    limiter_threshold?: number;
}

// ============================================================================
// MIXER PROVIDER (HTTP CLIENT ONLY - NO BUSINESS LOGIC)
// ============================================================================

export class MixerProvider extends BaseAPIClient {
    // === CHANNELS ===
    async getChannels(): Promise<any[]> {
        return this.get("/api/compositions/mixers/channels");
    }

    async createChannel(request: CreateChannelRequest): Promise<any> {
        return this.post("/api/compositions/mixers/channels", request);
    }

    async getChannel(id: string): Promise<any> {
        return this.get(`/api/compositions/mixers/channels/${id}`);
    }

    async updateChannel(id: string, request: UpdateChannelRequest): Promise<any> {
        return this.patch(`/api/compositions/mixers/channels/${id}`, request);
    }

    async deleteChannel(id: string): Promise<any> {
        return this.delete(`/api/compositions/mixers/channels/${id}`);
    }

    // === MASTER ===
    async getMaster(): Promise<any> {
        return this.get("/api/compositions/mixers/master");
    }

    async updateMaster(request: UpdateMasterRequest): Promise<any> {
        return this.patch("/api/compositions/mixers/master", request);
    }
}

