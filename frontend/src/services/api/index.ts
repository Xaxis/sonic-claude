/**
 * Unified API Client
 * Exports all service modules as a single, organized API interface
 */

import { AudioEngineService } from "./audio-engine.service";

/**
 * Main API Client
 * Provides access to all backend services through a unified interface
 *
 * Usage:
 *   import { api } from "@/services/api";
 *
 *   // Audio Engine
 *   const synths = await api.audioEngine.getSynthDefs();
 *   const track = await api.audioEngine.createTrack({ name: "Drums" });
 */
export class APIClient {
    public audioEngine: AudioEngineService;

    constructor(baseURL?: string) {
        this.audioEngine = new AudioEngineService(baseURL);
    }
}

// Export singleton instance
export const api = new APIClient();

// Export individual services for direct import if needed
export { AudioEngineService } from "./audio-engine.service";
export { BaseAPIClient, APIError } from "./base";
