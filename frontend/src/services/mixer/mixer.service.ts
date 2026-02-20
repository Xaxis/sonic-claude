/**
 * Mixer Service - API client for mixer operations
 *
 * Handles all HTTP requests to the mixer backend API.
 * Extends BaseAPIClient for consistent error handling and request management.
 */

import { BaseAPIClient } from "../api/base";
import type {
    MixerChannel,
    MasterChannel,
    CreateChannelRequest,
    UpdateChannelRequest,
    UpdateMasterRequest,
} from "@/modules/mixer/types";

export class MixerService extends BaseAPIClient {
    // ========================================================================
    // CHANNELS
    // ========================================================================

    async getChannels(): Promise<MixerChannel[]> {
        return this.get("/api/mixer/channels");
    }

    async createChannel(request: CreateChannelRequest): Promise<MixerChannel> {
        return this.post("/api/mixer/channels", request);
    }

    async getChannel(channelId: string): Promise<MixerChannel> {
        return this.get(`/api/mixer/channels/${channelId}`);
    }

    async updateChannel(
        channelId: string,
        request: UpdateChannelRequest
    ): Promise<MixerChannel> {
        return this.patch(`/api/mixer/channels/${channelId}`, request);
    }

    async deleteChannel(channelId: string): Promise<void> {
        return this.delete(`/api/mixer/channels/${channelId}`);
    }

    // ========================================================================
    // MASTER
    // ========================================================================

    async getMaster(): Promise<MasterChannel> {
        return this.get("/api/mixer/master");
    }

    async updateMaster(request: UpdateMasterRequest): Promise<MasterChannel> {
        return this.patch("/api/mixer/master", request);
    }
}

// Export singleton instance
export const mixerService = new MixerService();

