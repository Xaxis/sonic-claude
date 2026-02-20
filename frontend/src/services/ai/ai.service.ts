/**
 * AI Service - API client for AI operations
 *
 * Handles all HTTP requests to the AI backend API.
 * Follows the same pattern as mixer.service.ts and sequencer.service.ts
 */

import { apiConfig } from "@/config/api.config";
import type {
    DAWStateSnapshot,
    ChatResponse,
    DAWAction,
    ActionResult,
} from "@/modules/ai/types";

const BASE_URL = apiConfig.getURL(apiConfig.endpoints.api.ai);

class AIService {
    // ========================================================================
    // STATE
    // ========================================================================

    async getState(previousHash?: string): Promise<{ full_state?: DAWStateSnapshot; diff?: any; is_diff: boolean }> {
        const response = await fetch(`${BASE_URL}/state`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                detail: {
                    include_clips: true,
                    include_notes: true,
                    include_audio_analysis: true,
                    include_musical_analysis: true,
                },
                previous_hash: previousHash || null,
            }),
        });
        if (!response.ok) {
            throw new Error(`Failed to get DAW state: ${response.statusText}`);
        }
        return response.json();
    }

    async getAIContext(): Promise<{ context: string }> {
        const response = await fetch(`${BASE_URL}/context`, {
            method: "GET",
        });
        if (!response.ok) {
            throw new Error(`Failed to get AI context: ${response.statusText}`);
        }
        return response.json();
    }

    // ========================================================================
    // ACTIONS
    // ========================================================================

    async executeAction(action: DAWAction): Promise<ActionResult> {
        const response = await fetch(`${BASE_URL}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action),
        });
        if (!response.ok) {
            throw new Error(`Failed to execute action: ${response.statusText}`);
        }
        return response.json();
    }

    async executeBatch(actions: DAWAction[], atomic: boolean = false): Promise<{ results: ActionResult[]; all_succeeded: boolean; failed_count: number }> {
        const response = await fetch(`${BASE_URL}/actions/batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ actions, atomic }),
        });
        if (!response.ok) {
            throw new Error(`Failed to execute batch actions: ${response.statusText}`);
        }
        return response.json();
    }

    // ========================================================================
    // CHAT
    // ========================================================================

    async sendMessage(message: string): Promise<ChatResponse> {
        const response = await fetch(`${BASE_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: response.statusText }));
            const errorMessage = errorData.detail || response.statusText;

            if (response.status === 503) {
                throw new Error(`AI service not available. Please restart the backend with AI_ENABLED=true in .env`);
            }

            throw new Error(`Failed to send chat message: ${errorMessage}`);
        }
        return response.json();
    }
}

// Export singleton instance
export const aiService = new AIService();

