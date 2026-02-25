/**
 * Assistant API Provider
 * Thin HTTP client mapping to /api/assistant/* routes
 *
 * Backend routes:
 * - POST   /api/assistant/chat                          (chat.py)
 * - POST   /api/assistant/state                         (state.py)
 * - GET    /api/assistant/context                       (state.py)
 * - POST   /api/assistant/action                        (actions.py)
 * - POST   /api/assistant/actions/batch                 (actions.py)
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

export interface ContextualChatRequest {
    message: string;
    entity_type: string;
    entity_id: string;
    composition_id: string;
    additional_context?: Record<string, any>;
}

export interface ContextualChatResponse {
    response: string;
    actions_executed?: any[];
    affected_entities?: Array<{ type: string; id: string }>;
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
// ASSISTANT PROVIDER (HTTP CLIENT ONLY - NO BUSINESS LOGIC)
// ============================================================================

export class AssistantProvider extends BaseAPIClient {
    // === CHAT ===
    async chat(request: ChatRequest): Promise<ChatResponse> {
        return this.post("/api/assistant/chat", request);
    }

    async contextualChat(request: ContextualChatRequest): Promise<ContextualChatResponse> {
        return this.post("/api/assistant/contextual-chat", request);
    }

    // === STATE ===
    async getState(request: GetStateRequest = {}): Promise<GetStateResponse> {
        return this.post("/api/assistant/state", request);
    }

    async getContext(): Promise<{ context: string }> {
        return this.get("/api/assistant/context");
    }

    // === ACTIONS ===
    async executeAction(action: DAWAction): Promise<ActionResult> {
        return this.post("/api/assistant/action", action);
    }

    async executeBatchActions(request: BatchActionRequest): Promise<BatchActionResponse> {
        return this.post("/api/assistant/actions/batch", request);
    }
}

