import { useAIStatus } from "@/hooks/use-ai-status";
import { useSpectrumWebSocket } from "@/hooks/use-spectrum-websocket";
import { Header } from "@/components/features/header";
import { Controls } from "@/components/features/controls";
import { AIChat } from "@/components/features/ai-chat";
import { SpectrumAnalyzer } from "@/components/features/spectrum";
import { Analytics } from "@/components/features/analytics";
import { AIActivity } from "@/components/features/ai-activity";
import { SampleStudio } from "@/components/features/sample-studio/SampleStudio";
import { TabbedLayout } from "@/components/layout";
import type { PanelConfig, TabConfig } from "@/components/layout";
import { SpectralDataProvider } from "@/contexts/SpectralDataContext";

export default function App() {
    const { status, error, isLoading } = useAIStatus();
    const { spectrum, isConnected: spectrumConnected } = useSpectrumWebSocket();

    // Define all panels
    const panels: PanelConfig[] = [
        {
            id: "controls",
            title: "PERFORMANCE CONTROLS",
            component: <Controls />,
            defaultLayout: { i: "controls", x: 0, y: 0, w: 4, h: 20, minW: 3, minH: 8 },
            closeable: false,
        },
        {
            id: "spectrum",
            title: "LIVE SPECTRUM",
            component: <SpectrumAnalyzer spectrum={spectrum} isConnected={spectrumConnected} />,
            defaultLayout: { i: "spectrum", x: 4, y: 0, w: 8, h: 10, minW: 6, minH: 4 },
            closeable: true,
        },
        {
            id: "analytics",
            title: "AUDIO METRICS",
            component: (
                <Analytics
                    audioAnalysis={
                        status?.audio_analysis ?? {
                            energy: 0,
                            brightness: 0,
                            rhythm: 0,
                            dominant_frequency: 0,
                        }
                    }
                    musicalState={
                        status?.current_state ?? {
                            bpm: 120,
                            intensity: 5,
                            complexity: 5,
                            key: "C",
                            scale: "minor",
                        }
                    }
                />
            ),
            defaultLayout: { i: "analytics", x: 4, y: 10, w: 8, h: 10, minW: 6, minH: 4 },
            closeable: true,
        },
        {
            id: "sample-studio",
            title: "SAMPLE STUDIO",
            component: <SampleStudio />,
            defaultLayout: { i: "sample-studio", x: 0, y: 0, w: 12, h: 20, minW: 8, minH: 8 },
            closeable: true,
        },
        {
            id: "chat",
            title: "AI CONVERSATION",
            component: <AIChat />,
            defaultLayout: { i: "chat", x: 0, y: 0, w: 6, h: 20, minW: 4, minH: 8 },
            closeable: true,
        },
        {
            id: "ai-activity",
            title: "AI REASONING",
            component: (
                <AIActivity
                    reasoning={status?.llm_reasoning ?? ""}
                    decisions={status?.recent_decisions ?? []}
                />
            ),
            defaultLayout: { i: "ai-activity", x: 6, y: 0, w: 6, h: 20, minW: 4, minH: 8 },
            closeable: true,
        },
    ];

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
            panelIds: ["sample-studio"],
        },
        {
            id: "ai",
            name: "AI Assistant",
            panelIds: ["chat", "ai-activity"],
        },
    ];

    return (
        <SpectralDataProvider>
            <div className="from-background via-background to-background/95 flex h-screen flex-col overflow-hidden bg-gradient-to-br">
                {/* Header */}
                <Header
                    isAIOnline={status?.is_running ?? false}
                    sonicPiStatus="READY"
                    audioEngineStatus="MONITORING"
                />

                {/* Main Content - Tabbed Layout */}
                <div className="min-h-0 flex-1 overflow-hidden p-2">
                    <TabbedLayout panels={panels} defaultTabs={defaultTabs} />
                </div>
            </div>
        </SpectralDataProvider>
    );
}
