/**
 * Compositions API Provider
 * Thin HTTP client mapping to /api/compositions/* routes
 * 
 * Backend routes:
 * - POST   /api/compositions/load-all                    (startup.py)
 * - POST   /api/compositions/save                        (crud.py)
 * - GET    /api/compositions/list                        (crud.py)
 * - GET    /api/compositions/{id}                        (crud.py)
 * - GET    /api/compositions/{id}/chat-history           (crud.py)
 * - GET    /api/compositions/{id}/history                (history.py)
 * - POST   /api/compositions/{id}/restore/{version}      (history.py)
 * - POST   /api/compositions/{id}/recover-autosave       (history.py)
 */

import { BaseAPIClient } from "../base";

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface SaveCompositionRequest {
    sequence_id: string;
    name?: string;
    create_history?: boolean;
    is_autosave?: boolean;
    metadata?: Record<string, any>;
}

export interface SaveCompositionResponse {
    status: string;
    message: string;
    composition_id: string;
    history_created: boolean;
}

export interface CompositionMetadata {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface ListCompositionsResponse {
    compositions: CompositionMetadata[];
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
     * Load all saved compositions into memory on app startup
     * POST /api/compositions/load-all
     */
    async loadAll(): Promise<LoadAllCompositionsResponse> {
        return this.post("/api/compositions/load-all", {});
    }

    /**
     * Save a composition
     * POST /api/compositions/save
     */
    async save(request: SaveCompositionRequest): Promise<SaveCompositionResponse> {
        return this.post("/api/compositions/save", request);
    }

    /**
     * List all compositions
     * GET /api/compositions/list
     */
    async list(): Promise<ListCompositionsResponse> {
        return this.get("/api/compositions/list");
    }

    /**
     * Get a composition by ID
     * GET /api/compositions/{composition_id}
     */
    async getById(compositionId: string, useAutosave: boolean = false): Promise<any> {
        return this.get(`/api/compositions/${compositionId}`, { use_autosave: useAutosave });
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

