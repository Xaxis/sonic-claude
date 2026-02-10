/**
 * Audio Input API Client
 * Manages audio input device selection for SuperCollider
 */

const API_BASE = "http://localhost:8000";

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

/**
 * Set the audio input device for SuperCollider
 */
export async function setInputDevice(deviceIndex: number, amp: number = 1.0): Promise<void> {
    const response = await fetch(`${API_BASE}/api/audio/input/device`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            device_index: deviceIndex,
            amp: amp,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to set input device");
    }

    return response.json();
}

/**
 * Stop audio input
 */
export async function stopInput(): Promise<void> {
    const response = await fetch(`${API_BASE}/api/audio/input/stop`, {
        method: "POST",
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to stop input");
    }

    return response.json();
}

/**
 * Set input gain
 */
export async function setInputGain(amp: number): Promise<void> {
    const response = await fetch(`${API_BASE}/api/audio/input/gain`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ amp }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to set input gain");
    }

    return response.json();
}

/**
 * Get current audio input status
 */
export async function getInputStatus(): Promise<AudioInputStatus> {
    const response = await fetch(`${API_BASE}/api/audio/input/status`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to get input status");
    }

    return response.json();
}

