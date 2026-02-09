/**
 * AI Agent Service
 * Handles unified AI agent API calls
 */

import { BaseAPIClient } from "./base";
import type { AIStatus } from "@/types";

export interface ChatRequest {
    message: string;
    spectral_data?: any;
}

export interface ChatResponse {
    response: string;
    reasoning: string;
    actions_taken?: string[];
}

export class AIService extends BaseAPIClient {
    /**
     * Get AI agent status
     */
    async getStatus(): Promise<AIStatus> {
        return this.get("/ai/status");
    }

    /**
     * Toggle AI agent on/off
     */
    async toggle(): Promise<{ enabled: boolean }> {
        return this.post("/ai/toggle");
    }

    /**
     * Send chat message to AI agent
     */
    async chat(request: ChatRequest): Promise<ChatResponse> {
        return this.post("/ai/chat", request);
    }
}

