import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import { PopoutWindow } from "@/components/layout";
import { LayoutProvider } from "./contexts/LayoutContext";
import { TelemetryProvider } from "./contexts/TelemetryContext";
import { SequencerProvider } from "./contexts/SequencerContext";
import { MixerProvider } from "./contexts/MixerContext";
import { EffectsProvider } from "./contexts/EffectsContext";
import { SynthesisProvider } from "./contexts/SynthesisContext";
import { DAWStateProvider } from "./contexts/DAWStateContext";
import { CompositionProvider } from "./contexts/CompositionContext";
import { AIProvider } from "./contexts/AIContext";
import { ActivityProvider } from "./contexts/ActivityContext";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <TooltipProvider delayDuration={300}>
                <ToastProvider>
                    <LayoutProvider>
                        {/* Real-time telemetry data (WebSocket connections) */}
                        <TelemetryProvider>
                            {/* Domain contexts (global state) */}
                            <SequencerProvider>
                                <MixerProvider>
                                    <EffectsProvider>
                                        <SynthesisProvider>
                                            {/* DAW coordination layer */}
                                            <DAWStateProvider>
                                                {/* Composition persistence (reads activeSequenceId from SequencerContext) */}
                                                <CompositionProvider>
                                                    {/* AI & Activity */}
                                                    <AIProvider>
                                                        <ActivityProvider>
                                                            <Routes>
                                                                <Route path="/" element={<App />} />
                                                                <Route path="/popout" element={<PopoutWindow />} />
                                                            </Routes>
                                                        </ActivityProvider>
                                                    </AIProvider>
                                                </CompositionProvider>
                                            </DAWStateProvider>
                                        </SynthesisProvider>
                                    </EffectsProvider>
                                </MixerProvider>
                            </SequencerProvider>
                        </TelemetryProvider>
                    </LayoutProvider>
                </ToastProvider>
            </TooltipProvider>
        </BrowserRouter>
    </StrictMode>
);
