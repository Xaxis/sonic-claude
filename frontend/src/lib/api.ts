import type { AIStatus, Sample, SpectralFeatures, SynthesisParameters } from "@/types";

const API_BASE = "http://localhost:8000";

class APIClient {
    private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options?.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
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
    async startRecording(
        name?: string
    ): Promise<{ status: string; sample_id: string; name: string }> {
        return this.request("/samples/record", {
            method: "POST",
            body: JSON.stringify({ action: "start", name }),
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
}

export const api = new APIClient();
