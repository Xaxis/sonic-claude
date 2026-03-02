/**
 * Collections API Provider
 * Thin HTTP client mapping to /api/collections/* routes
 *
 * All catalog/discovery data follows one pattern:
 *   GET /api/collections/{type} → plain array of items
 *
 * Backend routes:
 * - GET /api/collections/synthdefs  (discovery.py)
 * - GET /api/collections/drumkits   (discovery.py)
 * - GET /api/collections/samples    (discovery.py)
 */

import { BaseAPIClient } from "../base";
import type { SynthDefInfo } from "./audio.provider";
import type { SampleMetadata } from "./samples.provider";

// ============================================================================
// TYPES
// ============================================================================

export interface DrumKitPad {
    synthdef: string;
    params: Record<string, number>;
}

export interface DrumKitInfo {
    id: string;
    name: string;
    category: string;
    description: string;
    pads: Record<number, DrumKitPad>;
}

export type CollectionKey = "synthdefs" | "drumkits" | "samples";

// Re-export so consumers can import from one place
export type { SynthDefInfo, SampleMetadata };

// ============================================================================
// PROVIDER
// ============================================================================

export class CollectionsProvider extends BaseAPIClient {
    async synthdefs(): Promise<SynthDefInfo[]> {
        const response = await this.get("/api/collections/synthdefs");
        return Array.isArray(response) ? response : [];
    }

    async drumkits(): Promise<DrumKitInfo[]> {
        const response = await this.get("/api/collections/drumkits");
        return Array.isArray(response) ? response : [];
    }

    async samples(): Promise<SampleMetadata[]> {
        const response = await this.get("/api/collections/samples");
        return Array.isArray(response) ? response : [];
    }
}
