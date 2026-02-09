import type {
    AIStatus, Sample, SpectralFeatures, SynthesisParameters, AudioDevice,
    LiveTranscriptionState, LiveTranscriptionResult, StemType
} from "@/types";

const API_BASE = "http://localhost:8000";

class APIClient {
    async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options?.headers,
            },
        });

        if (!response.ok) {
            let errorMessage = response.statusText;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch {
                // If response is not JSON, use statusText
            }
            throw new Error(`API Error: ${errorMessage}`);
        }

        return response.json();
    }

    // AI Agent
    async getAIStatus(): Promise<AIStatus> {
        return this.request<AIStatus>("/ai/status");
    }

    async toggleAI(): Promise<{ enabled: boolean }> {
        return this.request("/ai/toggle", { method: "POST" });
    }

    async sendChat(
        message: string,
        spectralData?: any
    ): Promise<{ response: string; reasoning: string }> {
        return this.request("/chat", {
            method: "POST",
            body: JSON.stringify({
                message,
                spectral_data: spectralData,
            }),
        });
    }

    // OSC Control
    async sendOSC(parameter: string, value: number | string): Promise<void> {
        await this.request("/osc/send", {
            method: "POST",
            body: JSON.stringify({ parameter, value }),
        });
    }

    // Transport
    async play(): Promise<void> {
        await this.sendOSC("transport", "play");
    }

    async stop(): Promise<void> {
        await this.sendOSC("transport", "stop");
    }

    // Parameters
    async setBPM(bpm: number): Promise<void> {
        await this.sendOSC("bpm", bpm);
    }

    async setIntensity(intensity: number): Promise<void> {
        await this.sendOSC("intensity", intensity);
    }

    async setCutoff(cutoff: number): Promise<void> {
        await this.sendOSC("cutoff", cutoff);
    }

    async setReverb(reverb: number): Promise<void> {
        await this.sendOSC("reverb", reverb);
    }

    async setEcho(echo: number): Promise<void> {
        await this.sendOSC("echo", echo);
    }

    async setKey(key: string): Promise<void> {
        await this.sendOSC("key", key);
    }

    async setScale(scale: string): Promise<void> {
        await this.sendOSC("scale", scale);
    }

    // Sample Recording
    async listAudioDevices(): Promise<AudioDevice[]> {
        return this.request<AudioDevice[]>("/samples/audio-devices");
    }

    async startRecording(
        name?: string,
        deviceIndex?: number
    ): Promise<{ status: string; sample_id: string; name: string }> {
        return this.request("/samples/record", {
            method: "POST",
            body: JSON.stringify({
                action: "start",
                name,
                device_index: deviceIndex
            }),
        });
    }

    async stopRecording(): Promise<{ status: string; sample: Sample }> {
        return this.request("/samples/record", {
            method: "POST",
            body: JSON.stringify({ action: "stop" }),
        });
    }

    async getRecordingStatus(): Promise<{
        is_recording: boolean;
        current_sample_id: string | null;
        current_sample_name: string | null;
    }> {
        return this.request("/samples/recording/status");
    }

    async listSamples(): Promise<Sample[]> {
        return this.request<Sample[]>("/samples/");
    }

    async getSample(sampleId: string): Promise<Sample> {
        return this.request<Sample>(`/samples/${sampleId}`);
    }

    async renameSample(
        sampleId: string,
        newName: string
    ): Promise<{ status: string; sample: Sample }> {
        return this.request(`/samples/${sampleId}/rename`, {
            method: "PUT",
            body: JSON.stringify({ sample_id: sampleId, new_name: newName }),
        });
    }

    async deleteSample(sampleId: string): Promise<{ status: string; sample_id: string }> {
        return this.request(`/samples/${sampleId}`, {
            method: "DELETE",
        });
    }

    async analyzeSample(sampleId: string): Promise<SpectralFeatures> {
        return this.request<SpectralFeatures>(`/samples/${sampleId}/analyze`, {
            method: "POST",
        });
    }

    async synthesizeSample(sampleId: string): Promise<SynthesisParameters> {
        return this.request<SynthesisParameters>(`/samples/${sampleId}/synthesize`, {
            method: "POST",
        });
    }

    // Live Transcription
    async getAudioDevices(): Promise<AudioDevice[]> {
        return this.request<AudioDevice[]>("/samples/audio-devices");
    }

    async getTranscriptionStatus(): Promise<LiveTranscriptionState> {
        return this.request<LiveTranscriptionState>("/transcribe/status");
    }

    async startTranscription(params: {
        device_index?: number;
        buffer_duration?: number;
        stems_enabled?: Record<string, boolean>;
        auto_send?: boolean;
    }): Promise<{ status: string; device_name: string; buffer_duration: number }> {
        return this.request("/transcribe/start", {
            method: "POST",
            body: JSON.stringify({
                action: "start",
                ...params,
            }),
        });
    }

    async stopTranscription(): Promise<{ status: string }> {
        return this.request("/transcribe/stop", {
            method: "POST",
        });
    }

    async sendCodeToSonicPi(code: string): Promise<{ status: string; message: string }> {
        return this.request("/transcribe/send-to-sonic-pi", {
            method: "POST",
            body: JSON.stringify({ code }),
        });
    }

    // Timeline/Sequencer
    async createSequence(name: string, tempo: number = 120, timeSignature: string = "4/4"): Promise<TimelineSequence> {
        return this.request("/timeline/sequences", {
            method: "POST",
            body: JSON.stringify({ name, tempo, time_signature: timeSignature }),
        });
    }

    async getSequence(sequenceId: string): Promise<TimelineSequence> {
        return this.request(`/timeline/sequences/${sequenceId}`);
    }

    async playSequence(sequenceId: string): Promise<{ status: string; code: string }> {
        return this.request(`/timeline/sequences/${sequenceId}/play`, {
            method: "POST",
        });
    }

    async stopSequence(sequenceId: string): Promise<{ status: string }> {
        return this.request(`/timeline/sequences/${sequenceId}/stop`, {
            method: "POST",
        });
    }

    async updateSequence(sequenceId: string, sequence: TimelineSequence): Promise<TimelineSequence> {
        return this.request(`/timeline/sequences/${sequenceId}`, {
            method: "PUT",
            body: JSON.stringify(sequence),
        });
    }

    async listSequences(): Promise<TimelineSequence[]> {
        return this.request("/timeline/sequences");
    }

    async deleteSequence(sequenceId: string): Promise<{ status: string; sequence_id: string }> {
        return this.request(`/timeline/sequences/${sequenceId}`, {
            method: "DELETE",
        });
    }

    async addTrack(sequenceId: string, name: string, instrument: string = "piano"): Promise<Track> {
        return this.request(`/timeline/sequences/${sequenceId}/tracks`, {
            method: "POST",
            body: JSON.stringify({ sequence_id: sequenceId, name, instrument }),
        });
    }

    async addClip(sequenceId: string, trackId: string, name: string, startTime: number, duration: number, midiEvents: MIDIEvent[] = []): Promise<Clip> {
        return this.request(`/timeline/sequences/${sequenceId}/clips`, {
            method: "POST",
            body: JSON.stringify({
                sequence_id: sequenceId,
                track_id: trackId,
                name,
                start_time: startTime,
                duration,
                midi_events: midiEvents,
            }),
        });
    }

    async updateClip(sequenceId: string, clipId: string, updates: Partial<Clip>): Promise<Clip> {
        return this.request(`/timeline/sequences/${sequenceId}/clips/${clipId}`, {
            method: "PUT",
            body: JSON.stringify({ sequence_id: sequenceId, clip_id: clipId, ...updates }),
        });
    }

    async deleteClip(sequenceId: string, clipId: string): Promise<{ status: string; clip_id: string }> {
        return this.request(`/timeline/sequences/${sequenceId}/clips/${clipId}`, {
            method: "DELETE",
        });
    }
}

export const api = new APIClient();
