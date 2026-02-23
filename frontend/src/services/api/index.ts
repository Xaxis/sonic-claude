/**
 * Unified API Client
 * Provides access to all backend API providers through a single interface
 *
 * Architecture:
 * - PROVIDERS (this file): Thin HTTP clients mapping 1:1 to backend routes
 * - CONTEXTS: React state management that calls providers directly
 */

import {
    CompositionsProvider,
    PlaybackProvider,
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
 *   await api.compositions.saveComposition(compositionId, createHistory, isAutosave);
 *   await api.compositions.createTrack({ composition_id: "123", name: "Track 1", type: "midi" });
 *
 *   // Playback
 *   await api.playback.play({ position: 0.0 });
 *   await api.playback.stop();
 *   await api.playback.setTempo({ tempo: 120 });
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
 */
export class APIClient {
    // === PROVIDERS (map 1:1 to backend API modules) ===
    public compositions: CompositionsProvider;
    public playback: PlaybackProvider;
    public mixer: MixerProvider;
    public effects: EffectsProvider;
    public audio: AudioProvider;
    public ai: AIProvider;
    public samples: SamplesProvider;

    constructor(baseURL?: string) {
        // Initialize all providers (7/7 backend API modules)
        this.compositions = new CompositionsProvider(baseURL);
        this.playback = new PlaybackProvider(baseURL);
        this.mixer = new MixerProvider(baseURL);
        this.effects = new EffectsProvider(baseURL);
        this.audio = new AudioProvider(baseURL);
        this.ai = new AIProvider(baseURL);
        this.samples = new SamplesProvider(baseURL);
    }
}

// Export singleton instance
export const api = new APIClient();

// Export providers for direct import if needed
export * from "./providers";

// Export base classes
export { BaseAPIClient, APIError } from "./base";
