/**
 * AudioEngine - Web Audio API service for advanced sample playback
 * Handles pan, attack/release envelopes, reverse playback, and gate mode
 */

interface PlaybackOptions {
    volume: number;
    pitch: number;
    pan: number;
    attack: number;
    release: number;
    playbackMode: string;
    masterVolume: number;
}

export class AudioEngine {
    private audioContext: AudioContext;
    private activeSources: Map<string, {
        source: AudioBufferSourceNode;
        gainNode: GainNode;
        panNode: StereoPannerNode;
        startTime: number;
    }> = new Map();
    private audioBuffers: Map<string, AudioBuffer> = new Map();

    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    /**
     * Load and cache an audio buffer from URL
     */
    async loadAudio(sampleId: string, url: string): Promise<AudioBuffer> {
        // Return cached buffer if available
        if (this.audioBuffers.has(sampleId)) {
            return this.audioBuffers.get(sampleId)!;
        }

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioBuffers.set(sampleId, audioBuffer);
            return audioBuffer;
        } catch (error) {
            console.error("Failed to load audio:", error);
            throw error;
        }
    }

    /**
     * Play a sample with all parameters
     */
    async play(
        padId: string,
        sampleId: string,
        url: string,
        options: PlaybackOptions
    ): Promise<void> {
        // Stop existing playback for this pad
        this.stop(padId);

        try {
            // Load audio buffer
            const audioBuffer = await this.loadAudio(sampleId, url);

            // Create source node
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;

            // Apply pitch (playback rate)
            const pitchRate = Math.pow(2, options.pitch / 12);
            source.playbackRate.value = pitchRate;

            // Handle reverse playback
            if (options.playbackMode === "reverse") {
                // Reverse the buffer
                const reversedBuffer = this.reverseBuffer(audioBuffer);
                source.buffer = reversedBuffer;
            }

            // Handle loop mode
            if (options.playbackMode === "loop") {
                source.loop = true;
            }

            // Create gain node for volume and envelope
            const gainNode = this.audioContext.createGain();
            const finalVolume = options.volume * options.masterVolume;

            // Create pan node
            const panNode = this.audioContext.createStereoPanner();
            panNode.pan.value = options.pan;

            // Connect nodes: source -> gain -> pan -> destination
            source.connect(gainNode);
            gainNode.connect(panNode);
            panNode.connect(this.audioContext.destination);

            // Apply attack envelope
            const now = this.audioContext.currentTime;
            if (options.attack > 0) {
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(finalVolume, now + options.attack);
            } else {
                gainNode.gain.setValueAtTime(finalVolume, now);
            }

            // Store active source
            this.activeSources.set(padId, {
                source,
                gainNode,
                panNode,
                startTime: now,
            });

            // Handle playback end
            source.onended = () => {
                if (options.playbackMode !== "loop" && options.playbackMode !== "toggle") {
                    this.activeSources.delete(padId);
                }
            };

            // Start playback
            source.start(0);
        } catch (error) {
            console.error("Failed to play audio:", error);
            throw error;
        }
    }

    /**
     * Stop playback with release envelope
     */
    stop(padId: string, release: number = 0): void {
        const active = this.activeSources.get(padId);
        if (!active) return;

        const now = this.audioContext.currentTime;

        if (release > 0) {
            // Apply release envelope
            active.gainNode.gain.cancelScheduledValues(now);
            active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, now);
            active.gainNode.gain.linearRampToValueAtTime(0, now + release);

            // Stop source after release
            active.source.stop(now + release);
        } else {
            // Stop immediately
            active.source.stop();
        }

        this.activeSources.delete(padId);
    }

    /**
     * Check if a pad is currently playing
     */
    isPlaying(padId: string): boolean {
        return this.activeSources.has(padId);
    }

    /**
     * Update volume for active playback
     */
    setVolume(padId: string, volume: number, masterVolume: number): void {
        const active = this.activeSources.get(padId);
        if (active) {
            const finalVolume = volume * masterVolume;
            active.gainNode.gain.setValueAtTime(finalVolume, this.audioContext.currentTime);
        }
    }

    /**
     * Update pan for active playback
     */
    setPan(padId: string, pan: number): void {
        const active = this.activeSources.get(padId);
        if (active) {
            active.panNode.pan.setValueAtTime(pan, this.audioContext.currentTime);
        }
    }

    /**
     * Reverse an audio buffer
     */
    private reverseBuffer(buffer: AudioBuffer): AudioBuffer {
        const reversedBuffer = this.audioContext.createBuffer(
            buffer.numberOfChannels,
            buffer.length,
            buffer.sampleRate
        );

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            const reversedData = reversedBuffer.getChannelData(channel);
            for (let i = 0; i < buffer.length; i++) {
                reversedData[i] = channelData[buffer.length - 1 - i];
            }
        }

        return reversedBuffer;
    }

    /**
     * Clear cached audio buffers
     */
    clearCache(): void {
        this.audioBuffers.clear();
    }

    /**
     * Stop all active playback
     */
    stopAll(): void {
        this.activeSources.forEach((_, padId) => this.stop(padId));
        this.activeSources.clear();
    }

    /**
     * Resume audio context (required for some browsers)
     */
    async resume(): Promise<void> {
        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }
    }
}

// Singleton instance
export const audioEngine = new AudioEngine();

