import { createContext, useContext, ReactNode } from "react";
import { useSyncedState } from "@/hooks/use-synced-state";
import type { AIStatus, ChatMessage, Sample, PadsState } from "@/types";

interface GlobalState {
    // AI Status
    aiStatus: AIStatus | null;
    setAIStatus: (status: AIStatus | null) => void;

    // Spectrum Data
    spectrum: number[];
    setSpectrum: (spectrum: number[]) => void;
    spectrumConnected: boolean;
    setSpectrumConnected: (connected: boolean) => void;

    // Chat Messages
    chatMessages: ChatMessage[];
    setChatMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;

    // Samples
    samples: Sample[];
    setSamples: (samples: Sample[] | ((prev: Sample[]) => Sample[])) => void;

    // Pads State
    padsState: PadsState | null;
    setPadsState: (state: PadsState | null | ((prev: PadsState | null) => PadsState | null)) => void;

    // Spectral Data Attachment
    spectralDataAttached: any | null;
    setSpectralDataAttached: (data: any | null) => void;

    // Recording State
    isRecording: boolean;
    setIsRecording: (recording: boolean) => void;
}

const GlobalStateContext = createContext<GlobalState | undefined>(undefined);

export function GlobalStateProvider({ children }: { children: ReactNode }) {
    // AI Status
    const [aiStatus, setAIStatus] = useSyncedState<AIStatus | null>("ai-status", null);

    // Spectrum Data
    const [spectrum, setSpectrum] = useSyncedState<number[]>("spectrum", []);
    const [spectrumConnected, setSpectrumConnected] = useSyncedState<boolean>(
        "spectrum-connected",
        false
    );

    // Chat Messages
    const [chatMessages, setChatMessages] = useSyncedState<ChatMessage[]>("chat-messages", []);

    // Samples
    const [samples, setSamples] = useSyncedState<Sample[]>("samples", []);

    // Pads State
    const [padsState, setPadsState] = useSyncedState<PadsState | null>("pads-state", null);

    // Spectral Data Attachment
    const [spectralDataAttached, setSpectralDataAttached] = useSyncedState<any | null>(
        "spectral-data-attached",
        null
    );

    // Recording State
    const [isRecording, setIsRecording] = useSyncedState<boolean>("is-recording", false);

    return (
        <GlobalStateContext.Provider
            value={{
                aiStatus,
                setAIStatus,
                spectrum,
                setSpectrum,
                spectrumConnected,
                setSpectrumConnected,
                chatMessages,
                setChatMessages,
                samples,
                setSamples,
                padsState,
                setPadsState,
                spectralDataAttached,
                setSpectralDataAttached,
                isRecording,
                setIsRecording,
            }}
        >
            {children}
        </GlobalStateContext.Provider>
    );
}

export function useGlobalState() {
    const context = useContext(GlobalStateContext);
    if (context === undefined) {
        throw new Error("useGlobalState must be used within a GlobalStateProvider");
    }
    return context;
}

