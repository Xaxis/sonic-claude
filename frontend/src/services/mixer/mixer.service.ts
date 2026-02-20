/**
 * Mixer Service - API client for mixer operations
 *
 * Handles all HTTP requests to the mixer backend API.
 * Follows the same pattern as sequencer.service.ts
 */

import { apiConfig } from "@/config/api.config";
import type {
    MixerChannel,
    MasterChannel,
    CreateChannelRequest,
    UpdateChannelRequest,
    UpdateMasterRequest,
} from "@/modules/mixer/types";

const BASE_URL = apiConfig.getURL(apiConfig.endpoints.api.mixer);

class MixerService {
    // ========================================================================
    // CHANNELS
    // ========================================================================

    async getChannels(): Promise<MixerChannel[]> {
        const response = await fetch(`${BASE_URL}/channels`);
        if (!response.ok) {
            throw new Error(`Failed to get channels: ${response.statusText}`);
        }
        return response.json();
    }

    async createChannel(request: CreateChannelRequest): Promise<MixerChannel> {
        const response = await fetch(`${BASE_URL}/channels`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error(`Failed to create channel: ${response.statusText}`);
        }
        return response.json();
    }

    async getChannel(channelId: string): Promise<MixerChannel> {
        const response = await fetch(`${BASE_URL}/channels/${channelId}`);
        if (!response.ok) {
            throw new Error(`Failed to get channel: ${response.statusText}`);
        }
        return response.json();
    }

    async updateChannel(
        channelId: string,
        request: UpdateChannelRequest
    ): Promise<MixerChannel> {
        const response = await fetch(`${BASE_URL}/channels/${channelId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error(`Failed to update channel: ${response.statusText}`);
        }
        return response.json();
    }

    async deleteChannel(channelId: string): Promise<void> {
        const response = await fetch(`${BASE_URL}/channels/${channelId}`, {
            method: "DELETE",
        });
        if (!response.ok) {
            throw new Error(`Failed to delete channel: ${response.statusText}`);
        }
    }

    // ========================================================================
    // MASTER
    // ========================================================================

    async getMaster(): Promise<MasterChannel> {
        const response = await fetch(`${BASE_URL}/master`);
        if (!response.ok) {
            throw new Error(`Failed to get master: ${response.statusText}`);
        }
        return response.json();
    }

    async updateMaster(request: UpdateMasterRequest): Promise<MasterChannel> {
        const response = await fetch(`${BASE_URL}/master`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error(`Failed to update master: ${response.statusText}`);
        }
        return response.json();
    }
}

// Export singleton instance
export const mixerService = new MixerService();

