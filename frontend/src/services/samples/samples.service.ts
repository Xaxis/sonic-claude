/**
 * Sample Service
 * Handles all sample library API calls
 * Consistent with AudioEngineService pattern
 */

import { BaseAPIClient } from "../api/base";

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

export class SampleService extends BaseAPIClient {
    // ========================================================================
    // SAMPLE ROUTES
    // ========================================================================

    /**
     * Get all samples
     */
    async getAll(): Promise<SampleMetadata[]> {
        const response = await this.get<SampleListResponse>("/api/samples/");
        return response.samples;
    }

    /**
     * Get sample by ID
     */
    async getById(sampleId: string): Promise<SampleMetadata> {
        const response = await this.get<SampleResponse>(`/api/samples/${sampleId}`);
        if (!response.success || !response.sample) {
            throw new Error(response.message || "Failed to fetch sample");
        }
        return response.sample;
    }

    /**
     * Upload a new sample
     */
    async upload(file: File, name: string, category: string = "Uncategorized"): Promise<SampleMetadata> {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", name);
        formData.append("category", category);

        // FormData requires special handling - bypass BaseAPIClient for this
        const url = `${this.baseURL}/api/samples/upload`;
        const response = await fetch(url, {
            method: "POST",
            body: formData, // Don't set Content-Type - browser will set it with boundary
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
     * Update sample duration
     */
    async updateDuration(sampleId: string, duration: number): Promise<void> {
        await this.patch(`/api/samples/${sampleId}`, { duration });
    }

    /**
     * Get download URL for a sample
     */
    getDownloadUrl(sampleId: string): string {
        return `${this.baseURL}/api/samples/${sampleId}/download`;
    }
}

// Export singleton instance
export const sampleService = new SampleService();

