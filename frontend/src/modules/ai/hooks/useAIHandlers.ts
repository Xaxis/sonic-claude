/**
 * useAIHandlers Hook
 *
 * Centralizes all event handler logic for the AI module.
 * Separates business logic from UI rendering.
 *
 * Handler Categories:
 * - Chat: send message, receive response
 * - Autonomous: start/stop autonomous mode
 * - State: refresh DAW state snapshot
 */

import { useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useDAWStore } from "@/stores/dawStore";
import { useLayout } from "@/contexts/LayoutContext";
import type { ChatMessage, AnalysisEvent } from "../types";

interface UseAIHandlersProps {
    // State actions (from AIEngineContext)
    addChatMessage: (message: ChatMessage) => void;
    addAnalysisEvent: (event: AnalysisEvent) => void;
    setDawState: (state: any) => void;
    setAIContext: (context: string | null) => void;

    // UI state actions
    setIsSendingMessage: (sending: boolean) => void;
    setIsLoadingState: (loading: boolean) => void;

    // Audio Engine reload functions (to update UI after AI actions)
    activeSequenceId: string | null;
    loadSequencerTracks: (sequenceId?: string) => Promise<void>;
    loadSequences: () => Promise<void>;
    loadTracks: () => Promise<void>;  // Reload mixer tracks
    loadEffectDefs: () => Promise<void>;  // Reload effect definitions
}

export function useAIHandlers(props: UseAIHandlersProps) {
    const {
        addChatMessage,
        addAnalysisEvent,
        setDawState,
        setAIContext,
        setIsSendingMessage,
        setIsLoadingState,
        activeSequenceId,
        loadSequencerTracks,
        loadSequences,
        loadTracks,
        loadEffectDefs,
    } = props;

    // Activity tracking for animations from Zustand
    const startActivity = useDAWStore(state => state.startActivity);
    const completeActivity = useDAWStore(state => state.completeActivity);
    const { activeTab } = useLayout();

    // ========================================================================
    // CHAT HANDLERS
    // ========================================================================

    const handleSendMessage = useCallback(
        async (message: string) => {
            if (!message.trim()) return;

            try {
                setIsSendingMessage(true);

                // Add user message to chat history
                const userMessage: ChatMessage = {
                    role: "user",
                    content: message,
                    timestamp: new Date().toISOString(),
                };
                addChatMessage(userMessage);

                // Add analysis event for user message
                addAnalysisEvent({
                    id: `event-${Date.now()}-user`,
                    timestamp: new Date().toISOString(),
                    type: "user_message",
                    content: message,
                });

                // Send to backend
                console.log("Sending message to AI backend:", message);
                const response = await api.ai.chat({ message });
                console.log("Received response from AI backend:", response);

                // Add assistant response to chat history
                const assistantMessage: ChatMessage = {
                    role: "assistant",
                    content: response.response,
                    timestamp: new Date().toISOString(),
                    actions_executed: response.actions_executed,
                };
                addChatMessage(assistantMessage);

                // Add analysis events: musical context, LLM response, and actions

                // Add musical context analysis if available
                if (response.musical_context) {
                    // Update AI context for Analysis tab
                    setAIContext(response.musical_context);

                    // Also add to analysis events
                    addAnalysisEvent({
                        id: `event-${Date.now()}-context`,
                        timestamp: new Date().toISOString(),
                        type: "context",
                        content: response.musical_context,
                    });
                }

                // Add LLM response
                addAnalysisEvent({
                    id: `event-${Date.now()}-llm`,
                    timestamp: new Date().toISOString(),
                    type: "llm_response",
                    content: response.response,
                });

                // Add action results and trigger activity animations
                if (response.actions_executed) {
                    response.actions_executed.forEach((action, idx) => {
                        // Add to analysis events
                        addAnalysisEvent({
                            id: `event-${Date.now()}-action-${idx}`,
                            timestamp: new Date().toISOString(),
                            type: "action_result",
                            content: `${action.action}: ${action.message}`,
                            metadata: action,
                        });

                        // Start activity animation with staggered delay
                        setTimeout(() => {
                            const activityId = startActivity(action.action, action.message, {
                                targetId: action.data?.track_id || action.data?.clip_id || action.data?.effect_id,
                                targetType: action.action.includes("track") ? "track" :
                                           action.action.includes("clip") ? "clip" :
                                           action.action.includes("effect") ? "effect" :
                                           action.action.includes("tempo") ? "tempo" :
                                           action.action.includes("play") || action.action.includes("stop") ? "playback" :
                                           undefined,
                                tabId: activeTab,
                                metadata: action.data,
                            });

                            // Auto-complete activity after animation duration
                            setTimeout(() => {
                                completeActivity(activityId, action.success);
                            }, 1500); // Match animation duration
                        }, idx * 100); // Stagger animations by 100ms
                    });
                }

                // Reload ALL UI components to show changes made by AI
                if (response.actions_executed && response.actions_executed.length > 0) {
                    console.log("🔄 AI executed actions - reloading ALL UI components...");

                    // Reload sequencer (THIS LOADS CLIPS!)
                    // Sequences contain clips, so this is critical for showing clip modifications
                    await loadSequences();

                    // Reload tracks (in case tracks were created/modified)
                    if (activeSequenceId) {
                        await loadSequencerTracks(activeSequenceId);
                    }

                    // Reload mixer (to show new tracks and volume/pan changes)
                    await loadTracks();

                    // Reload effects (to show new effects added to tracks)
                    await loadEffectDefs();

                    console.log("✅ UI reload complete");
                }

                toast.success("AI responded");
            } catch (error: any) {
                console.error("Failed to send message:", error);

                // Add error message to chat
                const errorMessage: ChatMessage = {
                    role: "assistant",
                    content: `Error: ${error.message || "Failed to communicate with AI service. Please check that the backend is running and the Claude API key is configured."}`,
                    timestamp: new Date().toISOString(),
                };
                addChatMessage(errorMessage);

                toast.error(`AI Error: ${error.message || "Failed to send message"}`);
            } finally {
                setIsSendingMessage(false);
            }
        },
        [addChatMessage, addAnalysisEvent, setIsSendingMessage, loadSequences, loadSequencerTracks, loadTracks, loadEffectDefs, activeSequenceId]
    );

    // ========================================================================
    // STATE REFRESH HANDLER
    // ========================================================================

    const handleRefreshState = useCallback(async () => {
        try {
            setIsLoadingState(true);

            // Fetch DAW state
            const response = await api.ai.getState();
            setDawState(response.full_state);

            // Fetch AI context (what the LLM sees)
            try {
                const contextResponse = await api.ai.getContext();
                setAIContext(contextResponse.context);
            } catch (error) {
                console.error("Failed to fetch AI context:", error);
                setAIContext("Error loading AI context: " + (error as Error).message);
            }
        } catch (error) {
            console.error("Failed to refresh state:", error);
        } finally {
            setIsLoadingState(false);
        }
    }, [setDawState, setAIContext, setIsLoadingState]);

    return {
        handleSendMessage,
        handleRefreshState,
    };
}

