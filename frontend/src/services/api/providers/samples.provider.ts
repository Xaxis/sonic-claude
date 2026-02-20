/**
 * Samples API Provider
 * Thin HTTP client mapping to /api/samples/* routes
 * 
 * Backend routes:
 * - POST   /api/samples/upload                          (crud.py)
 * - GET    /api/samples/                                (crud.py)
 * - GET    /api/samples/{sample_id}                     (crud.py)
 * - GET    /api/samples/{sample_id}/download            (crud.py)
 * - PATCH  /api/samples/{sample_id}                     (crud.py)
 * - DELETE /api/samples/{sample_id}                     (crud.py)
 * - POST   /api/samples/{sample_id}/duration            (metadata.py)
 */

import { BaseAPIClient } from "../base";

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

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

export interface UpdateSampleRequest {
    name?: string;
    category?: string;
}

export interface UpdateDurationRequest {
    duration: number;
}

// ============================================================================
// SAMPLES PROVIDER (HTTP CLIENT ONLY - NO BUSINESS LOGIC)
// ============================================================================

export class SamplesProvider extends BaseAPIClient {
    // === CRUD ===
    async upload(file: File, name: string, category: string = "Uncategorized"): Promise<SampleResponse> {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", name);
        formData.append("category", category);

        // Use fetch directly for FormData (BaseAPIClient doesn't handle it)
        const response = await fetch(this.getURL("/api/samples/upload"), {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Upload failed");
        }

        return response.json();
    }

    async getAll(): Promise<SampleListResponse> {
        return this.get("/api/samples/");
    }

    async getById(sampleId: string): Promise<SampleResponse> {
        return this.get(`/api/samples/${sampleId}`);
    }

    async download(sampleId: string): Promise<Blob> {
        // Use fetch directly for blob response
        const response = await fetch(this.getURL(`/api/samples/${sampleId}/download`));
        if (!response.ok) {
            throw new Error("Download failed");
        }
        return response.blob();
    }

    async update(sampleId: string, request: UpdateSampleRequest): Promise<SampleResponse> {
        // Convert to query params for PATCH
        const params = new URLSearchParams();
        if (request.name !== undefined) params.append("name", request.name);
        if (request.category !== undefined) params.append("category", request.category);
        
        return this.patch(`/api/samples/${sampleId}?${params.toString()}`, {});
    }

    async delete(sampleId: string): Promise<{ success: boolean; message: string }> {
        return this.delete(`/api/samples/${sampleId}`);
    }

    // === METADATA ===
    async updateDuration(sampleId: string, duration: number): Promise<SampleResponse> {
        const formData = new FormData();
        formData.append("duration", duration.toString());

        // Use fetch directly for FormData
        const response = await fetch(this.getURL(`/api/samples/${sampleId}/duration`), {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Update duration failed");
        }

        return response.json();
    }
}

