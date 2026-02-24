import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import { PopoutWindow } from "@/components/layout";
import { WebSocketProvider } from "./providers/WebSocketProvider.tsx";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <TooltipProvider delayDuration={300}>
                <ToastProvider>
                    {/* WebSocket Provider - Wires WebSocket hooks to Zustand store */}
                    <WebSocketProvider />

                    {/* Routes - Layout state managed by layoutStore (Zustand) */}
                    <Routes>
                        <Route path="/" element={<App />} />
                        <Route path="/popout" element={<PopoutWindow />} />
                    </Routes>
                </ToastProvider>
            </TooltipProvider>
        </BrowserRouter>
    </StrictMode>
);
