/**
 * Transcription Service
 * Handles live audio transcription
 */

import { BaseAPIClient } from "./base";
import type {
    LiveTranscriptionState,
    LiveTranscriptionResult,
    StemType,
    TranscriptionSettings,
} from "@/types";

export interface StartTranscriptionRequest {
    device_index?: number;
    buffer_duration?: number;
    stems_enabled?: Record<StemType, boolean>;
}

export interface UpdateSettingsRequest {
    settings: Partial<TranscriptionSettings>;
}

export class TranscriptionService extends BaseAPIClient {
    /**
     * Get transcription state
     */
    async getState(): Promise<LiveTranscriptionState> {
        return this.get("/transcribe/state");
    }

    /**
     * Start transcription
     */
    async start(request?: StartTranscriptionRequest): Promise<{ status: string; message: string }> {
        return this.post("/transcribe/start", request);
    }

    /**
     * Stop transcription
     */
    async stop(): Promise<{ status: string }> {
        return this.post("/transcribe/stop");
    }

    /**
     * Get latest transcription result
     */
    async getResult(): Promise<LiveTranscriptionResult> {
        return this.get("/transcribe/result");
    }

    /**
     * Update transcription settings
     */
    async updateSettings(request: UpdateSettingsRequest): Promise<{ status: string; message: string }> {
        return this.put("/transcribe/settings", request);
    }

    /**
     * Send code to Sonic Pi (legacy - may be deprecated)
     */
    async sendCodeToSonicPi(code: string): Promise<{ status: string; message: string }> {
        return this.post("/transcribe/send-to-sonic-pi", { code });
    }
}

