/**
 * AI Service - API client for AI operations
 *
 * Handles all HTTP requests to the AI backend API.
 * Extends BaseAPIClient for consistent error handling and request management.
 */

import { BaseAPIClient, APIError } from "../api/base";
import type {
    DAWStateSnapshot,
    ChatResponse,
    DAWAction,
    ActionResult,
} from "@/modules/ai/types";

export class AIService extends BaseAPIClient {
    // ========================================================================
    // STATE
    // ========================================================================

    async getState(previousHash?: string): Promise<{ full_state?: DAWStateSnapshot; diff?: any; is_diff: boolean }> {
        return this.post("/api/ai/state", {
            detail: {
                include_clips: true,
                include_notes: true,
                include_audio_analysis: true,
                include_musical_analysis: true,
            },
            previous_hash: previousHash || null,
        });
    }

    async getAIContext(): Promise<{ context: string }> {
        return this.get("/api/ai/context");
    }

    // ========================================================================
    // ACTIONS
    // ========================================================================

    async executeAction(action: DAWAction): Promise<ActionResult> {
        return this.post("/api/ai/action", action);
    }

    async executeBatch(actions: DAWAction[], atomic: boolean = false): Promise<{ results: ActionResult[]; all_succeeded: boolean; failed_count: number }> {
        return this.post("/api/ai/actions/batch", { actions, atomic });
    }

    // ========================================================================
    // CHAT
    // ========================================================================

    async sendMessage(message: string): Promise<ChatResponse> {
        try {
            return await this.post("/api/ai/chat", { message });
        } catch (error) {
            if (error instanceof APIError && error.status === 503) {
                throw new Error("AI service not available. Please restart the backend with AI_ENABLED=true in .env");
            }
            throw error;
        }
    }
}

// Export singleton instance
export const aiService = new AIService();

