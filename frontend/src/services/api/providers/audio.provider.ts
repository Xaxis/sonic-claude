/**
 * Audio API Provider
 * Thin HTTP client mapping to /api/audio/* routes
 *
 * Backend routes:
 * - POST   /api/audio/synthesis/synths                  (synthesis.py)
 * - GET    /api/audio/synthesis/synths                  (synthesis.py)
 * - GET    /api/audio/synthesis/synths/{synth_id}       (synthesis.py)
 * - PUT    /api/audio/synthesis/synths/{synth_id}       (synthesis.py)
 * - DELETE /api/audio/synthesis/synths/{synth_id}       (synthesis.py)
 * - DELETE /api/audio/synthesis/synths                  (synthesis.py)
 * - POST   /api/audio/preview                           (synthesis.py)
 * - GET    /api/audio/synthdefs                         (synthesis.py)
 * - POST   /api/audio/input/device                      (input.py)
 * - POST   /api/audio/input/stop                        (input.py)
 * - POST   /api/audio/input/gain                        (input.py)
 * - GET    /api/audio/input/status                      (input.py)
 */

import { BaseAPIClient } from "../base";

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateSynthRequest {
    synthdef: string;
    params?: Record<string, number>;
    group?: number;
    bus?: number;
}

export interface SetSynthParamRequest {
    param: string;
    value: number;
}

export interface SetInputDeviceRequest {
    device_index: number;
    amp?: number;
}

export interface SetInputGainRequest {
    amp: number;
}

export interface PreviewNoteRequest {
    note: number;
    velocity?: number;
    duration?: number;
    synthdef?: string;
}

export interface SynthInfo {
    synth_id: number;
    synthdef: string;
    group: number;
    bus?: number;
}

export interface InputStatus {
    is_active: boolean;
    current_device: number | null;
}

export interface SynthDefInfo {
    name: string;
    display_name: string;
    description: string;
    category: string;
}

// ============================================================================
// AUDIO PROVIDER (HTTP CLIENT ONLY - NO BUSINESS LOGIC)
// ============================================================================

export class AudioProvider extends BaseAPIClient {
    // === SYNTHESIS ===
    async createSynth(request: CreateSynthRequest): Promise<SynthInfo> {
        return this.post("/api/audio/synthesis/synths", request);
    }

    async getActiveSynths(): Promise<SynthInfo[]> {
        return this.get("/api/audio/synthesis/synths");
    }

    async getSynth(synthId: number): Promise<SynthInfo> {
        return this.get(`/api/audio/synthesis/synths/${synthId}`);
    }

    async setSynthParam(synthId: number, request: SetSynthParamRequest): Promise<any> {
        return this.put(`/api/audio/synthesis/synths/${synthId}`, request);
    }

    async deleteSynth(synthId: number, release: boolean = true): Promise<any> {
        return this.delete(`/api/audio/synthesis/synths/${synthId}?release=${release}`);
    }

    async deleteAllSynths(): Promise<any> {
        return this.delete("/api/audio/synthesis/synths");
    }

    async previewNote(request: PreviewNoteRequest): Promise<any> {
        return this.post("/api/audio/preview", request);
    }

    async getSynthDefs(): Promise<SynthDefInfo[]> {
        const response = await this.get("/api/audio/synthdefs");
        // Backend returns array of SynthDefInfo objects directly
        return Array.isArray(response) ? response : [];
    }

    // === INPUT ===
    async setInputDevice(request: SetInputDeviceRequest): Promise<any> {
        return this.post("/api/audio/input/device", request);
    }

    async stopInput(): Promise<any> {
        return this.post("/api/audio/input/stop", {});
    }

    async setInputGain(request: SetInputGainRequest): Promise<any> {
        return this.post("/api/audio/input/gain", request);
    }

    async getInputStatus(): Promise<InputStatus> {
        return this.get("/api/audio/input/status");
    }
}

