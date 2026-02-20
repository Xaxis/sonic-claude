/**
 * AI API Provider
 * Thin HTTP client mapping to /api/ai/* routes
 * 
 * Backend routes:
 * - POST   /api/ai/chat                                 (chat.py)
 * - POST   /api/ai/state                                (state.py)
 * - GET    /api/ai/context                              (state.py)
 * - POST   /api/ai/action                               (actions.py)
 * - POST   /api/ai/actions/batch                        (actions.py)
 */

import { BaseAPIClient } from "../base";

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface ChatRequest {
    message: string;
    stream?: boolean;
}

export interface ChatResponse {
    response: string;
    actions_executed?: any[];
    musical_context?: string | null;
}

export interface GetStateRequest {
    detail?: {
        include_clips?: boolean;
        include_notes?: boolean;
        include_audio_analysis?: boolean;
        include_musical_analysis?: boolean;
        max_clips?: number | null;
        max_notes_per_clip?: number | null;
    };
    previous_hash?: string | null;
}

export interface GetStateResponse {
    full_state: any;
    diff?: any;
    hash: string;
}

export interface DAWAction {
    action_type: string;
    parameters: Record<string, any>;
}

export interface ActionResult {
    success: boolean;
    error?: string;
    result?: any;
}

export interface BatchActionRequest {
    actions: DAWAction[];
}

export interface BatchActionResponse {
    success: boolean;
    results: ActionResult[];
    failed_count: number;
}

// ============================================================================
// AI PROVIDER (HTTP CLIENT ONLY - NO BUSINESS LOGIC)
// ============================================================================

export class AIProvider extends BaseAPIClient {
    // === CHAT ===
    async chat(request: ChatRequest): Promise<ChatResponse> {
        return this.post("/api/ai/chat", request);
    }

    // === STATE ===
    async getState(request: GetStateRequest = {}): Promise<GetStateResponse> {
        return this.post("/api/ai/state", request);
    }

    async getContext(): Promise<{ context: string }> {
        return this.get("/api/ai/context");
    }

    // === ACTIONS ===
    async executeAction(action: DAWAction): Promise<ActionResult> {
        return this.post("/api/ai/action", action);
    }

    async executeBatchActions(request: BatchActionRequest): Promise<BatchActionResponse> {
        return this.post("/api/ai/actions/batch", request);
    }
}

