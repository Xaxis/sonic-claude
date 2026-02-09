/**
 * Samples Service
 * Handles sample recording, analysis, and synthesis
 */

import { BaseAPIClient } from "./base";
import type { Sample, SpectralFeatures, SynthesisParameters, AudioDevice } from "@/types";

export interface RecordingStatus {
    is_recording: boolean;
    current_sample_id: string | null;
    current_sample_name: string | null;
}

export interface StartRecordingRequest {
    name?: string;
    device_index?: number;
}

export interface AnalyzeRequest {
    sample_id: string;
    features: {
        spectral?: boolean;
        harmonics?: boolean;
        envelope?: boolean;
        perceptual?: boolean;
    };
}

export class SamplesService extends BaseAPIClient {
    /**
     * List all audio devices
     */
    async listAudioDevices(): Promise<AudioDevice[]> {
        return this.get("/samples/audio-devices");
    }

    /**
     * Start recording
     */
    async startRecording(request?: StartRecordingRequest): Promise<{
        status: string;
        sample_id: string;
        name: string;
    }> {
        return this.post("/samples/record", {
            action: "start",
            ...request,
        });
    }

    /**
     * Stop recording
     */
    async stopRecording(): Promise<{ status: string; sample: Sample }> {
        return this.post("/samples/record", { action: "stop" });
    }

    /**
     * Get recording status
     */
    async getRecordingStatus(): Promise<RecordingStatus> {
        return this.get("/samples/recording/status");
    }

    /**
     * List all samples
     */
    async listSamples(): Promise<Sample[]> {
        return this.get("/samples/");
    }

    /**
     * Get sample by ID
     */
    async getSample(sampleId: string): Promise<Sample> {
        return this.get(`/samples/${sampleId}`);
    }

    /**
     * Rename sample
     */
    async renameSample(sampleId: string, newName: string): Promise<Sample> {
        return this.put(`/samples/${sampleId}/rename`, { new_name: newName });
    }

    /**
     * Delete sample
     */
    async deleteSample(sampleId: string): Promise<{ status: string; message: string }> {
        return this.delete(`/samples/${sampleId}`);
    }

    /**
     * Analyze sample spectral features
     */
    async analyzeSample(request: AnalyzeRequest): Promise<SpectralFeatures> {
        return this.post("/samples/analyze", request);
    }

    /**
     * Get synthesis parameters for sample
     */
    async getSynthesisParameters(sampleId: string): Promise<SynthesisParameters> {
        return this.get(`/samples/${sampleId}/synthesis`);
    }

    /**
     * Trigger synthesis from sample
     */
    async triggerSynthesis(sampleId: string, parameters?: Partial<SynthesisParameters>): Promise<{
        status: string;
        message: string;
    }> {
        return this.post(`/samples/${sampleId}/trigger`, parameters);
    }
}

