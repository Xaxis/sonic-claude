/**
 * Chat Store - Persistent storage for chat history
 * 
 * This ensures chat history persists when switching between main app tabs.
 */

import type { ChatMessage } from "../types";

class ChatStore {
    private chatHistory: ChatMessage[] = [];
    private listeners: Set<(history: ChatMessage[]) => void> = new Set();

    getChatHistory(): ChatMessage[] {
        return this.chatHistory;
    }

    addMessage(message: ChatMessage): void {
        this.chatHistory.push(message);
        this.notifyListeners();
    }

    clearHistory(): void {
        this.chatHistory = [];
        this.notifyListeners();
    }

    subscribe(listener: (history: ChatMessage[]) => void): () => void {
        this.listeners.add(listener);
        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener([...this.chatHistory]));
    }
}

// Singleton instance
export const chatStore = new ChatStore();

