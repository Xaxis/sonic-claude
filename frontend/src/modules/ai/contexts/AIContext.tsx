/**
 * AIContext - React Context for AI module state
 *
 * Provides ALL AI state to child components without prop-drilling:
 * - UI state (active tab, chat history, analysis events)
 * - Backend data (DAW state snapshot, autonomous status)
 * - Handlers (send message, execute action, start/stop autonomous)
 *
 * This eliminates prop-drilling and creates a cohesive state machine.
 */

import { createContext, useContext, ReactNode } from "react";
import type { AIState, AIActions } from "../hooks/useAIState";
import type { DAWStateSnapshot, ChatMessage, AnalysisEvent } from "../types";

interface AIContextValue {
    // UI State (from useAIState)
    state: AIState;
    actions: AIActions;

    // Backend Data
    dawState: DAWStateSnapshot | null;
    aiContext: string | null;  // EXACT context sent to LLM
    chatHistory: ChatMessage[];
    analysisEvents: AnalysisEvent[];

    // Handlers (from useAIHandlers)
    handlers: {
        handleSendMessage: (message: string) => Promise<void>;
        handleRefreshState: () => Promise<void>;
    };
}

const AIContext = createContext<AIContextValue | null>(null);

interface AIProviderProps {
    children: ReactNode;

    // UI State
    state: AIState;
    actions: AIActions;

    // Backend Data
    dawState: DAWStateSnapshot | null;
    aiContext: string | null;
    chatHistory: ChatMessage[];
    analysisEvents: AnalysisEvent[];

    // Handlers
    handlers: AIContextValue["handlers"];
}

export function AIProvider({
    children,
    state,
    actions,
    dawState,
    aiContext,
    chatHistory,
    analysisEvents,
    handlers,
}: AIProviderProps) {
    return (
        <AIContext.Provider
            value={{
                state,
                actions,
                dawState,
                aiContext,
                chatHistory,
                analysisEvents,
                handlers,
            }}
        >
            {children}
        </AIContext.Provider>
    );
}

export function useAIContext() {
    const context = useContext(AIContext);
    if (!context) {
        throw new Error("useAIContext must be used within an AIProvider");
    }
    return context;
}

/**
 * Convenience hooks for accessing specific parts of the context
 */

// Get UI state and actions
export function useAI() {
    const { state, actions } = useAIContext();
    return { state, actions };
}

// Get backend data
export function useAIData() {
    const { dawState, chatHistory, analysisEvents } = useAIContext();
    return { dawState, chatHistory, analysisEvents };
}

// Get handlers
export function useAIHandlers() {
    const { handlers } = useAIContext();
    return handlers;
}

