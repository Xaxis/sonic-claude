/**
 * Mixer API Provider
 * Thin HTTP client mapping to /api/mixer/* routes
 * 
 * Backend routes:
 * - GET    /api/mixer/channels                           (channels.py)
 * - POST   /api/mixer/channels                           (channels.py)
 * - GET    /api/mixer/channels/{id}                      (channels.py)
 * - PATCH  /api/mixer/channels/{id}                      (channels.py)
 * - DELETE /api/mixer/channels/{id}                      (channels.py)
 * - GET    /api/mixer/master                             (master.py)
 * - PATCH  /api/mixer/master                             (master.py)
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
    volume?: number;
    pan?: number;
    muted?: boolean;
    soloed?: boolean;
}

export interface UpdateMasterRequest {
    volume?: number;
    muted?: boolean;
}

// ============================================================================
// MIXER PROVIDER (HTTP CLIENT ONLY - NO BUSINESS LOGIC)
// ============================================================================

export class MixerProvider extends BaseAPIClient {
    // === CHANNELS ===
    async getChannels(): Promise<any[]> {
        return this.get("/api/mixer/channels");
    }

    async createChannel(request: CreateChannelRequest): Promise<any> {
        return this.post("/api/mixer/channels", request);
    }

    async getChannel(id: string): Promise<any> {
        return this.get(`/api/mixer/channels/${id}`);
    }

    async updateChannel(id: string, request: UpdateChannelRequest): Promise<any> {
        return this.patch(`/api/mixer/channels/${id}`, request);
    }

    async deleteChannel(id: string): Promise<any> {
        return this.delete(`/api/mixer/channels/${id}`);
    }

    // === MASTER ===
    async getMaster(): Promise<any> {
        return this.get("/api/mixer/master");
    }

    async updateMaster(request: UpdateMasterRequest): Promise<any> {
        return this.patch("/api/mixer/master", request);
    }
}

