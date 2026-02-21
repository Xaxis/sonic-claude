/**
 * Compositions API Provider
 * Thin HTTP client mapping to /api/compositions/* routes
 *
 * A Composition is a PROJECT (like .als in Ableton, .logicx in Logic Pro).
 * It contains EVERYTHING: sequence + mixer + effects + samples.
 *
 * Backend routes:
 * - POST   /api/compositions                             (crud.py) - Create new composition
 * - GET    /api/compositions                             (crud.py) - List all compositions
 * - GET    /api/compositions/{id}                        (crud.py) - Load composition
 * - PUT    /api/compositions/{id}                        (crud.py) - Update composition metadata
 * - POST   /api/compositions/{id}/save                   (crud.py) - Save composition to disk
 * - DELETE /api/compositions/{id}                        (crud.py) - Delete composition
 * - GET    /api/compositions/{id}/chat-history           (crud.py) - Get chat history
 * - GET    /api/compositions/{id}/history                (history.py) - Get version history
 * - POST   /api/compositions/{id}/restore/{version}      (history.py) - Restore version
 * - POST   /api/compositions/{id}/recover-autosave       (history.py) - Recover autosave
 * - POST   /api/compositions/load-all                    (startup.py) - Load all on startup
 */

import { BaseAPIClient } from "../base";

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateCompositionRequest {
    name: string;
    tempo?: number;
    time_signature?: string;
}

export interface UpdateCompositionRequest {
    name?: string;
    tempo?: number;
    time_signature?: string;
}

export interface CompositionMetadata {
    id: string;
    name: string;
    tempo: number;
    time_signature: string;
    created_at: string;
    updated_at: string;
    track_count: number;
    clip_count: number;
    duration_beats: number;
    file_size_bytes: number | null;
    has_autosave: boolean;
}

export interface CompositionListResponse {
    compositions: CompositionMetadata[];
    total: number;
}

export interface CompositionCreatedResponse {
    composition_id: string;
    name: string;
    message: string;
}

export interface CompositionSavedResponse {
    composition_id: string;
    history_created: boolean;
    message: string;
}

export interface CompositionDeletedResponse {
    composition_id: string;
    message: string;
}

export interface LoadAllCompositionsResponse {
    status: string;
    message: string;
    loaded_count: number;
    first_sequence_id: string | null;
}

export interface CompositionHistoryEntry {
    version: number;
    timestamp: string;
    name: string;
}

export interface ListHistoryResponse {
    composition_id: string;
    history: CompositionHistoryEntry[];
}

export interface ChatMessage {
    role: string;
    content: string;
    timestamp: string;
}

export interface ChatHistoryResponse {
    chat_history: ChatMessage[];
}

// ============================================================================
// COMPOSITIONS PROVIDER (HTTP CLIENT ONLY - NO BUSINESS LOGIC)
// ============================================================================

export class CompositionsProvider extends BaseAPIClient {
    /**
     * Create a new composition (project)
     * POST /api/compositions/
     *
     * This is the PRIMARY way to create a new project.
     */
    async create(request: CreateCompositionRequest): Promise<CompositionCreatedResponse> {
        return this.post("/api/compositions/", request);
    }

    /**
     * List all compositions
     * GET /api/compositions/
     */
    async list(): Promise<CompositionListResponse> {
        return this.get("/api/compositions/");
    }

    /**
     * Load a composition by ID (opens the project)
     * GET /api/compositions/{composition_id}
     */
    async getById(compositionId: string, useAutosave: boolean = false): Promise<any> {
        return this.get(`/api/compositions/${compositionId}`, { use_autosave: useAutosave });
    }

    /**
     * Update composition metadata (name, tempo, time signature)
     * PUT /api/compositions/{composition_id}
     */
    async update(compositionId: string, request: UpdateCompositionRequest): Promise<any> {
        return this.put(`/api/compositions/${compositionId}`, request);
    }

    /**
     * Save composition to disk
     * POST /api/compositions/{composition_id}/save
     */
    async save(compositionId: string, createHistory: boolean = true, isAutosave: boolean = false, metadata?: any): Promise<CompositionSavedResponse> {
        return this.post(`/api/compositions/${compositionId}/save`, {
            composition_id: compositionId,
            create_history: createHistory,
            is_autosave: isAutosave,
            metadata: metadata
        });
    }

    /**
     * Delete a composition
     * DELETE /api/compositions/{composition_id}
     */
    async deleteComposition(compositionId: string): Promise<CompositionDeletedResponse> {
        return super.delete(`/api/compositions/${compositionId}`);
    }

    /**
     * Load all saved compositions into memory on app startup
     * POST /api/compositions/load-all
     */
    async loadAll(): Promise<LoadAllCompositionsResponse> {
        return this.post("/api/compositions/load-all", {});
    }

    /**
     * Get chat history for a composition
     * GET /api/compositions/{composition_id}/chat-history
     */
    async getChatHistory(compositionId: string): Promise<ChatHistoryResponse> {
        return this.get(`/api/compositions/${compositionId}/chat-history`);
    }

    /**
     * List version history for a composition
     * GET /api/compositions/{composition_id}/history
     */
    async listHistory(compositionId: string): Promise<ListHistoryResponse> {
        return this.get(`/api/compositions/${compositionId}/history`);
    }

    /**
     * Restore a specific version from history
     * POST /api/compositions/{composition_id}/restore/{version}
     */
    async restoreVersion(compositionId: string, version: number): Promise<any> {
        return this.post(`/api/compositions/${compositionId}/restore/${version}`, {});
    }

    /**
     * Recover from autosave
     * POST /api/compositions/{composition_id}/recover-autosave
     */
    async recoverFromAutosave(compositionId: string): Promise<any> {
        return this.post(`/api/compositions/${compositionId}/recover-autosave`, {});
    }
}

