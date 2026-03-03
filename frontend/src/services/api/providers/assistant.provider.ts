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
import type { SSEEvent } from "@/modules/assistant/types";

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface ChatRequest {
    message: string;
    stream?: boolean;
    // Per-request AI preferences (all optional; backend uses defaults when absent)
    execution_model?: "haiku" | "sonnet" | "opus";
    temperature?: number;
    response_style?: "concise" | "balanced" | "detailed";
    history_length?: number;
    use_intent_routing?: boolean;
    include_harmonic_context?: boolean;
    include_rhythmic_context?: boolean;
    include_timbre_context?: boolean;
}

export interface ChatResponse {
    response: string;
    actions_executed?: any[];
    musical_context?: string | null;
    routing_intent?: string | null;
}

export interface ContextualChatRequest {
    message: string;
    entity_type: string;
    entity_id: string;
    composition_id: string;
    additional_context?: Record<string, any>;
    // Per-request AI preferences (all optional; backend uses defaults when absent)
    execution_model?: "haiku" | "sonnet" | "opus";
    temperature?: number;
    response_style?: "concise" | "balanced" | "detailed";
}

export interface ContextualChatResponse {
    response: string;
    actions_executed?: any[];
    affected_entities?: Array<{ type: string; id: string }>;
    musical_context?: string | null;
    routing_intent?: string | null;
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

    /**
     * Stream a chat request via SSE (Server-Sent Events).
     *
     * Uses fetch + ReadableStream — NOT EventSource — because SSE requires a POST body.
     * Yields parsed SSEEvent objects as they arrive.
     *
     * @param signal - Optional AbortSignal for cancellation (e.g. on component unmount).
     *                 The stream also has a built-in 5-minute hard timeout.
     */
    async *chatStream(request: ChatRequest, signal?: AbortSignal): AsyncGenerator<SSEEvent> {
        const url = `${this.baseURL}/api/assistant/chat`;

        // Internal controller — owns the actual fetch abort.
        // We combine the caller's signal + our own timeout into it.
        const internalCtrl = new AbortController();
        const timeoutId = setTimeout(
            () => internalCtrl.abort(new DOMException("Stream timeout (5 min)", "TimeoutError")),
            5 * 60 * 1000,
        );

        // Forward caller cancellation into our internal controller
        if (signal) {
            if (signal.aborted) {
                clearTimeout(timeoutId);
                return;
            }
            signal.addEventListener("abort", () => internalCtrl.abort(signal.reason), { once: true });
        }

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...request, stream: true }),
                signal: internalCtrl.signal,
            });

            if (!response.ok || !response.body) {
                throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    // Keep the last (possibly incomplete) chunk in the buffer
                    buffer = lines.pop() ?? "";

                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const data = line.slice(6).trim();
                            if (data) {
                                try {
                                    yield JSON.parse(data) as SSEEvent;
                                } catch (e) {
                                    console.warn(`Malformed SSE event ignored: "${data}"`, e);
                                }
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
        } finally {
            clearTimeout(timeoutId);
        }
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

