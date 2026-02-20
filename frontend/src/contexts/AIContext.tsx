/**
 * AI Context
 * Global state management for AI module (chat history, analysis events, DAW state)
 */

import {
    createContext,
    useContext,
    useState,
    useCallback,
    ReactNode,
} from "react";
import type { ChatMessage, AnalysisEvent, DAWStateSnapshot } from "@/modules/ai/types";

interface AIEState {
    // Chat state
    chatHistory: ChatMessage[];
    
    // Analysis state
    analysisEvents: AnalysisEvent[];
    
    // DAW state
    dawState: DAWStateSnapshot | null;
    
    // AI context
    aiContext: string | null;
}

interface AIContextValue extends AIEState {
    // Chat actions
    addChatMessage: (message: ChatMessage) => void;
    clearChatHistory: () => void;
    
    // Analysis actions
    addAnalysisEvent: (event: AnalysisEvent) => void;
    clearAnalysisEvents: () => void;
    
    // DAW state actions
    setDawState: (state: DAWStateSnapshot | null) => void;
    
    // AI context actions
    setAIContext: (context: string | null) => void;
}

const AIContext = createContext<AIContextValue | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
    // Chat state
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    
    // Analysis state
    const [analysisEvents, setAnalysisEvents] = useState<AnalysisEvent[]>([]);
    
    // DAW state
    const [dawState, setDawState] = useState<DAWStateSnapshot | null>(null);
    
    // AI context
    const [aiContext, setAIContext] = useState<string | null>(null);
    
    // Chat actions
    const addChatMessage = useCallback((message: ChatMessage) => {
        setChatHistory(prev => [...prev, message]);
    }, []);
    
    const clearChatHistory = useCallback(() => {
        setChatHistory([]);
    }, []);
    
    // Analysis actions
    const addAnalysisEvent = useCallback((event: AnalysisEvent) => {
        setAnalysisEvents(prev => [...prev, event]);
    }, []);
    
    const clearAnalysisEvents = useCallback(() => {
        setAnalysisEvents([]);
    }, []);
    
    const value: AIContextValue = {
        // State
        chatHistory,
        analysisEvents,
        dawState,
        aiContext,
        
        // Actions
        addChatMessage,
        clearChatHistory,
        addAnalysisEvent,
        clearAnalysisEvents,
        setDawState,
        setAIContext,
    };
    
    return (
        <AIContext.Provider value={value}>
            {children}
        </AIContext.Provider>
    );
}

export function useAI() {
    const context = useContext(AIContext);
    if (context === undefined) {
        throw new Error("useAIEngine must be used within an AIEngineProvider");
    }
    return context;
}

