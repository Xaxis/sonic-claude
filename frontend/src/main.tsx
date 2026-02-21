import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import { PopoutWindow } from "@/components/layout";
import { LayoutProvider } from "./contexts/LayoutContext";
import { WebSocketSync } from "./stores/WebSocketSync";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <TooltipProvider delayDuration={300}>
                <ToastProvider>
                    {/* WebSocket Sync - Wires WebSocket hooks to Zustand store */}
                    <WebSocketSync />

                    {/* Layout & UI State */}
                    <LayoutProvider>
                        <Routes>
                            <Route path="/" element={<App />} />
                            <Route path="/popout" element={<PopoutWindow />} />
                        </Routes>
                    </LayoutProvider>
                </ToastProvider>
            </TooltipProvider>
        </BrowserRouter>
    </StrictMode>
);
