/**
 * Sample Library API Client
 * Handles communication with backend sample storage API
 */

const API_BASE_URL = "http://localhost:8000/api/samples";

export interface SampleMetadata {
    id: string;
    name: string;
    category: string;
    duration: number;
    size: number;
    file_name: string;
    created_at: string;
    updated_at: string;
}

export interface SampleResponse {
    success: boolean;
    message: string;
    sample?: SampleMetadata;
}

export interface SampleListResponse {
    success: boolean;
    samples: SampleMetadata[];
    total: number;
}

/**
 * Upload a new sample to the backend
 */
export async function uploadSample(
    file: File,
    name: string,
    category: string = "Uncategorized"
): Promise<SampleMetadata> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("category", category);

    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Failed to upload sample: ${response.statusText}`);
    }

    const data: SampleResponse = await response.json();
    if (!data.success || !data.sample) {
        throw new Error(data.message || "Failed to upload sample");
    }

    return data.sample;
}

/**
 * Get all samples from the backend
 */
export async function getAllSamples(): Promise<SampleMetadata[]> {
    const response = await fetch(`${API_BASE_URL}/`);

    if (!response.ok) {
        throw new Error(`Failed to fetch samples: ${response.statusText}`);
    }

    const data: SampleListResponse = await response.json();
    if (!data.success) {
        throw new Error("Failed to fetch samples");
    }

    return data.samples;
}

/**
 * Get a single sample by ID
 */
export async function getSample(sampleId: string): Promise<SampleMetadata> {
    const response = await fetch(`${API_BASE_URL}/${sampleId}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch sample: ${response.statusText}`);
    }

    const data: SampleResponse = await response.json();
    if (!data.success || !data.sample) {
        throw new Error(data.message || "Failed to fetch sample");
    }

    return data.sample;
}

/**
 * Get the download URL for a sample
 */
export function getSampleDownloadUrl(sampleId: string): string {
    return `${API_BASE_URL}/${sampleId}/download`;
}

/**
 * Update sample metadata
 */
export async function updateSample(
    sampleId: string,
    updates: { name?: string; category?: string }
): Promise<SampleMetadata> {
    const response = await fetch(`${API_BASE_URL}/${sampleId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
    });

    if (!response.ok) {
        throw new Error(`Failed to update sample: ${response.statusText}`);
    }

    const data: SampleResponse = await response.json();
    if (!data.success || !data.sample) {
        throw new Error(data.message || "Failed to update sample");
    }

    return data.sample;
}

/**
 * Update sample duration (called after decoding audio)
 */
export async function updateSampleDuration(
    sampleId: string,
    duration: number
): Promise<SampleMetadata> {
    const formData = new FormData();
    formData.append("duration", duration.toString());

    const response = await fetch(`${API_BASE_URL}/${sampleId}/duration`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Failed to update duration: ${response.statusText}`);
    }

    const data: SampleResponse = await response.json();
    if (!data.success || !data.sample) {
        throw new Error(data.message || "Failed to update duration");
    }

    return data.sample;
}



/**
 * Delete a sample
 */
export async function deleteSample(sampleId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${sampleId}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        throw new Error(`Failed to delete sample: ${response.statusText}`);
    }

    const data: SampleResponse = await response.json();
    if (!data.success) {
        throw new Error(data.message || "Failed to delete sample");
    }
}

