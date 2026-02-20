/**
 * Unified API Client
 * Provides access to all backend API providers through a single interface
 *
 * Architecture:
 * - PROVIDERS (this file): Thin HTTP clients mapping 1:1 to backend routes
 * - SERVICES: Business logic that orchestrates multiple providers
 * - CONTEXTS: React state management that calls services
 */

import { AudioEngineService } from "../audio-engine/audio-engine.service";
import { SampleService } from "../samples/samples.service";
import { AudioInputService } from "../audio-input/audio-input.service";
import {
    CompositionsProvider,
    SequencerProvider,
    MixerProvider,
    EffectsProvider,
    AudioProvider,
    AIProvider,
    SamplesProvider,
} from "./providers";

/**
 * Main API Client
 * Provides access to all backend API providers through a unified interface
 *
 * Usage:
 *   import { api } from "@/services/api";
 *
 *   // Compositions
 *   await api.compositions.loadAll();
 *   await api.compositions.save({ sequence_id: "123", name: "My Song" });
 *
 *   // Sequencer
 *   const sequences = await api.sequencer.getSequences();
 *   await api.sequencer.play(sequenceId);
 *
 *   // Mixer
 *   const channels = await api.mixer.getChannels();
 *   await api.mixer.updateChannel(channelId, { volume: 0.8 });
 *
 *   // Effects
 *   const effects = await api.effects.getDefinitions();
 *   await api.effects.addEffect({ track_id: "123", effect_name: "reverb" });
 *
 *   // Samples
 *   const samples = await api.samples.getAll();
 *   await api.samples.upload(file, "Kick", "Drums");
 *
 *   // Audio (legacy - kept for backward compatibility)
 *   const synths = await api.audioEngine.getSynthDefs();
 *   await api.audioInput.setInputDevice(0, 1.0);
 */
export class APIClient {
    // === NEW PROVIDERS (map 1:1 to backend API modules) ===
    public compositions: CompositionsProvider;
    public sequencer: SequencerProvider;
    public mixer: MixerProvider;
    public effects: EffectsProvider;
    public audio: AudioProvider;
    public ai: AIProvider;
    public samples: SamplesProvider;

    // === LEGACY SERVICES (kept for backward compatibility) ===
    public audioEngine: AudioEngineService;
    public audioInput: AudioInputService;
    public samplesLegacy: SampleService;

    constructor(baseURL?: string) {
        // New providers (7/7 backend API modules)
        this.compositions = new CompositionsProvider(baseURL);
        this.sequencer = new SequencerProvider(baseURL);
        this.mixer = new MixerProvider(baseURL);
        this.effects = new EffectsProvider(baseURL);
        this.audio = new AudioProvider(baseURL);
        this.ai = new AIProvider(baseURL);
        this.samples = new SamplesProvider(baseURL);

        // Legacy services (to be refactored)
        this.audioEngine = new AudioEngineService(baseURL);
        this.audioInput = new AudioInputService(baseURL);
        this.samplesLegacy = new SampleService(baseURL);
    }
}

// Export singleton instance
export const api = new APIClient();

// Export providers for direct import if needed
export * from "./providers";

// Export legacy services for backward compatibility
export { AudioEngineService } from "../audio-engine/audio-engine.service";
export { SampleService } from "../samples/samples.service";
export { AudioInputService } from "../audio-input/audio-input.service";

// Export base classes
export { BaseAPIClient, APIError } from "./base";
