/**
 * Unified API Client
 * Exports all service modules as a single, organized API interface
 */

import { AudioEngineService } from "../audio-engine/audio-engine.service";
import { SampleService } from "../samples/samples.service";
import { AudioInputService } from "../audio-input/audio-input.service";

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
 *
 *   // Samples
 *   const samples = await api.samples.getAll();
 *   await api.samples.upload(file, "Kick", "Drums");
 *
 *   // Audio Input
 *   await api.audioInput.setInputDevice(0, 1.0);
 *   const status = await api.audioInput.getInputStatus();
 */
export class APIClient {
    public audioEngine: AudioEngineService;
    public samples: SampleService;
    public audioInput: AudioInputService;

    constructor(baseURL?: string) {
        this.audioEngine = new AudioEngineService(baseURL);
        this.samples = new SampleService(baseURL);
        this.audioInput = new AudioInputService(baseURL);
    }
}

// Export singleton instance
export const api = new APIClient();

// Export individual services for direct import if needed
export { AudioEngineService } from "../audio-engine/audio-engine.service";
export { SampleService } from "../samples/samples.service";
export { AudioInputService } from "../audio-input/audio-input.service";
export { BaseAPIClient, APIError } from "./base";
