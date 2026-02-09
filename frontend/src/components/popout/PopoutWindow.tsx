import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Controls } from "@/components/features/controls";
import { AIChat } from "@/components/features/ai-chat";
import { SpectrumAnalyzer } from "@/components/features/spectrum-analyzer";
import { Analytics } from "@/components/features/analytics";
import { AIActivity } from "@/components/features/ai-activity";
import { SampleStudio } from "@/components/features/sample-studio/SampleStudio";
import { Pads } from "@/components/features/pads/Pads";
import { DraggableLayout } from "@/components/layout/DraggableLayout";
import { useGlobalState } from "@/contexts/GlobalStateContext";
import { windowManager } from "@/services/WindowManager";
import type { PanelConfig } from "@/components/layout";

export function PopoutWindow() {
    const [searchParams] = useSearchParams();
    const tabId = searchParams.get("tab");
    const panelIdsParam = searchParams.get("panels");
    const panelIds = panelIdsParam ? panelIdsParam.split(",") : [];

    const {
        aiStatus,
        spectrum,
        spectrumConnected,
    } = useGlobalState();

    // Define all panels (same as App.tsx)
    const allPanels: PanelConfig[] = [
        {
            id: "controls",
            title: "PERFORMANCE CONTROLS",
            component: <Controls />,
            defaultLayout: { i: "controls", x: 0, y: 0, w: 4, h: 12, minW: 3, minH: 8 },
            closeable: false,
        },
        {
            id: "spectrum",
            title: "LIVE SPECTRUM",
            component: <SpectrumAnalyzer spectrum={spectrum} isConnected={spectrumConnected} />,
            defaultLayout: { i: "spectrum", x: 4, y: 0, w: 4, h: 12, minW: 3, minH: 6 },
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
            defaultLayout: { i: "analytics", x: 8, y: 0, w: 4, h: 12, minW: 3, minH: 6 },
            closeable: true,
        },
        {
            id: "sample-studio",
            title: "SAMPLE STUDIO",
            component: <SampleStudio />,
            defaultLayout: { i: "sample-studio", x: 0, y: 0, w: 12, h: 12, minW: 8, minH: 8 },
            closeable: true,
        },
        {
            id: "pads",
            title: "PROGRAMMABLE PADS",
            component: <Pads />,
            defaultLayout: { i: "pads", x: 0, y: 0, w: 12, h: 12, minW: 8, minH: 8 },
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
                    reasoning={aiStatus?.llm_reasoning ?? ""}
                    decisions={aiStatus?.recent_decisions ?? []}
                />
            ),
            defaultLayout: { i: "ai-activity", x: 6, y: 0, w: 6, h: 20, minW: 4, minH: 8 },
            closeable: true,
        },
    ];

    // Filter panels for this popout
    const panels = allPanels.filter((p) => panelIds.includes(p.id));

    // Set window title and register with window manager
    useEffect(() => {
        const tabName = tabId || "Popout";
        document.title = `Sonic Claude - ${tabName}`;

        // Notify window manager about this popout
        windowManager.broadcastState("popout-opened", { tabId, panelIds, timestamp: Date.now() });

        return () => {
            // Notify when popout closes
            windowManager.broadcastState("popout-closed", { tabId, timestamp: Date.now() });
        };
    }, [tabId, panelIds]);

    return (
        <div className="from-background via-background to-background/95 flex h-screen w-screen overflow-hidden bg-gradient-to-br p-2">
            <div className="flex h-full w-full flex-col">
                <DraggableLayout
                    panels={panels}
                    onLayoutChange={() => {}}
                    onResetLayout={() => {}}
                />
            </div>
        </div>
    );
}

