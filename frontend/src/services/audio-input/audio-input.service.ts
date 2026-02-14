/**
 * Audio Input Service
 * Manages audio input device selection for SuperCollider
 */

import { BaseAPIClient } from "../api/base";

export interface SetInputDeviceRequest {
    device_index: number;
    amp?: number;
}

export interface SetInputGainRequest {
    amp: number;
}

export interface AudioInputStatus {
    is_active: boolean;
    current_device: number | null;
}

export class AudioInputService extends BaseAPIClient {
    // ========================================================================
    // AUDIO INPUT ROUTES
    // ========================================================================

    /**
     * Set the audio input device for SuperCollider
     */
    async setInputDevice(deviceIndex: number, amp: number = 1.0): Promise<void> {
        return this.post("/audio-engine/audio/input/device", {
            device_index: deviceIndex,
            amp: amp,
        });
    }

    /**
     * Stop audio input
     */
    async stopInput(): Promise<void> {
        return this.post("/audio-engine/audio/input/stop");
    }

    /**
     * Set input gain
     */
    async setInputGain(amp: number): Promise<void> {
        return this.post("/audio-engine/audio/input/gain", { amp });
    }

    /**
     * Get current audio input status
     */
    async getInputStatus(): Promise<AudioInputStatus> {
        return this.get("/audio-engine/audio/input/status");
    }
}

// Export singleton instance
export const audioInputService = new AudioInputService();

