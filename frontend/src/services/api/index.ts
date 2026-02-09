/**
 * Unified API Client
 * Exports all service modules as a single, organized API interface
 */

import { AudioEngineService } from "./audio-engine.service";
import { AIService } from "./ai.service";
import { SamplesService } from "./samples.service";
import { TranscriptionService } from "./transcription.service";

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
 *   // AI Agent
 *   const status = await api.ai.getStatus();
 *   const response = await api.ai.chat({ message: "Make it darker" });
 *   
 *   // Samples
 *   const samples = await api.samples.listSamples();
 *   await api.samples.startRecording({ name: "My Sample" });
 *   
 *   // Transcription
 *   await api.transcription.start({ device_index: 0 });
 *   const result = await api.transcription.getResult();
 */
export class APIClient {
    public audioEngine: AudioEngineService;
    public ai: AIService;
    public samples: SamplesService;
    public transcription: TranscriptionService;

    constructor(baseURL?: string) {
        this.audioEngine = new AudioEngineService(baseURL);
        this.ai = new AIService(baseURL);
        this.samples = new SamplesService(baseURL);
        this.transcription = new TranscriptionService(baseURL);
    }
}

// Export singleton instance
export const api = new APIClient();

// Export individual services for direct import if needed
export { AudioEngineService } from "./audio-engine.service";
export { AIService } from "./ai.service";
export { SamplesService } from "./samples.service";
export { TranscriptionService } from "./transcription.service";
export { BaseAPIClient, APIError } from "./base";

