import { useEffect, useState, useCallback, useMemo } from "react";
import { useAIStatus } from "@/hooks/use-ai-status";
import { useSpectrumWebSocket } from "@/hooks/use-spectrum-websocket";
import { Header } from "@/components/layout/header";
import { Controls } from "@/components/features/controls";
import { AIChat } from "@/components/features/ai-chat";
import { SpectrumAnalyzer } from "@/components/features/spectrum-analyzer";
import { Analytics } from "@/components/features/analytics";
import { AIActivity } from "@/components/features/ai-activity";
import { SampleStudio } from "@/components/features/sample-studio/SampleStudio";
import { Pads } from "@/components/features/pads/Pads";
import { Timeline } from "@/components/features/timeline/Timeline";
import { LiveTranscription } from "@/components/features/transcription/LiveTranscription";
import { TabbedLayout } from "@/components/layout";
import type { PanelConfig, TabConfig } from "@/components/layout";
import { useGlobalState } from "@/contexts/GlobalStateContext";
import type { LiveTranscriptionResult } from "@/types";
import { api } from "@/lib/api";

export default function App() {
    const { status, error, isLoading } = useAIStatus();
    const { spectrum, isConnected: spectrumConnected } = useSpectrumWebSocket();
    const [activeTab, setActiveTab] = useState<string>("performance");
    const [currentSequenceId, setCurrentSequenceId] = useState<string | null>(null);

    // Get global state
    const {
        aiStatus,
        setAIStatus,
        setSpectrum,
        setSpectrumConnected,
    } = useGlobalState();

    // Sync global status
    useEffect(() => {
        if (status) {
            setAIStatus(status);
        }
    }, [status, setAIStatus]);

    // Sync spectrum data
    useEffect(() => {
        setSpectrum(spectrum);
    }, [spectrum, setSpectrum]);

    // Sync spectrum connection status
    useEffect(() => {
        setSpectrumConnected(spectrumConnected);
    }, [spectrumConnected, setSpectrumConnected]);

    // Handle sending transcription to timeline
    // @TODO - This should be refactored to use the same API as the "Add to Sequencer" button in the transcription panel??
    // @TODO - Move this out of main App.tsx
    const handleSendToTimeline = useCallback(async (result: LiveTranscriptionResult) => {
        try {
            // Create or get current sequence
            let sequenceId = currentSequenceId;
            if (!sequenceId) {
                const newSequence = await api.createSequence("Transcribed Sequence", result.stems[0]?.tempo || 120);
                sequenceId = newSequence.id;
                setCurrentSequenceId(sequenceId);
            }

            // Send transcription to timeline
            await api.request(`/timeline/sequences/${sequenceId}/from-transcription`, {
                method: "POST",
                body: JSON.stringify(result),
            });

            // Switch to sequencer tab
            setActiveTab("sequencer");

            alert("Transcription sent to timeline! Check the Sequencer tab.");
        } catch (error) {
            console.error("Failed to send to timeline:", error);
            alert("Failed to send transcription to timeline");
        }
    }, [currentSequenceId]);

    // Define all panels (memoized to update when dependencies change)
    const panels: PanelConfig[] = useMemo(() => [
        {
            id: "controls",
            title: "PERFORMANCE CONTROLS",
            component: <Controls />,
            defaultLayout: { i: "controls", x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 2 },
            closeable: false,
        },
        {
            id: "spectrum",
            title: "LIVE SPECTRUM",
            component: <SpectrumAnalyzer spectrum={spectrum} isConnected={spectrumConnected} />,
            defaultLayout: { i: "spectrum", x: 4, y: 0, w: 4, h: 4, minW: 3, minH: 2 },
            closeable: true,
        },
        {
            id: "analytics",
            title: "AUDIO METRICS",
            component: (
                <Analytics
                    audioAnalysis={
                        aiStatus?.audio_analysis ?? {
                            energy: 0,
                            brightness: 0,
                            rhythm: 0,
                            dominant_frequency: 0,
                        }
                    }
                    musicalState={
                        aiStatus?.current_state ?? {
                            bpm: 120,
                            intensity: 5,
                            complexity: 5,
                            key: "C",
                            scale: "minor",
                        }
                    }
                />
            ),
            defaultLayout: { i: "analytics", x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 4 },
            closeable: true,
        },
        {
            id: "sample-studio",
            title: "SAMPLE STUDIO",
            component: <SampleStudio />,
            defaultLayout: { i: "sample-studio", x: 0, y: 0, w: 6, h: 4, minW: 6, minH: 4 },
            closeable: true,
        },
        {
            id: "pads",
            title: "PROGRAMMABLE PADS",
            component: <Pads />,
            defaultLayout: { i: "pads", x: 6, y: 0, w: 6, h: 4, minW: 6, minH: 4 },
            closeable: true,
        },
        {
            id: "chat",
            title: "AI CONVERSATION",
            component: <AIChat />,
            defaultLayout: { i: "chat", x: 0, y: 0, w: 6, h: 20, minW: 4, minH: 4 },
            closeable: true,
        },
        {
            id: "ai-activity",
            title: "AI REASONING",
            component: (
                <AIActivity
                    reasoning={aiStatus?.llm_reasoning ?? ""}
                    decisions={aiStatus?.recent_decisions ?? []}
                />
            ),
            defaultLayout: { i: "ai-activity", x: 6, y: 0, w: 6, h: 20, minW: 4, minH: 4 },
            closeable: true,
        },
        {
            id: "timeline",
            title: "TIMELINE SEQUENCER",
            component: <Timeline sequenceId={currentSequenceId} />,
            defaultLayout: { i: "timeline", x: 0, y: 0, w: 12, h: 4, minW: 10, minH: 4 },
            closeable: true,
        },
        {
            id: "transcription",
            title: "LIVE TRANSCRIPTION",
            component: <LiveTranscription onSendToTimeline={handleSendToTimeline} />,
            defaultLayout: { i: "transcription", x: 0, y: 0, w: 12, h: 4, minW: 8, minH: 4 },
            closeable: true,
        },
    ], [spectrum, spectrumConnected, aiStatus, currentSequenceId, handleSendToTimeline]);

    // Define default tabs
    const defaultTabs: TabConfig[] = [
        {
            id: "performance",
            name: "Performance",
            panelIds: ["controls", "spectrum", "analytics"],
        },
        {
            id: "studio",
            name: "Studio",
            panelIds: ["sample-studio", "pads"],
        },
        {
            id: "ai",
            name: "Agent",
            panelIds: ["chat", "ai-activity"],
        },
        {
            id: "sequencer",
            name: "Sequencer",
            panelIds: ["timeline"],
        },
        {
            id: "transcription",
            name: "Transcription",
            panelIds: ["transcription"],
        },
    ];

    return (
        <div className="from-background via-background to-background/95 flex min-h-screen flex-col overflow-auto bg-gradient-to-br">
            {/* Header */}
            <Header
                isAIOnline={aiStatus?.is_running ?? false}
                sonicPiStatus="READY"
                audioEngineStatus="MONITORING"
            />

            {/* Main Content - Tabbed Layout */}
            <div className="min-h-0 flex-1 overflow-auto p-2">
                <TabbedLayout
                    panels={panels}
                    defaultTabs={defaultTabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            </div>
        </div>
    );
}
